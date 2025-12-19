
const $ = (s) => document.querySelector(s);

function toast(message, type = "success") {
  const container = $("#toast-container");
  const div = document.createElement("div");
  div.className = `toast ${type}`;
  div.innerText = message;
  container.appendChild(div);

  setTimeout(() => div.remove(), 3000);
}

function money(v) {
  return Number(v).toFixed(2);
}

                         /*  THEME  */
const themeSelector = $("#themeSelector");
themeSelector.value = localStorage.getItem("theme") || "light";

document.body.dataset.theme = themeSelector.value;

themeSelector.addEventListener("change", () => {
  document.body.dataset.theme = themeSelector.value;
  localStorage.setItem("theme", themeSelector.value);
});

                                       /*  SHOP DETAILS  */
function saveShopDetails() {
  const details = {
    name: $("#shopNameInput").value,
    address: $("#shopAddressInput").value,
    contact: $("#shopContactInput").value
  };
  localStorage.setItem("shopDetails", JSON.stringify(details));
  loadShopDetails();
  toast("Pharmacy details saved");
}

function loadShopDetails() {
  const d = JSON.parse(localStorage.getItem("shopDetails"));
  if (!d) return;
  $("#shopName").innerText = d.name;
  $("#shopAddress").innerText = d.address;
  $("#shopContact").innerText = d.contact;
}

                              /*  Stock Manage  */
let stock = JSON.parse(localStorage.getItem("stock")) || [];

function saveStock() {
  localStorage.setItem("stock", JSON.stringify(stock));
}

function stockStatus(qty) {
  if (qty === 0) return "out";
  if (qty <= 10) return "low";
  return "in";
}

function renderStock(filter = "") {
  const box = $("#stock-list");
  box.innerHTML = "";

  stock
    .filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach((s, i) => {
      box.innerHTML += `
        <div class="stock-item">
          <div>
            <strong>${s.name}</strong><br>
            <small>Rate: ${money(s.rate)} | Qty: ${s.qty}</small>
          </div>
          <span class="badge ${stockStatus(s.qty)}">${stockStatus(s.qty)}</span>
        </div>
      `;
    });

  renderProductDropdown();
}

$("#stock-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const name = $("#product-name").value.trim();
  const rate = Number($("#product-rate").value);
  const qty = Number($("#product-qty").value);

  if (!name || rate < 0 || qty < 0) {
    toast("Invalid stock details", "error");
    return;
  }

  const existing = stock.find(s => s.name === name);
  if (existing) {
    existing.rate = rate;
    existing.qty += qty;
    toast("Stock updated");
  } else {
    stock.push({ name, rate, qty });
    toast("Medicine added to stock");
  }

  saveStock();
  renderStock();
  e.target.reset();
});

$("#clear-stock").addEventListener("click", () => {
  if (!confirm("Clear all stock?")) return;
  stock = [];
  saveStock();
  renderStock();
});

                                    /*  Search  */
$("#stock-search").addEventListener("input", e => {
  renderStock(e.target.value);
});

                                       /*  Bill */
let bill = [];

function renderProductDropdown() {
  const select = $("#bill-product");
  select.innerHTML = `<option value="">Select medicine</option>`;
  stock.forEach(s => {
    if (s.qty > 0) {
      select.innerHTML += `<option value="${s.name}">${s.name}</option>`;
    }
  });
}

$("#bill-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const name = $("#bill-product").value;
  const qty = Number($("#bill-qty").value);
  const med = stock.find(s => s.name === name);

  if (!med) {
    toast("Medicine not found", "error");
    return;
  }
  if (qty > med.qty) {
    toast("Not enough stock", "warn");
    return;
  }

  const existing = bill.find(b => b.name === name);
  if (existing) {
    existing.qty += qty;
  } else {
    bill.push({ name, rate: med.rate, qty });
  }

  renderBill();
  $("#bill-qty").value = "";
});

function renderBill() {
  const body = $("#bill-table tbody");
  body.innerHTML = "";

  let subtotal = 0;

  bill.forEach((b, i) => {
    const amt = b.qty * b.rate;
    subtotal += amt;

    body.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${b.name}</td>
        <td>${money(b.rate)}</td>
        <td>${b.qty}</td>
        <td>${money(amt)}</td>
        <td><button onclick="removeBill(${i})">×</button></td>
      </tr>
    `;
  });

  $("#subtotal").innerText = money(subtotal);
  const discount = Number($("#discount").value) || 0;
  $("#grandtotal").innerText = money(subtotal - discount);
}

function removeBill(i) {
  bill.splice(i, 1);
  renderBill();
}

$("#discount").addEventListener("input", renderBill);

/* ================= GENERATE BILL ================= */
$("#generate-bill").addEventListener("click", () => {
  if (!bill.length) {
    toast("Bill is empty", "warn");
    return;
  }

  bill.forEach(b => {
    const med = stock.find(s => s.name === b.name);
    med.qty -= b.qty;
  });

  saveStock();
  renderStock();

  let html = `<p>Date: ${new Date().toLocaleString()}</p><table>`;
  html += `<tr><th>Medicine</th><th>Qty</th><th>Rate</th><th>Total</th></tr>`;
  bill.forEach(b => {
    html += `<tr>
      <td>${b.name}</td>
      <td>${b.qty}</td>
      <td>${money(b.rate)}</td>
      <td>${money(b.qty * b.rate)}</td>
    </tr>`;
  });
  html += `</table>
           <p>Total: <strong>${$("#grandtotal").innerText}</strong></p>`;

  $("#bill-content").innerHTML = html;
  toast("Bill generated");
});

                                /*  Print & pdf */
$("#print-bill").addEventListener("click", () => window.print());

$("#download-pdf").addEventListener("click", async () => {
  const canvas = await html2canvas($("#bill-preview"), { scale: 2 });
  const img = canvas.toDataURL("image/png");
  const pdf = new jspdf.jsPDF();
  pdf.addImage(img, "PNG", 10, 10, 190, 0);
  pdf.save("bill.pdf");
});

                                         /* Clear bill */
$("#clear-bill").addEventListener("click", () => {
  bill = [];
  renderBill();
  $("#bill-content").innerHTML = `<p class="muted">No bill generated yet.</p>`;
  toast("Bill cleared", "warn");
});

                           /*  Initilization */
loadShopDetails();
renderStock();
