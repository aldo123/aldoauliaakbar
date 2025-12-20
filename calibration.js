import { db, ref, onValue, update } from "./firebase-config.js";

const tbody = document.getElementById("calibrationBody");
const searchInput = document.getElementById("searchEquipment");
const filterStatus = document.getElementById("filterStatus");

const okCount = document.getElementById("okCount");
const dueCount = document.getElementById("dueCount");
const overdueCount = document.getElementById("overdueCount");

let equipmentData = [];
let selectedKey = null;

/* ===============================
   STATUS CALC
================================ */
function getStatus(nextDate) {
  if (!nextDate) return "OK";

  const due = new Date(nextDate);
  if (isNaN(due.getTime())) return "OK"; // 🔥 FIX INVALID DATE

  const today = new Date();
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return "OVERDUE";
  if (diff <= 30) return "DUE";
  return "OK";
}


/* ===============================
   LOAD FROM FIREBASE
================================ */
onValue(ref(db, "equipment"), snap => {
  equipmentData = [];

  if (snap.exists()) {
    Object.entries(snap.val()).forEach(([key, e]) => {
      const actionStatus = (e.actionStatus || "").toUpperCase();
      if (actionStatus !== "APPROVE") return;

      const status = getStatus(e.nextCalibration);

      equipmentData.push({
        key,
        equipmentNo: e.equipmentNo,
        group: e.group,
        serialNo: e.serialNo || "-",   // 🔥 FIX: ambil SN
        actionStatus: actionStatus,
        last: e.lastInspection || "-",
        next: e.nextCalibration || "",
        status
      });
    });
  }

  renderTable();
});

/* ===============================
   RENDER
================================ */
function renderTable() {
  tbody.innerHTML = "";

  let ok = 0, due = 0, overdue = 0;

  equipmentData.forEach(e => {
    if (e.status === "OK") ok++;
    if (e.status === "DUE") due++;
    if (e.status === "OVERDUE") overdue++;
  });

  okCount.textContent = ok;
  dueCount.textContent = due;
  overdueCount.textContent = overdue;

  equipmentData.forEach(e => {
    if (e.status === "OK") return; // 🔥 calibration page ONLY due & overdue

    if (filterStatus.value && e.status !== filterStatus.value) return;
    if (searchInput.value &&
        !e.equipmentNo.toLowerCase().includes(searchInput.value.toLowerCase()))
      return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.equipmentNo}</td>
      <td>${e.group}</td>
      <td>${e.serialNo}</td>
      <td>${e.last}</td>
      <td>${e.next}</td>
      <td>
        <span class="status-badge status-${e.status.toLowerCase()}">
          ${e.status}
        </span>
      </td>
      <td>
        <button class="btn btn-success btn-sm"
          onclick="markCalibrated('${e.key}')">
          Calibration
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ===============================
   MARK CALIBRATED
================================ */
window.markCalibrated = async (key) => {
  const today = new Date().toISOString().slice(0,10);
  const next = new Date();
  next.setFullYear(next.getFullYear() + 1);

  await update(ref(db, `equipment/${key}`), {
    lastInspection: today,
    nextCalibration: next.toISOString().slice(0,10)
  });

  alert("✅ Calibration updated");
};

/* ===============================
   FILTER EVENTS
================================ */
searchInput.addEventListener("input", renderTable);
filterStatus.addEventListener("change", renderTable);
