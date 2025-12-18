import { db, ref, onValue, set, update, get, remove} 
from "./firebase-config.js";

import { push } 
from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* ===============================
   SAFE DOM HELPERS
================================ */
const $ = (id) => document.getElementById(id);
const setText = (id, html) => { if ($(id)) $(id).innerHTML = html; };

/* ===============================
   PART LIST CACHE
================================ */
let partList = [];

/* ===============================
   TOTAL SKU (PART LIST)
================================ */
onValue(ref(db, "parts"), (snap) => {
  if (!snap.exists()) {
    partList = [];
    setText("totalSkuValue", 0);
    return;
  }

  partList = Object.values(snap.val()).map(p => ({
  partCode: p.code || "",
  partName: p.name || "",
  category: p.category || "",
  subCategory: p.sub || "",
  machine: p.machine || "",
  specification: p.spec || ""
}));
  setText("totalSkuValue", partList.length);
});

/* ===============================
   TRANSACTIONS SUMMARY + TABLE
================================ */
onValue(ref(db, "transactions"), (snap) => {
  let inToday = 0;
  let outToday = 0;

  const tbody = $("logBody");
  if (tbody) tbody.innerHTML = "";

  if (!snap.exists()) {
    setText("incomingValue", 0);
    setText("outgoingValue", 0);
    return;
  }

  const today = new Date().toDateString();
  const data = Object.values(snap.val());

  data
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .forEach((t, i) => {

      if (new Date(t.time).toDateString() === today) {
        if (t.type === "IN")  inToday  += Number(t.qty);
        if (t.type === "OUT") outToday += Number(t.qty);
      }

      if (!tbody) return;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${new Date(t.time).toLocaleString()}</td>
        <td>${t.partName || "-"}</td>
        <td class="${t.type === "IN" ? "text-success" : "text-danger"}">
          ${t.type}
        </td>
        <td>${t.type === "IN" ? "+" : "-"}${t.qty} pcs</td>
        <td>${t.pic || "-"}</td>
        <td>${t.remark || "-"}</td>
      `;
      tbody.appendChild(tr);
    });

  setText("incomingValue", inToday);
  setText("outgoingValue", outToday);
});

/* ===============================
   LOW STOCK COUNT
================================ */
onValue(ref(db, "storage"), (snap) => {
  let low = 0;
  if (snap.exists()) {
    Object.values(snap.val()).forEach(s => {
      if (Number(s.stock) <= Number(s.minStock)) low++;
    });
  }
  setText("lowStockCount", low);
});

/* ===============================
   PANEL HANDLERS
================================ */
$("btnOut")?.addEventListener("click", () => togglePanel("out", true));
$("btnIn") ?.addEventListener("click", () => togglePanel("in",  true));

$("closeOutPanel")?.addEventListener("click", () => togglePanel("out", false));
$("outPanelBackdrop")?.addEventListener("click", () => togglePanel("out", false));

$("closeInPanel")?.addEventListener("click", () => togglePanel("in", false));
$("inPanelBackdrop")?.addEventListener("click", () => togglePanel("in", false));

function togglePanel(type, show) {
  $(type + "Panel")?.classList.toggle("show", show);
  $(type + "PanelBackdrop")?.classList.toggle("show", show);
}

/* ===============================
   SEARCH + AUTOCOMPLETE (IN)
================================ */
const searchInput = $("inSearch");
const resultBox = $("partResultList");

function renderPartList(list) {
  if (!resultBox) return;

  resultBox.innerHTML = "";
  if (!list.length) {
    resultBox.style.display = "none";
    return;
  }

  list.forEach(p => {
    const div = document.createElement("div");
    div.className = "search-item";
    div.innerHTML = `
      <strong>${p.partCode}</strong>
      <small>${p.partName}</small>
    `;
    div.onclick = () => selectPart(p);
    resultBox.appendChild(div);
  });

  resultBox.style.display = "block";
}


searchInput?.addEventListener("focus", () => renderPartList(partList));

searchInput?.addEventListener("input", () => {
  const key = searchInput.value.toLowerCase();
  const filtered = partList.filter(p =>
    (p.partCode || "").toLowerCase().includes(key) ||
    (p.partName || "").toLowerCase().includes(key)
  );
  renderPartList(filtered);
});

function selectPart(p) {
  //$("inSearch").value = `${p.partCode} - ${p.partName}`;
  $("inSearch").value = p.partName;
  resultBox.style.display = "none";

  $("inPartCode").value    = p.partCode;
  $("inCategory").value    = p.category;
  $("inSubCategory").value = p.subCategory;
  $("inMachine").value     = p.machine;
  $("inSpec").value        = p.specification;
}


/* ===============================
   SAVE IN (STORAGE + TRANSACTION)
================================ */
$("submitIn")?.addEventListener("click", async () => {

  const partCode = $("inPartCode").value;
  if (!partCode) {
    alert("❌ Part not selected");
    return;
  }

  const qty      = Number($("inQty").value || 0);
  const rack     = $("inRack").value;
  const row      = $("inRow").value;
  const minStock = Number($("inMinStock").value || 0);

  const storageRef = ref(db, `storage/${partCode}`);
  const snap = await get(storageRef);

  let newStock = qty;
  let partName = "";

  const part = partList.find(p => p.partCode === partCode);
  if (part) partName = part.partName;

  if (snap.exists()) {
    newStock += Number(snap.val().stock || 0);
    await update(storageRef, { stock: newStock, rack, row, minStock });
  } else {
    await set(storageRef, {
      partCode,
      partName,
      stock: newStock,
      rack,
      row,
      minStock
    });
  }

  await push(ref(db, "transactions"), {
    type: "IN",
    partCode,
    partName,
    qty,
    time: new Date().toISOString(),
    pic: "System",
    remark: "Top Up Stock"
  });

  alert("✅ Stock successfully added");
  togglePanel("in", false);
});

$("submitOut")?.addEventListener("click", async () => {

  const keyword = $("outSearch")?.value.trim();
  const qtyOut  = Number($("outQty")?.value || 0);

  const machine = $("outMachine")?.value.trim();
  const reason  = $("outReason")?.value.trim();
  const takenBy = $("outTakenBy")?.value.trim();

  if (!keyword || qtyOut <= 0) {
    alert("❌ Part & Qty wajib diisi");
    return;
  }

  // cari part dari storage
  const storageSnap = await get(ref(db, "storage"));
  if (!storageSnap.exists()) {
    alert("❌ Storage kosong");
    return;
  }

  const storageData = Object.values(storageSnap.val());
  const part = storageData.find(p =>
    p.partCode === keyword || p.partName?.toLowerCase().includes(keyword.toLowerCase())
  );

  if (!part) {
    alert("❌ Part tidak ditemukan di storage");
    return;
  }

  if (Number(part.stock) < qtyOut) {
    alert("❌ Stock tidak mencukupi");
    return;
  }

  const newStock = Number(part.stock) - qtyOut;

  // UPDATE STORAGE
  await update(ref(db, `storage/${part.partCode}`), {
    stock: newStock
  });

  // SAVE TRANSACTION
  await push(ref(db, "transactions"), {
    type: "OUT",
    partCode: part.partCode,
    partName: part.partName,
    qty: qtyOut,
    machine,
    reason,
    takenBy,
    time: new Date().toISOString(),
    pic: takenBy || "Operator",
    remark: reason || "OUT"
  });

  // LOW STOCK WARNING
  if (newStock <= Number(part.minStock)) {
    alert(`⚠ LOW STOCK WARNING!\n${part.partName}\nRemaining: ${newStock}`);
  }

  alert("✅ Stock OUT success");
  togglePanel("out", false);
});

/* ===============================
   SEARCH + AUTOCOMPLETE (OUT)
================================ */
const outSearchInput = $("outSearch");
const outResultBox   = $("outSearchList");

function renderOutList(list) {
  if (!outResultBox) return;

  outResultBox.innerHTML = "";
  if (!list.length) {
    outResultBox.style.display = "none";
    return;
  }

  list.forEach(p => {
    const div = document.createElement("div");
    div.className = "search-item";
    div.innerHTML = `
      <strong>${p.partCode}</strong>
      <small>${p.partName}</small>
    `;
    div.onclick = () => selectOutPart(p);
    outResultBox.appendChild(div);
  });

  outResultBox.style.display = "block";
}

outSearchInput?.addEventListener("focus", () => {
  renderOutList(partList);
});

outSearchInput?.addEventListener("input", () => {
  const key = outSearchInput.value.toLowerCase();
  const filtered = partList.filter(p =>
    p.partCode.toLowerCase().includes(key) ||
    p.partName.toLowerCase().includes(key)
  );
  renderOutList(filtered);
});

function selectOutPart(p) {
  outSearchInput.value = `${p.partCode} - ${p.partName}`;
  outResultBox.style.display = "none";

  $("outPartCode").value = p.partCode;
  $("outPartName").value = p.partName;
}

/* ===============================
   SAVE OUT (STORAGE + TRANSACTION)
================================ */
$("submitOut")?.addEventListener("click", async () => {

  const partCode = $("outPartCode").value;
  const partName = $("outPartName").value;

  if (!partCode) {
    alert("❌ Part not selected");
    return;
  }

  const qty    = Number($("outQty").value || 0);
  const machine = $("outMachine").value;
  const reason  = $("outReason").value;
  const takenBy = $("outTakenBy").value;

  if (qty <= 0) {
    alert("Qty must be greater than 0");
    return;
  }

  const storageRef = ref(db, `storage/${partCode}`);
  const snap = await get(storageRef);

  if (!snap.exists()) {
    alert("❌ Stock not found");
    return;
  }

  const currentStock = Number(snap.val().stock || 0);
  if (currentStock < qty) {
    alert("❌ Stock not enough");
    return;
  }

  // UPDATE STOCK
  await update(storageRef, {
    stock: currentStock - qty
  });

  // SAVE TRANSACTION
  await push(ref(db, "transactions"), {
    type: "OUT",
    partCode,
    partName,
    qty,
    machine,
    reason,
    pic: takenBy,
    time: new Date().toISOString(),
    remark: "Issue Spare Part"
  });

  alert("✅ Spare part issued successfully");
  togglePanel("out", false);
});

document.getElementById("deleteAllTransaction")?.addEventListener("click", async () => {
  const confirmDelete = confirm(
    "⚠️ DELETE ALL TRANSACTION LOG?\n\nThis action cannot be undone."
  );

  if (!confirmDelete) return;

  try {
    await remove(ref(db, "transactions"));
    alert("✅ All transaction logs deleted");
  } catch (err) {
    console.error(err);
    alert("❌ Failed to delete transaction log");
  }
});

