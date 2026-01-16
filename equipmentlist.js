import { db, ref, onValue, remove, update } from "./firebase-config.js";
import { push } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

/* ===============================
   DOM
================================ */
// ===== MODAL FORM DOM =====
const eqNo = document.getElementById("eqNo");
const eqGroup = document.getElementById("eqGroup");
const eqActionStatus = document.getElementById("eqActionStatus");
const eqLastInspection = document.getElementById("eqLastInspection");
const eqNextCalibration = document.getElementById("eqNextCalibration");
const eqModel = document.getElementById("eqModel");
const eqBrand = document.getElementById("eqBrand");
const eqSN = document.getElementById("eqSN");
const eqRemark = document.getElementById("eqRemark");

// ===== BUTTON & INPUT =====
const btnAddEquipment = document.getElementById("btnAddEquipment");
const saveEquipment = document.getElementById("saveEquipment");
const btnImportEquipment = document.getElementById("btnImportEquipment");
const btnExportEquipment = document.getElementById("btnExportEquipment");
const importFile = document.getElementById("importFile");


const tbody         = document.getElementById("equipmentBody");
const filterNo      = document.getElementById("filterNo");
const filterGroup   = document.getElementById("filterGroup");
const filterStatus  = document.getElementById("filterStatus");
const filterBrand   = document.getElementById("filterBrand");
const filterRemark = document.getElementById("filterRemark");


filterStatus.value = "APPROVE";

let equipmentData = [];
let editingKey = null;


/* ===============================
   LOAD EQUIPMENT
================================ */
onValue(ref(db, "equipment"), snap => {
  equipmentData = [];

  if (snap.exists()) {
    Object.entries(snap.val()).forEach(([key, e]) => {
      equipmentData.push({
        key,
        equipmentNo: e.equipmentNo || "",
        group: e.group || "",
        actionStatus: e.actionStatus || "".toUpperCase().trim(),
        lastInspection: e.lastInspection || "",
        nextCalibration: e.nextCalibration || "",
        model: e.model || "",
        brand: e.brand || "",
        serialNo: e.serialNo || "",
        remark: calculateRemark(e.nextCalibration)
      });
    });
  }

  fillFilters(equipmentData);
  renderTable(equipmentData);
});

function addOneYear(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

function calculateRemark(nextCalibration) {
  if (!nextCalibration) return "OK";

  let next;

  // ===== PARSE DATE AMAN =====
  if (/^\d{4}-\d{2}-\d{2}$/.test(nextCalibration)) {
    // YYYY-MM-DD
    next = new Date(nextCalibration);
  } 
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(nextCalibration)) {
    // DD/MM/YYYY
    const [d, m, y] = nextCalibration.split("/");
    next = new Date(`${y}-${m}-${d}`);
  } 
  else {
    return "OK"; // format aneh → anggap OK
  }

  if (isNaN(next.getTime())) return "OK";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  next.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((next - today) / 86400000);

  if (diffDays < 0) return "OVERDUE";
  if (diffDays <= 30) return "DUE";
  return "OK";
}


/* ===============================
   RENDER TABLE
================================ */
function renderTable(data) {
  tbody.innerHTML = "";

  data.forEach((e, index) => {

    if (filterNo.value && !e.equipmentNo.toLowerCase().includes(filterNo.value.toLowerCase())) return;
    if (filterGroup.value && e.group !== filterGroup.value) return;
    if (
      filterStatus.value &&
      e.actionStatus.toLowerCase() !== filterStatus.value.toLowerCase()
    ) return;
    if (filterBrand.value && e.brand !== filterBrand.value) return;
    if (filterRemark.value && e.remark !== filterRemark.value) return;
    const statusClass = `status-${e.actionStatus.toLowerCase()}`;
    const remarkClass = `remark-${e.remark.toLowerCase()}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${e.equipmentNo}</td>
      <td>${e.group}</td>
      <td><span class="status-badge ${statusClass}">${e.actionStatus}</span></td>
      <td>${e.lastInspection || "-"}</td>
      <td>${e.nextCalibration || "-"}</td>
      <td>${e.model}</td>
      <td>${e.brand}</td>
      <td>${e.serialNo}</td>
      <td><span class="remark-badge remark-${e.remark.toLowerCase()}">${e.remark}</span></td>
      <td>
        <button class="icon-btn edit-btn" data-key="${e.key}">✏️</button>
        <button class="icon-btn delete-btn" data-key="${e.key}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ===============================
   FILTER
================================ */
function fillFilters(data) {
  fillSelect(filterGroup, data.map(d => d.group));
  fillSelect(filterBrand, data.map(d => d.brand));
}

function fillSelect(select, values) {
  const current = select.value;
  select.innerHTML = `<option value="">All</option>`;

  [...new Set(values.filter(v => v && v !== "-"))]
    .sort()
    .forEach(v => select.innerHTML += `<option value="${v}">${v}</option>`);

  select.value = current;
}

[
  filterNo,
  filterGroup,
  filterStatus,
  filterBrand,
  filterRemark
].forEach(el =>
  el.addEventListener(
    el.tagName === "SELECT" ? "change" : "input",
    () => renderTable(equipmentData)
  )
);

/* ===============================
   ACTIONS
================================ */
const modal = new bootstrap.Modal(document.getElementById("equipmentModal"));

tbody.addEventListener("click", async e => {

  const delBtn = e.target.closest(".delete-btn");
  if (delBtn) {
    if (confirm("Delete this equipment?")) {
      await remove(ref(db, `equipment/${delBtn.dataset.key}`));
    }
    return;
  }

  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) {
    const eq = equipmentData.find(x => x.key === editBtn.dataset.key);
    if (!eq) return;

    editingKey = eq.key;

    eqNo.value = eq.equipmentNo;
    eqGroup.value = eq.group;
    const status = (eq.actionStatus || "").toUpperCase().trim();
    eqActionStatus.value = 
      ["APPROVE", "BLOCKED", "SCRAPPED"].includes(status)
        ? status
        : "";
    eqLastInspection.value = toISODate(eq.lastInspection);
    eqNextCalibration.value = toISODate(eq.nextCalibration);
    eqModel.value = eq.model;
    eqBrand.value = eq.brand;
    eqSN.value = eq.serialNo;
    eqRemark.value = eq.remark;
    modal.show();
  }
});

/* ===============================
   ADD BUTTON
================================ */
btnAddEquipment.onclick = () => {
  editingKey = null;
  eqNo.value = "";
  eqGroup.value = "";
  eqActionStatus.value = "APPROVE";
  eqLastInspection.value = "";
  eqNextCalibration.value = "";
  eqModel.value = "";
  eqBrand.value = "";
  eqSN.value = "";
  eqRemark.value = "OK";
  modal.show();
};

/* ===============================
   SAVE (ADD / UPDATE)
================================ */
saveEquipment.onclick = async (e) => {
  e.preventDefault(); // ⛔ STOP submit default

  const equipmentNo = (eqNo.value || "").trim();

  if (!equipmentNo) {
    alert("Equipment No wajib diisi");
    return;
  }

  // 🔥 CEK DUPLIKASI
  if (!editingKey) {
    const exists = equipmentData.some(e => e.equipmentNo === equipmentNo);
    if (exists) {
      alert("❌ Equipment No sudah ada!");
      return;
    }
  }

  const nextCalibration = addOneYear(eqLastInspection.value);

  const payload = {
    equipmentNo,
    group: (eqGroup.value || "").trim() || "-",
    actionStatus: eqActionStatus.value,
    lastInspection: eqLastInspection.value || "",
    nextCalibration,
    model: eqModel.value.trim() || "-",
    brand: eqBrand.value.trim() || "-",
    serialNo: String(eqSN.value).trim() || "-"
  };

  editingKey
    ? await update(ref(db, `equipment/${editingKey}`), payload)
    : await push(ref(db, "equipment"), payload);

  modal.hide();
  
};


/* ===============================
   IMPORT (HEADER BASED)
================================ */
btnImportEquipment.onclick = () => importFile.click();

importFile.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const delimiter = text.includes(";") ? ";" : ",";

  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    if (confirm("CSV kosong. Semua data equipment akan dihapus. Lanjutkan?")) {
      await remove(ref(db, "equipment"));
      alert("✅ Semua data equipment dikosongkan");
    }
    importFile.value = "";
    return;
  }

  // ===============================
  // PARSE HEADER
  // ===============================
  const headers = lines.shift().split(delimiter).map(h => h.toLowerCase());

  const get = (row, name) => {
    const idx = headers.indexOf(name.toLowerCase());
    return idx >= 0 ? row[idx]?.trim() : "";
  };

  // ===============================
  // BUILD CSV MAP
  // ===============================
  const csvMap = new Map();

  for (const l of lines) {
    const r = l.split(delimiter);

    const equipmentNo = get(r, "equipment no");
    if (!equipmentNo) continue;

    csvMap.set(equipmentNo, {
      equipmentNo,
      group: get(r, "inspection equipment group") || "",
      actionStatus: get(r, "status") || "",
      lastInspection: get(r, "last inspection") || "",
      nextCalibration: get(r, "next calibration") || "",
      model: get(r, "model") || "",
      brand: get(r, "brand") || "",
      serialNo: String(get(r, "s/n")).trim() || "",
      remark: get(r, "remark") || ""
    });
  }

  // ===============================
  // LOAD FIREBASE DATA
  // ===============================
  const snap = await new Promise(res =>
    onValue(ref(db, "equipment"), res, { onlyOnce: true })
  );

  const fbMap = new Map();
  if (snap.exists()) {
    Object.entries(snap.val()).forEach(([key, val]) => {
      fbMap.set(val.equipmentNo, { key, ...val });
    });
  }

  // ===============================
  // UPDATE & ADD
  // ===============================
  for (const [eqNo, payload] of csvMap.entries()) {
    if (fbMap.has(eqNo)) {
      await update(ref(db, `equipment/${fbMap.get(eqNo).key}`), payload);
    } else {
      await push(ref(db, "equipment"), payload);
    }
  }

  // ===============================
  // DELETE MISSING
  // ===============================
  for (const [eqNo, fb] of fbMap.entries()) {
    if (!csvMap.has(eqNo)) {
      await remove(ref(db, `equipment/${fb.key}`));
    }
  }

  alert(`✅ Sync selesai\nCSV: ${csvMap.size} data`);
  importFile.value = "";
};


/* ===============================
   EXPORT CSV (UPDATED)
================================ */
btnExportEquipment.onclick = () => {

  if (!equipmentData.length) {
    alert("Tidak ada data untuk diexport");
    return;
  }

  let csv =
    "Equipment No," +
    "Inspection Equipment Group," +
    "Status," +
    "Last Inspection," +
    "Next Calibration," +
    "Model," +
    "Brand," +
    "S/N," +
    "Remark\n";

  equipmentData.forEach(e => {
    csv += [
      e.equipmentNo,
      e.group,
      e.actionStatus,
      e.lastInspection,
      e.nextCalibration,
      e.model,
      e.brand,
      e.serialNo,
      e.remark
    ].map(v => `"${v ?? ""}"`).join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `equipment_list_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

document.getElementById("btnCancel").onclick = () => {
  editingKey = null;
  modal.hide();
};

function toISODate(v) {
  if (!v) return "";

  // YYYY-MM-DD (sudah benar)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [d, m, y] = v.split("/");
    return `${y}-${m}-${d}`;
  }

  return "";
}

