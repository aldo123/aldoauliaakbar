import { db, ref, onValue, set, update, get, remove }
from "./firebase-config.js";

import { push }
from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* ===============================
   SAFE DOM HELPERS
================================ */
const $ = (id) => document.getElementById(id);
const setText = (id, html) => { if ($(id)) $(id).innerHTML = html; };

/* ===============================
   CACHE
================================ */
let partList = [];
let storageCache = [];

/* ===============================
   LOAD STORAGE (SOURCE OF TRUTH)
================================ */
onValue(ref(db, "storage"), snap => {
  storageCache = [];

  if (!snap.exists()) return;

  Object.entries(snap.val()).forEach(([key, val]) => {
    storageCache.push({
      key,
      ...val
    });
  });
});

/* ===============================
   PART LIST (SKU)
================================ */
onValue(ref(db, "parts"), snap => {
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
   TRANSACTION SUMMARY + TABLE
================================ */
onValue(ref(db, "transactions"), snap => {
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
  const data = Object.values(snap.val())
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  data.forEach((t, i) => {
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
      <td class="${t.type === "IN" ? "text-success" : "text-danger"}">${t.type}</td>
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
   LOW STOCK COUNT (SAME RULE)
================================ */
onValue(ref(db, "storage"), snap => {
  let low = 0;

  if (snap.exists()) {
    Object.values(snap.val()).forEach(s => {
      if (Number(s.stock) < Number(s.minStock)) low++;
    });
  }

  setText("lowStockCount", low);
});

/* ===============================
   PANEL HANDLERS
================================ */
const togglePanel = (type, show) => {
  $(type + "Panel")?.classList.toggle("show", show);
  $(type + "PanelBackdrop")?.classList.toggle("show", show);
};

$("btnIn")?.addEventListener("click", () => togglePanel("in", true));
$("btnOut")?.addEventListener("click", () => togglePanel("out", true));

$("closeInPanel")?.addEventListener("click", () => togglePanel("in", false));
$("closeOutPanel")?.addEventListener("click", () => togglePanel("out", false));
$("inPanelBackdrop")?.addEventListener("click", () => togglePanel("in", false));
$("outPanelBackdrop")?.addEventListener("click", () => togglePanel("out", false));

/* ===============================
   AUTOCOMPLETE IN (FROM PART LIST)
================================ */
const inSearch = $("inSearch");
const inResult = $("partResultList");

function renderInList(list) {
  if (!inResult) return;
  inResult.innerHTML = "";

  if (!list.length) {
    inResult.style.display = "none";
    return;
  }

  list.forEach(p => {
    const div = document.createElement("div");
    div.className = "search-item";
    div.innerHTML = `<strong>${p.partCode}</strong><small>${p.partName}</small>`;
    div.onclick = () => selectInPart(p);
    inResult.appendChild(div);
  });

  inResult.style.display = "block";
}

inSearch?.addEventListener("focus", () => renderInList(partList));
inSearch?.addEventListener("input", () => {
  const key = inSearch.value.toLowerCase();
  renderInList(partList.filter(p =>
    p.partCode.toLowerCase().includes(key) ||
    p.partName.toLowerCase().includes(key)
  ));
});

function selectInPart(p) {
  inSearch.value = p.partName;
  inResult.style.display = "none";

  $("inPartCode").value = p.partCode;
  $("inCategory").value = p.category;
  $("inSubCategory").value = p.subCategory;
  $("inMachine").value = p.machine;
  $("inSpec").value = p.specification;
}

/* ===============================
   SAVE IN
================================ */
$("submitIn")?.addEventListener("click", async () => {
  const partCode = $("inPartCode").value;
  if (!partCode) return alert("❌ Part not selected");

  const qty = Number($("inQty").value || 0);
  if (qty <= 0) return alert("Qty must be > 0");

  const rack = $("inRack").value;
  const row = $("inRow").value;
  const minStock = Number($("inMinStock").value || 0);

  const part = partList.find(p => p.partCode === partCode);
  const partName = part?.partName || "";

  const refStore = ref(db, `storage/${partCode}`);
  const snap = await get(refStore);

  let newStock = qty;
  if (snap.exists()) newStock += Number(snap.val().stock || 0);

  await set(refStore, {
    partCode,
    partName,
    rack,
    row,
    minStock,
    stock: newStock
  });

  await push(ref(db, "transactions"), {
    type: "IN",
    partCode,
    partName,
    qty,
    pic: "System",
    remark: "Top Up Stock",
    time: new Date().toISOString()
  });

  alert("✅ Stock added");
  togglePanel("in", false);
});

/* ===============================
   AUTOCOMPLETE OUT (FROM STORAGE)
================================ */
const outSearch = $("outSearch");
const outResult = $("outSearchList");

function renderOutList(list) {
  if (!outResult) return;
  outResult.innerHTML = "";

  if (!list.length) {
    outResult.style.display = "none";
    return;
  }

  list.forEach(p => {
    const div = document.createElement("div");
    div.className = "search-item";
    div.innerHTML = `<strong>${p.partCode}</strong><small>${p.partName}</small>`;
    div.onclick = () => selectOutPart(p);
    outResult.appendChild(div);
  });

  outResult.style.display = "block";
}

outSearch?.addEventListener("focus", () => renderOutList(storageCache));
outSearch?.addEventListener("input", () => {
  const key = outSearch.value.toLowerCase();
  renderOutList(storageCache.filter(p =>
    p.partCode.toLowerCase().includes(key) ||
    p.partName.toLowerCase().includes(key)
  ));
});

function selectOutPart(p) {
  outSearch.value = `${p.partCode} - ${p.partName}`;
  outResult.style.display = "none";
  $("outPartCode").value = p.partCode;
  $("outPartName").value = p.partName;
}

/* ===============================
   SAVE OUT (ANTI DOUBLE CLICK)
================================ */
let outProcessing = false;

$("submitOut")?.addEventListener("click", async () => {
  if (outProcessing) return;
  outProcessing = true;

  try {
    const partCode = $("outPartCode").value;
    const qty = Number($("outQty").value || 0);
    if (!partCode || qty <= 0) return alert("❌ Part & Qty required");

    const refStore = ref(db, `storage/${partCode}`);
    const snap = await get(refStore);
    if (!snap.exists()) return alert("❌ Stock not found");

    const stock = Number(snap.val().stock);
    const minStock = Number(snap.val().minStock || 0);
    if (stock < qty) return alert("❌ Stock not enough");

    const newStock = stock - qty;

    await update(refStore, { stock: newStock });

    await push(ref(db, "transactions"), {
      type: "OUT",
      partCode,
      partName: snap.val().partName,
      qty,
      pic: $("outTakenBy").value || "Operator",
      remark: "Issue Spare Part",
      time: new Date().toISOString()
    });

    if (newStock < minStock) {
      alert(`⚠ LOW STOCK\nRemaining: ${newStock}`);
    }

    alert("✅ Stock issued");
    togglePanel("out", false);
  } finally {
    outProcessing = false;
  }
});

/* ===============================
   DELETE ALL TRANSACTIONS
================================ */
$("deleteAllTransaction")?.addEventListener("click", async () => {
  if (!confirm("⚠ DELETE ALL TRANSACTION LOG?")) return;
  await remove(ref(db, "transactions"));
  alert("✅ Transaction log cleared");
});
