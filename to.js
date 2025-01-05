// Database of barcodes and their corresponding product details
const toBarcodeDb = {
    "8902625019424": {
        itemName: "A202-ATHL-T-SPTBRA-P1",
        color: "CHIVIO",
        size: "L",
        mrp: 939.00
    },
    "8902625567444": {
        itemName: "E040-ATHL-B-LEGGING-P1",
        color: "AABC",
        size: "S",
        mrp: 1039.00
    }
};


// Scanner state
let isQuaggaInitialized = false;

// DOM Elements
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

let lastScannedCode = null;
let lastScannedTime = 0;



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

    // Handle Product Form Submission
    document.getElementById('toAddItemBtn').addEventListener('click', toHandleAddItem);

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

    // Add scanner close button
    const scannerCloseBtn = document.querySelector('.scanner-close-btn');
    if (scannerCloseBtn) {
        scannerCloseBtn.addEventListener('click', toHideScanner);
    }
}

// Scanner Management
function toInitializeScanner() {
    if (typeof Quagga === 'undefined') {
        alert("Scanner library not loaded. Please ensure Quagga.js is properly included.");
        return;
    }

    toElements.scannerContainer.style.display = 'block';
    toElements.manualBarcodeInput.style.display = 'none';
    
    if (!isQuaggaInitialized) {
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector("#toScanner"),
                constraints: {
                    facingMode: "environment",
                    width: 1280,
                    height: 720,
                    aspectRatio: { min: 1, max: 2 }
                },
                area: { // Only read barcodes in center of view
                    top: "25%",
                    right: "10%",
                    left: "10%",
                    bottom: "25%"
                }
            },
            decoder: {
                readers: [
                    "ean_reader",
                    "ean_8_reader",
                    "ean_13_reader",
                    "upc_reader",
                    "upc_e_reader"
                ],
                multiple: false,
                debug: {
                    drawBoundingBox: true,
                    showPattern: true
                },
                locate: true
            },
            locator: {
                patchSize: "medium",
                halfSample: true
            },
            numOfWorkers: navigator.hardwareConcurrency || 4,
            frequency: 10,
            tracking: true
        }, function(err) {
            if (err) {
                console.error("Scanner initialization error:", err);
                alert("Error initializing scanner. Please try manual entry.");
                return;
            }
            isQuaggaInitialized = true;
            Quagga.start();
        });

        // Enhanced barcode detection with confidence threshold
        Quagga.onDetected((result) => {
            const code = result.codeResult.code;
            const confidence = result.codeResult.confidence;
            const currentTime = Date.now();
            
            // Implement debouncing (wait 1 second between scans)
            if (currentTime - lastScannedTime < 1000) {
                return;
            }
            
            // Check confidence threshold and code validity
            if (confidence > 0.7 && code && code.length >= 8) {
                // Prevent duplicate scans
                if (code !== lastScannedCode) {
                    lastScannedCode = code;
                    lastScannedTime = currentTime;
                    toProcessBarcode(code);
                }
            }
        });

        // Add processing feedback
        Quagga.onProcessed((result) => {
            const drawingCtx = Quagga.canvas.ctx.overlay;
            const drawingCanvas = Quagga.canvas.dom.overlay;

            if (result) {
                if (result.boxes) {
                    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                    result.boxes.filter(box => box !== result.box).forEach(box => {
                        drawingCtx.strokeStyle = "green";
                        drawingCtx.strokeRect(box.x, box.y, box.width, box.height);
                    });
                }

                if (result.box) {
                    drawingCtx.strokeStyle = "blue";
                    drawingCtx.strokeRect(
                        result.box.x, 
                        result.box.y, 
                        result.box.width, 
                        result.box.height
                    );
                }
            }
        });
    } else {
        Quagga.start();
    }
}

function toHandleBarcodeDetection(result) {
    const barcode = result.codeResult.code;
    if (toBarcodeDb[barcode]) {
        // If it's a match, stop scanning temporarily
        if (isQuaggaInitialized) {
            Quagga.stop();
            isQuaggaInitialized = false;
        }
    }
    toProcessBarcode(barcode);
}
function toHideScanner() {
    toElements.scannerContainer.style.display = 'none';
    if (isQuaggaInitialized) {
        Quagga.stop();
    }
}

function toCleanupScanner() {
    if (isQuaggaInitialized) {
        Quagga.stop();
        isQuaggaInitialized = false;
    }
}

// Manual Entry
function toShowManualInput() {
    toElements.scannerContainer.style.display = 'block';
    toElements.manualBarcodeInput.style.display = 'block';
    
    if (isQuaggaInitialized) {
        Quagga.stop();
    }
}

function toHandleManualBarcode(event) {
    if (event.key === 'Enter') {
        toProcessBarcode(event.target.value);
        event.target.value = '';
    }
}

// Barcode Processing
// Barcode Processing
function toProcessBarcode(barcode) {
    if (toBarcodeDb[barcode]) {
        const product = toBarcodeDb[barcode];
        console.log('Scan matched:', product.itemName); // Log the match
        
        // Just confirm the MRP
        const confirmed = confirm(`Product: ${product.itemName}\nMRP: ₹${product.mrp}\n\nClick OK to add to cart or Cancel to skip`);
        
        if (confirmed) {
            toAddToCart({
                barcode,
                ...product
            });
        }
    } else {
        // For unmatched barcodes, show the product modal to enter details
        console.log('Scan not found in database:', barcode);
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

    toCartItems.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'to-cart-item';
        itemElement.innerHTML = `
            <span>${item.itemName} - ${item.color} - ${item.size}</span>
            <span>Qty: ${item.quantity} | MRP: ₹${item.mrp}</span>
            <button class="to-remove-btn" data-index="${index}">Remove</button>
        `;
        
        itemElement.querySelector('.to-remove-btn').addEventListener('click', () => {
            toCartItems.splice(index, 1);
            toUpdateCartDisplay();
        });
        
        toElements.cartItems.appendChild(itemElement);
        totalQty += item.quantity;
    });

    toElements.totalQty.textContent = totalQty;
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

// Handle Add Item Button Click
function toHandleAddItem() {
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
        const newTempRef = firebase.database().ref('tempOrders').push();
        await newTempRef.set(toTempData);
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
function toLoadExistingTemp() {
    try {
        const tempOrdersRef = firebase.database().ref('tempOrders');
        tempOrdersRef.orderByChild('datetime').limitToLast(10).on('value', (snapshot) => {
            toElements.tempList.innerHTML = '';
            const tempOrders = [];
            
            snapshot.forEach((childSnapshot) => {
                tempOrders.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            tempOrders.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

            tempOrders.forEach(data => {
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

// Cleanup on page unload
window.addEventListener('beforeunload', toCleanupScanner);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', toInitializeApp);
