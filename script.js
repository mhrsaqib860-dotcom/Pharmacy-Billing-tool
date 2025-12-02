
function saveShopDetails() {
    const name = document.getElementById("shopNameInput").value;
    const address = document.getElementById("shopAddressInput").value;
    const contact = document.getElementById("shopContactInput").value;

    const details = {
        name,
        address,
        contact
    };

    localStorage.setItem("shopDetails", JSON.stringify(details));
    alert("Shop details saved successfully!");
    displayShopDetails(); 
}


function displayShopDetails() {
    const saved = JSON.parse(localStorage.getItem("shopDetails"));

    if (saved) {
        document.getElementById("shopName").innerText = saved.name || "";
        document.getElementById("shopAddress").innerText = saved.address || "";
        document.getElementById("shopContact").innerText = saved.contact || "";
    }
}

// Load shop details when page opens
window.onload = function() {
    displayShopDetails();
};




const $ = (sel) => document.querySelector(sel);
const $all = (sel) => document.querySelectorAll(sel);

// Load stock from localStorage
function loadStock(){
  const raw = localStorage.getItem('pharmacy_stock');
  try {
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Invalid stock data in localStorage, clearing it.');
    localStorage.removeItem('pharmacy_stock');
    return [];
  }
}
function saveStock(stock){
  localStorage.setItem('pharmacy_stock', JSON.stringify(stock));
}

// UI elements
const stockForm = $('#stock-form');
const productNameInput = $('#product-name');
const productRateInput = $('#product-rate');
const stockListEl = $('#stock-list');
const clearStockBtn = $('#clear-stock');

const billForm = $('#bill-form');
const billProductSelect = $('#bill-product');
const billQtyInput = $('#bill-qty');
const billTableBody = $('#bill-table tbody');
const subtotalEl = $('#subtotal');
const discountInput = $('#discount');
const grandtotalEl = $('#grandtotal');

const generateBillBtn = $('#generate-bill');
const printBillBtn = $('#print-bill');
const downloadPdfBtn = $('#download-pdf');
const clearBillBtn = $('#clear-bill');

const billPreview = $('#bill-preview');
const billContent = $('#bill-content');


let billItems = []; 


function init(){
  renderStock();
  renderBillProductsDropdown();
  renderBillTable();
}

function renderStock(){
  const stock = loadStock();
  stockListEl.innerHTML = '';
  if(stock.length === 0){
    stockListEl.innerHTML = '<p class="muted">No stock items yet.</p>';
    return;
  }
  stock.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'stock-item';
    div.innerHTML = `
      <div>
        <strong>${escapeHtml(item.name)}</strong><br />
        <span class="muted">Rate: ${formatMoney(item.rate)}</span>
      </div>
      <div>
        <button class="small-btn" data-edit="${idx}">Edit</button>
        <button class="small-btn" data-delete="${idx}">Delete</button>
      </div>
    `;
    stockListEl.appendChild(div);
  });

  stockListEl.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-edit'));
      editStockItem(idx);
    });
  });
  stockListEl.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-delete'));
      deleteStockItem(idx);
    });
  });
 
  renderBillProductsDropdown();
}

function renderBillProductsDropdown(){
  const stock = loadStock();
  billProductSelect.innerHTML = '<option value="">-- Select product from stock --</option>';
  stock.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.name;
    opt.textContent = `${item.name} — ${formatMoney(item.rate)}`;
    billProductSelect.appendChild(opt);
  });
}


stockForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = productNameInput.value.trim();
  const rate = parseFloat(productRateInput.value);
  if(!name || isNaN(rate) || rate < 0){
    alert('Please enter valid product name and rate.');
    return;
  }

  let stock = loadStock();
  
  const idx = stock.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
  if(idx >= 0){
   
    stock[idx].rate = rate;
    alert('Updated existing product rate in stock.');
  } else {
    stock.push({ name, rate });
    alert('Added product to stock.');
  }
  saveStock(stock);
  productNameInput.value = '';
  productRateInput.value = '';
  renderStock();
});

clearStockBtn.addEventListener('click', () => {
  if(!confirm('Clear entire stock? This cannot be undone.')) return;
  localStorage.removeItem('pharmacy_stock');
  renderStock();
  renderBillProductsDropdown();
});


function editStockItem(index){
  const stock = loadStock();
  if(!stock[index]) return;
  productNameInput.value = stock[index].name;
  productRateInput.value = stock[index].rate;
 
  stock.splice(index, 1);
  saveStock(stock);
  renderStock();
}
function deleteStockItem(index){
  if(!confirm('Delete this stock item?')) return;
  const stock = loadStock();
  if(!stock[index]) return;
  stock.splice(index, 1);
  saveStock(stock);
  renderStock();
}


billForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const selectedName = billProductSelect.value;
  const qty = parseInt(billQtyInput.value);
  if(!selectedName){
    alert('Select a product from stock.');
    return;
  }
  if(isNaN(qty) || qty <= 0){
    alert('Enter a valid quantity (1 or more).');
    return;
  }
  const stock = loadStock();
  const prod = stock.find(s => s.name === selectedName);
  if(!prod){
    alert('Product not found in stock (it might have been removed).');
    return;
  }
  addToBill(prod.name, prod.rate, qty);
  billQtyInput.value = '';
});


function addToBill(name, rate, qty){
  const idx = billItems.findIndex(it => it.name === name);
  if(idx >= 0){
    billItems[idx].qty += qty;
    billItems[idx].amount = +(billItems[idx].rate * billItems[idx].qty).toFixed(2);
  } else {
    const amount = +(rate * qty).toFixed(2);
    billItems.push({ name, rate, qty, amount });
  }
  renderBillTable();
}


function renderBillTable(){
  billTableBody.innerHTML = '';
  let subtotal = 0;
  billItems.forEach((it, i) => {
    subtotal += it.amount;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i+1}</td>
      <td>${escapeHtml(it.name)}</td>
      <td>${formatMoney(it.rate)}</td>
      <td>${it.qty}</td>
      <td>${formatMoney(it.amount)}</td>
      <td>
        <button class="small-btn" data-remove="${i}">Remove</button>
      </td>
    `;
    billTableBody.appendChild(row);
  });
  subtotal = +subtotal.toFixed(2);
  subtotalEl.textContent = formatMoney(subtotal);
  
  const discount = parseFloat(discountInput.value) || 0;
  let total = subtotal - discount;
  if(total < 0) total = 0;
  grandtotalEl.textContent = formatMoney(total);
 
  billTableBody.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-remove'));
      billItems.splice(idx, 1);
      renderBillTable();
    });
  });
}

// discount change -> recalc
discountInput.addEventListener('input', renderBillTable);

// Generate bill (populate preview area)
generateBillBtn.addEventListener('click', (e) => {
  if(billItems.length === 0){
    alert('Add items to the bill first.');
    return;
  }
  const subtotal = parseFloat(subtotalEl.textContent) || 0;
  const discount = parseFloat(discountInput.value) || 0;
  const total = parseFloat(grandtotalEl.textContent) || 0;

  // create bill HTML
  const date = new Date().toLocaleString();
  let html = `<div><strong>Bill Date:</strong> ${escapeHtml(date)}</div>`;
  html += '<table style="width:100%; margin-top:8px; border-collapse:collapse;">';
  html += '<thead><tr><th>#</th><th>Product</th><th>Rate</th><th>Qty</th><th>Amount</th></tr></thead><tbody>';
  billItems.forEach((it, i) => {
    html += `<tr>
      <td style="padding:6px;">${i+1}</td>
      <td style="padding:6px;">${escapeHtml(it.name)}</td>
      <td style="padding:6px;">${formatMoney(it.rate)}</td>
      <td style="padding:6px;">${it.qty}</td>
      <td style="padding:6px;">${formatMoney(it.amount)}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  html += `<div style="text-align:right; margin-top:8px;">
    <div>Subtotal: <strong>${formatMoney(subtotal)}</strong></div>
    <div>Discount: <strong>${formatMoney(discount)}</strong></div>
    <div style="font-size:1.1em; margin-top:6px;">Total: <strong>${formatMoney(total)}</strong></div>
  </div>`;

  billContent.innerHTML = html;
  // optional: scroll to preview
  billPreview.scrollIntoView({ behavior: 'smooth' });
});

// Print bill using browser print (only the bill-preview area)
printBillBtn.addEventListener('click', () => {
  // open new window with bill content for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  const style = `<style>
    body{font-family: Arial, sans-serif; padding:20px}
    table{width:100%; border-collapse: collapse}
    td, th{padding:6px; border-bottom:1px solid #e6e6e6}
  </style>`;
  printWindow.document.write('<html><head><title>Print Bill</title>' + style + '</head><body>');
  printWindow.document.write(billPreview.innerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
});

// Download PDF: use html2canvas + jsPDF
downloadPdfBtn.addEventListener('click', async () => {
  // ensure there is something generated
  if(billContent.innerHTML.trim() === '' || billContent.innerHTML.includes('No bill')){
    alert('Generate the bill first, then download as PDF.');
    return;
  }
  // Use html2canvas to capture the billPreview
  const node = billPreview;
  // increase scale for better quality
  const scale = 2;
  const canvas = await html2canvas(node, { scale, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jspdf.jsPDF('p', 'pt', 'a4'); // points
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // calculate image dimensions to fit A4
  const imgWidth = pageWidth - 40; // margins
  const ratio = canvas.width / canvas.height;
  const imgHeight = imgWidth / ratio;

  let position = 20;
  pdf.addImage(imgData, 'PNG', 20, position, imgWidth, imgHeight);
  // if content overflows a page, add more pages
  let remainingHeight = imgHeight;
  let pageCanvasHeight = pageHeight - 40;
  if(imgHeight > pageCanvasHeight){
    // break into multiple pages (simple approach: scale page by page)
    // For most simple bills this won't be needed, but code kept for safety.
    // (Advanced splitting requires slicing canvas; omitted for brevity)
  }
  pdf.save(`bill_${Date.now()}.pdf`);
});

// Clear bill
clearBillBtn.addEventListener('click', () => {
  if(!confirm('Clear current bill items?')) return;
  billItems = [];
  renderBillTable();
  billContent.innerHTML = '<p class="muted">No bill generated yet.</p>';
});

// small utility helpers
function formatMoney(num){
  // show two decimals, safe arithmetic
  return (+num).toFixed(2);
}
function escapeHtml(unsafe){
  return String(unsafe)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

// initialize
init();

// Extra: Load sample data if stock is empty (for beginners to try quickly)
if(loadStock().length === 0){
  const sample = [
    {name:'Paracetamol 500mg', rate:45.00},
    {name:'Cough Syrup 100ml', rate:120.50},
    {name:'Vitamin C 100mg', rate:85.00}
  ];
  saveStock(sample);
  renderStock();
  renderBillProductsDropdown();
}
