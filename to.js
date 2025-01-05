

const toElements = {
    partySelect: document.getElementById('toPartySelect'),
    newPartyInput: document.getElementById('toNewPartyInput'),
    startScanBtn: document.getElementById('toStartScanBtn'),
    manualEntryBtn: document.getElementById('toManualEntryBtn'),
    scannerContainer: document.getElementById('toScannerContainer'),
    manualBarcodeInput: document.getElementById('toManualBarcodeInput'),
    cartItems: document.getElementById('toCartItems'),
    totalQty: document.getElementById('toTotalQty'),
    saveBtn: document.getElementById('toSaveBtn'),
    productModal: document.getElementById('toProductModal'),
    tempList: document.getElementById('toTempList'),
    detailsModal: document.getElementById('toDetailsModal')
};

// Cart State
let toCartItems = [];

// Initialize Application
function toInitializeApp() {
    toPopulatePartySelect();
    toInitializeEventListeners();
    toLoadExistingTemp();
}

// Party Selection Setup
function toPopulatePartySelect() {
    parties.forEach(party => {
        const option = document.createElement('option');
        option.value = party;
        option.textContent = party;
        toElements.partySelect.appendChild(option);
    });
}

// Event Listeners
function toInitializeEventListeners() {
    toElements.startScanBtn.addEventListener('click', toInitializeScanner);
    toElements.manualEntryBtn.addEventListener('click', toShowManualInput);
    toElements.manualBarcodeInput.addEventListener('keypress', toHandleManualBarcode);
    toElements.saveBtn.addEventListener('click', toSaveTemp);
    
    // Modal close buttons
    document.querySelectorAll('.to-modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            toElements.productModal.style.display = 'none';
            toElements.detailsModal.style.display = 'none';
        });
    });
}

// Barcode Scanner
function toInitializeScanner() {
    toElements.scannerContainer.style.display = 'block';
    
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector("#toScanner"),
            constraints: {
                facingMode: "environment"
            },
        },
        decoder: {
            readers: ["ean_reader", "ean_8_reader"]
        }
    }, function(err) {
        if (err) {
            console.error(err);
            alert("Error initializing scanner. Please try manual entry.");
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected(toHandleBarcodeDetection);
}

function toHandleBarcodeDetection(result) {
    const barcode = result.codeResult.code;
    toProcessBarcode(barcode);
}

// Barcode Processing
function toProcessBarcode(barcode) {
    if (toBarcodeDb[barcode]) {
        const product = toBarcodeDb[barcode];
        const mrp = prompt(`Product found: ${product.itemName}\nMRP: ${product.mrp}\nEnter new MRP or press OK to confirm:`, product.mrp);
        
        if (mrp !== null) {
            toAddToCart({
                barcode,
                ...product,
                mrp: parseFloat(mrp) || product.mrp
            });
        }
    } else {
        toShowProductModal();
    }
}

// Cart Management
function toAddToCart(product) {
    const existingItem = toCartItems.find(item => 
        item.barcode === product.barcode && 
        item.mrp === product.mrp
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        toCartItems.push({
            ...product,
            quantity: 1
        });
    }

    toUpdateCartDisplay();
}

function toUpdateCartDisplay() {
    toElements.cartItems.innerHTML = '';
    let totalQty = 0;

    toCartItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'to-cart-item';
        itemElement.innerHTML = `
            <span>${item.itemName} - ${item.color} - ${item.size}</span>
            <span>Qty: ${item.quantity} | MRP: ₹${item.mrp}</span>
        `;
        toElements.cartItems.appendChild(itemElement);
        totalQty += item.quantity;
    });

    toElements.totalQty.textContent = totalQty;
}

// Manual Entry
function toShowManualInput() {
    toElements.scannerContainer.style.display = 'block';
    toElements.manualBarcodeInput.style.display = 'block';
    if (Quagga.isInitialized()) {
        Quagga.stop();
    }
}

function toHandleManualBarcode(event) {
    if (event.key === 'Enter') {
        toProcessBarcode(event.target.value);
        event.target.value = '';
    }
}

// Product Modal
function toShowProductModal() {
    toElements.productModal.style.display = 'block';
    toPopulateProductModal();
}

function toPopulateProductModal() {
    const itemSelect = document.getElementById('toItemSelect');
    const colorSelect = document.getElementById('toColorSelect');
    const sizeSelect = document.getElementById('toSizeSelect');

    // Clear existing options
    itemSelect.innerHTML = '<option value="">Select Item</option>';
    colorSelect.innerHTML = '<option value="">Select Color</option>';
    sizeSelect.innerHTML = '<option value="">Select Size</option>';

    // Populate items
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.name;
        itemSelect.appendChild(option);
    });

    // Event listeners for dependent dropdowns
    itemSelect.addEventListener('change', () => {
        const selectedItem = items.find(item => item.name === itemSelect.value);
        if (selectedItem) {
            toPopulateColors(selectedItem.colors);
            toPopulateSizes(selectedItem.sizes);
        }
    });
}

function toPopulateColors(colors) {
    const colorSelect = document.getElementById('toColorSelect');
    colorSelect.innerHTML = '<option value="">Select Color</option>';
    colors.forEach(color => {
        const option = document.createElement('option');
        option.value = color;
        option.textContent = color;
        colorSelect.appendChild(option);
    });
}

function toPopulateSizes(sizes) {
    const sizeSelect = document.getElementById('toSizeSelect');
    sizeSelect.innerHTML = '<option value="">Select Size</option>';
    sizes.forEach(size => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        sizeSelect.appendChild(option);
    });
}

// Firebase Integration
async function toSaveTemp() {
    if (!toElements.partySelect.value && !toElements.newPartyInput.value) {
        alert('Please select or enter a party name');
        return;
    }

    if (toCartItems.length === 0) {
        alert('Cart is empty');
        return;
    }

    const toTempData = {
        partyName: toElements.partySelect.value || toElements.newPartyInput.value,
        datetime: new Date().toISOString(),
        items: toCartItems,
        totalQuantity: toCartItems.reduce((sum, item) => sum + item.quantity, 0)
    };

    try {
        const docRef = await firebase.firestore().collection('tempOrders').add(toTempData);
        alert('Temp order saved successfully!');
        toClearCart();
        toLoadExistingTemp();
    } catch (error) {
        console.error("Error saving temp order: ", error);
        alert('Error saving temp order. Please try again.');
    }
}

function toClearCart() {
    toCartItems = [];
    toUpdateCartDisplay();
}

// Load and Display Temp Orders
async function toLoadExistingTemp() {
    try {
        const snapshot = await firebase.firestore()
            .collection('tempOrders')
            .orderBy('datetime', 'desc')
            .limit(10)
            .get();

        toElements.tempList.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const tempElement = document.createElement('div');
            tempElement.className = 'to-temp-row';
            tempElement.innerHTML = `
                <span>${data.partyName}</span>
                <span>${new Date(data.datetime).toLocaleString()}</span>
                <span>Total Qty: ${data.totalQuantity}</span>
            `;
            tempElement.addEventListener('click', () => toShowTempDetails(data));
            toElements.tempList.appendChild(tempElement);
        });
    } catch (error) {
        console.error("Error loading temp orders: ", error);
    }
}

function toShowTempDetails(tempData) {
    toElements.detailsModal.style.display = 'block';
    const content = document.getElementById('toDetailsContent');
    content.innerHTML = `
        <h6>Party: ${tempData.partyName}</h6>
        <p>Date: ${new Date(tempData.datetime).toLocaleString()}</p>
        <div class="to-temp-items">
            ${tempData.items.map(item => `
                <div class="to-temp-item">
                    <p>${item.itemName} - ${item.color} - ${item.size}</p>
                    <p>Quantity: ${item.quantity} | MRP: ₹${item.mrp}</p>
                </div>
            `).join('')}
        </div>
        <p>Total Quantity: ${tempData.totalQuantity}</p>
    `;
}

// Handle Product Form Submission
document.getElementById('toAddItemBtn').addEventListener('click', () => {
    const itemName = document.getElementById('toItemSelect').value;
    const color = document.getElementById('toColorSelect').value;
    const size = document.getElementById('toSizeSelect').value;
    const mrp = parseFloat(document.getElementById('toMrpInput').value);

    if (!itemName || !color || !size || !mrp) {
        alert('Please fill all product details');
        return;
    }

    toAddToCart({
        itemName: `${itemName}-ATHL-T-SPTBRA-P1`,
        color,
        size,
        mrp,
        barcode: 'MANUAL-' + Date.now()
    });

    toElements.productModal.style.display = 'none';
    document.getElementById('toMrpInput').value = '';
});

// Handle Manual Barcode Entry
document.getElementById('toManualBarcodeInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const barcode = e.target.value.trim();
        if (barcode) {
            toProcessBarcode(barcode);
            e.target.value = '';
        }
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', toInitializeApp);

// Cleanup function for scanner
window.addEventListener('beforeunload', () => {
    if (Quagga.isInitialized()) {
        Quagga.stop();
    }
});