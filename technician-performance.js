import { db, ref, onValue, update, remove, get } from "./firebase-config.js";
import { push } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";


const filterWeek = document.getElementById("filterWeek");
const filterEquipment = document.getElementById("filterEquipment");
const filterMachine = document.getElementById("filterMachine");
const filterResponsible = document.getElementById("filterResponsible");
const filterStatus = document.getElementById("filterStatus");

[
  filterWeek,
  filterEquipment,
  filterMachine,
  filterResponsible,
  filterStatus
].forEach(el => {
  el.addEventListener("change", render);
});
/* ===============================
   ELEMENT & FORM MAP
================================ */
const tbody = document.getElementById("pmBody");
const modal = new bootstrap.Modal(document.getElementById("pmModal"));

const F = id => document.getElementById(id);
const f = {
  equipmentType: F("f_equipmentType"),
  machine: F("f_machine"),
  item: F("f_item"),
  criteria: F("f_criteria"),
  actionTask: F("f_actionTask"),
  time: F("f_time"),
  frequency: F("f_frequency"),
  annual: F("f_annual"),
  week: F("f_week"),
  month: F("f_month"),
  responsible: F("f_responsible"),
  status: F("f_status"),
  dateCompleted: F("f_dateCompleted"),
  weekCompleted: F("f_weekCompleted"),
  point: F("f_point")
};

let cache = [];
let editKey = null;

/* ===============================
   UTILITIES (AMAN FIREBASE)
================================ */
function normalizeKey(v) {
  return String(v || "")
    .trim()
    .replace(/[.#$/[\]]/g, "_");
}

function safeDate(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
}

function excelDateToISO(v) {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  if (typeof v === "number") {
    const utcDays = Math.floor(v - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return date.toISOString().slice(0, 10);
  }
  return "";
}



/* ===============================
   RENDER TABLE
================================ */
function render() {
  tbody.innerHTML = "";

  const fw = filterWeek.value;
  const fe = filterEquipment.value;
  const fm = filterMachine.value;
  const fr = filterResponsible.value;
  const fs = filterStatus.value;

  const filtered = cache.filter(r => {
    const w = Number(r.week);
    if (!r.week || isNaN(w) || w <= 0) return false;
    const liveStatus = r._liveStatus;



    if (fw && String(r.week) !== fw) return false;
    if (fe && r.equipmentType !== fe) return false;
    if (fm && r.machine !== fm) return false;
    if (fr && r.responsible !== fr) return false;
    if (fs && r._liveStatus !== fs) return false;


    return true;
  });

  filtered.forEach((r, i) => {
    
    const liveStatus = r._liveStatus;


    let statusBadge = "";

    if (liveStatus === "Done") {
      statusBadge = `<span class="badge bg-success">Done</span>`;
    }
    else if (liveStatus === "Delay") {
      statusBadge = `<span class="badge bg-danger">Delay</span>`;
    }
    else if (liveStatus === "Reject") {
      statusBadge = `<span class="badge bg-dark">Reject</span>`;
    }
    else if (liveStatus === "Open") {
      statusBadge = `<span class="badge bg-secondary">Open</span>`;
    }
    else {
      statusBadge = `<span class="badge bg-warning text-dark">Ongoing</span>`;
    }



    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${r.equipmentType || ""}</td>
      <td>${r.machine || ""}</td>
      <td>${r.item || ""}</td>
      <td>${r.criteria || ""}</td>
      <td>${r.actionTask || ""}</td>
      <td>${r.time || ""}</td>
      <td>${r.frequency || ""}</td>
      <td>${r.annualMaintenance || ""}</td>
      <td>${r.week || ""}</td>
      <td>${r.month || ""}</td>
      <td>${r.responsible || ""}</td>
      <td>${statusBadge}</td>
      <td>${safeDate(excelDateToISO(r.dateCompleted))}</td>
      <td>${r.weekCompleted || ""}</td>
      <td>${r.pointSummary || 0}</td>
      <td>
        <button class="btn btn-sm btn-warning edit" data-k="${r.key}">✏️</button>
        <button class="btn btn-sm btn-danger del" data-k="${r.key}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  attachRowActions();
}

function attachRowActions() {
  document.querySelectorAll(".edit").forEach(b => {
    b.onclick = () => {
      const r = cache.find(x => x.key === b.dataset.k);
      const autoStatus = computeStatus(r.week, r.dateCompleted, r.weekCompleted);

      if (!r) return;

      editKey = r.key;

      f.equipmentType.value = r.equipmentType || "";
      f.machine.value = r.machine || "";
      f.item.value = r.item || "";
      f.criteria.value = r.criteria || "";
      f.actionTask.value = r.actionTask || "";
      f.time.value = r.time || "";
      f.frequency.value = r.frequency || "";
      f.annual.value = r.annualMaintenance || "";
      f.week.value = r.week || "";
      f.month.value = r.month || "";
      f.responsible.value = r.responsible || "";
      f.status.value = r.status || "";
      f.dateCompleted.value =
      typeof r.dateCompleted === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(r.dateCompleted)
        ? r.dateCompleted
        : "";
      f.weekCompleted.value = r.weekCompleted || "";
      f.point.value = r.pointSummary || "";

      modal.show();
    };
  });

  document.querySelectorAll(".del").forEach(b => {
    b.onclick = async () => {
      if (confirm("Delete data ini?")) {
        await remove(ref(db, `preventive-maintenance/${b.dataset.k}`));
      }
    };
  });
}


/* ===============================
   ADD / SAVE
================================ */
document.getElementById("btnAdd").onclick = () => {
  editKey = null;
  Object.values(f).forEach(i => i.value = "");
  modal.show();
};

document.getElementById("btnSave").onclick = async () => {
  document.activeElement?.blur();

  const dateCompleted = safeDate(f.dateCompleted.value);
  const weekCompleted = dateCompleted ? getISOWeek(dateCompleted) : "";

  const statusAuto = computeStatus(
  f.week.value,
  dateCompleted,
  weekCompleted);

  const payload = {
    equipmentType: f.equipmentType.value || "",
    machine: f.machine.value || "",
    item: f.item.value || "",
    criteria: f.criteria.value || "",
    actionTask: f.actionTask.value || "",
    time: f.time.value || "",
    frequency: f.frequency.value || "",
    annualMaintenance: f.annual.value || "",
    week: f.week.value || "",
    month: f.month.value || "",
    responsible: f.responsible.value || "",

    status: statusAuto,   // 🔥 OTOMATIS

    dateCompleted,
    weekCompleted,

    pointSummary:
      String(f.week.value) === String(weekCompleted) ? 1 : 0,

    updatedAt: new Date().toISOString()
  };


  if (editKey) {
    await update(ref(db, `preventive-maintenance/${editKey}`), payload);
  } else {
    await push(ref(db, "preventive-maintenance"), {
      ...payload,
      createdAt: new Date().toISOString()
    });
  }

  modal.hide();
};


/* ===============================
   EXPORT EXCEL
================================ */
document.getElementById("btnExport").onclick = () => {
  const rows = cache.map(r => ({
    "Equipment Type": r.equipmentType,
    "Machine": r.machine,
    "Item": r.item,
    "Criteria": r.criteria,
    "Action": r.actionTask,
    "Time": r.time,
    "Frequency": r.frequency,
    "Annual Maintenance": r.annualMaintenance,
    "Week": r.week,
    "Month": r.month,
    "Responsible": r.responsible,
    "Status": r.status,
    "Date completed": r.dateCompleted,
    "Week completed": r.weekCompleted,
    "Point Summary": r.pointSummary
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "PM");
  XLSX.writeFile(wb, "preventive_maintenance.xlsx");
};

/* ===============================
   IMPORT = MASTER (FULL SYNC)
================================ */
document.getElementById("btnImport").onclick = () =>
  document.getElementById("importFile").click();

document.getElementById("importFile").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const t0 = performance.now();

  const data = new Uint8Array(await file.arrayBuffer());
  const wb = XLSX.read(data, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  /* ===============================
     EXCEL KOSONG → HAPUS SEMUA
  ============================== */
  if (rows.length === 0) {
    if (!confirm("Excel kosong. Semua data akan dihapus. Lanjutkan?")) return;
    await remove(ref(db, "preventive-maintenance"));
    alert("Semua data berhasil dihapus.");
    return;
  }

  /* ===============================
     HAPUS DATA LAMA SEKALI
  ============================== */
  await remove(ref(db, "preventive-maintenance"));

  /* ===============================
     BULK INSERT BARU
  ============================== */
  const bulk = {};

  rows.forEach((r, i) => {
    const dateCompleted = excelDateToISO(r["Date completed"]);
    const weekCompleted = dateCompleted ? getISOWeek(dateCompleted) : "";
    //console.log("ROW HEADER:", Object.keys(r));
    bulk[`pm_${i}`] = {
      equipmentType: String(r["Equipment Type"] || ""),
      machine: String(r["Machine"] || ""),
      item: String(r["Item"] || ""),
      criteria: String(r["Criteria"] || ""),
      actionTask: String(r["Action"] || ""),
      time: String(r["Time"] || ""),
      frequency: String(r["Frequency"] || ""),
      annualMaintenance: String(r["Annual Maintenance"] || ""),
      week: String(r["Week"] || ""),
      month: String(r["Month"] || ""),
      responsible: String(r["Responsible"] || ""),
      status: String(r["Status"] || "Ongoing"),

      dateCompleted,
      weekCompleted,

      pointSummary:
        String(r["Week"]) === String(weekCompleted) ? 1 : 0,

      updatedAt: new Date().toISOString()
    };
  });

  await update(ref(db, "preventive-maintenance"), bulk);

  const t1 = performance.now();
  alert(
    `Import ${rows.length} data selesai dalam ${((t1 - t0) / 1000).toFixed(2)} detik`
  );
};





/* ===============================
   CANCEL MODAL
================================ */
document.getElementById("btnCancel").onclick = () => {
  document.activeElement?.blur();
  modal.hide();
};


function getISOWeek(dateStr) {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  if (isNaN(date)) return "";

  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function populateFilters() {
  const weeks = new Set();
  const equipments = new Set();
  const machines = new Set();
  const responsibles = new Set();
  const statuses = new Set();

  cache.forEach(r => {
    if (r.week !== undefined && r.week !== "") {
      const w = Number(r.week);
      if (!isNaN(w)) weeks.add(w);
    }
    if (r.equipmentType) equipments.add(r.equipmentType);
    if (r.machine) machines.add(r.machine);
    if (r.responsible) responsibles.add(r.responsible);
    if (r._liveStatus) statuses.add(r._liveStatus);

  });

  fillSelect(filterWeek, weeks);
  fillSelect(filterEquipment, equipments);
  fillSelect(filterMachine, machines);
  fillSelect(filterResponsible, responsibles);

  // status → sudah ada default option, hanya tambahkan jika perlu
  fillSelect(filterStatus, statuses);

}

function fillSelect(select, values, keepDefault = false) {
  const current = select.value;

  // RESET TOTAL
  select.innerHTML = `<option value="">All</option>`;

  const sorted = [...values].sort((a, b) => {
    if (typeof a === "number" && typeof b === "number") {
      return a - b;
    }
    return String(a).localeCompare(String(b));
  });

  sorted.forEach(v => {
    select.innerHTML += `<option value="${v}">${v}</option>`;
  });

  select.value = current;
}


function getCurrentISOWeek() {
  const today = new Date();
  const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function isValidISODate(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function computeStatus(week, dateCompleted, weekCompleted) {

  const w  = Number(week);
  const wc = Number(weekCompleted);
  const currentWeek = getCurrentISOWeek();

  if (isNaN(w) || w <= 0) return "";

  const hasDateCompleted =
    typeof dateCompleted === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateCompleted);

  /* =========================
     1️⃣ DATE COMPLETED SUDAH ADA
  ========================= */
  if (hasDateCompleted) {

    // ✅ DONE → complete di minggu yang benar
    if (!isNaN(wc) && wc === w) {
      return "Done";
    }

    // ❌ REJECT → complete tapi beda minggu
    return "Reject";
  }

  /* =========================
     2️⃣ DATE COMPLETED BELUM ADA
  ========================= */

  // ⏱ DELAY → belum complete & sudah lewat minggu
  if (currentWeek > w) {
    return "Delay";
  }

  // 🔄 ONGOING → minggu ini & belum complete
  if (currentWeek === w) {
    return "Ongoing";
  }

  // 📂 OPEN → minggu depan / future PM
  return "Open";
}




onValue(ref(db, "preventive-maintenance"), snap => {
  cache = [];

  // ======================
  // PM GLOBAL COUNTER
  // ======================
  let pmDone = 0;
  let pmOngoing = 0;
  let pmOverdue = 0;
  let pmReject = 0;
  let pmOpen = 0;

  cache = [];

  if (snap.exists()) {
    Object.entries(snap.val()).forEach(([k, v]) => {

      const status = computeStatus(
        v.week,
        v.dateCompleted,
        v.weekCompleted
      );

      if (!status) return;

      cache.push({ key: k, ...v, _liveStatus: status });

      switch (status) {
        case "Done":    pmDone++;    break;
        case "Ongoing": pmOngoing++; break;
        case "Delay":   pmOverdue++; break;
        case "Reject":  pmReject++;  break;
        case "Open":    pmOpen++;    break;
      }
    });
  }


  // ======================
  // UPDATE DASHBOARD CARD
  // ======================
  const elDone     = document.getElementById("pmDoneCount");
  const elOngoing  = document.getElementById("pmOngoingCount");
  const elOverdue  = document.getElementById("pmOverdueCount");
  const elReject   = document.getElementById("pmRejectCount");

  if (elDone)    elDone.textContent = pmDone;
  if (elOngoing) elOngoing.textContent = pmOngoing;
  if (elOverdue) elOverdue.textContent = pmOverdue;
  if (elReject)  elReject.textContent = pmReject;

  // ======================
  // EXISTING FLOW (AMAN)
  // ======================
  populateFilters();

  const currentWeek = getCurrentISOWeek();
  if ([...filterWeek.options].some(o => o.value == currentWeek)) {
    filterWeek.value = currentWeek;
  }

  render();

  requestAnimationFrame(renderPerformanceCharts);
});

const tooltip = document.getElementById("ps-tooltip");

function showPmTooltip(e, statusType) {
  const map = {};

  cache.forEach(r => {
    const w = Number(r.week);
    if (!r.week || isNaN(w) || w <= 0) return;

    const status = computeStatus(r.week, r.dateCompleted, r.weekCompleted);
    if (status !== statusType) return;

    const name = r.responsible || "Unknown";
    map[name] = (map[name] || 0) + 1;
  });

  let html = `<h6>${statusType} by Responsible</h6><ul>`;
  Object.entries(map)
    .sort((a,b) => b[1] - a[1])
    .forEach(([name, total]) => {
      html += `<li><span>${name}</span><strong>${total}</strong></li>`;
    });

  html += `</ul>`;

  tooltip.innerHTML = html;
  tooltip.style.left = e.clientX + 15 + "px";
  tooltip.style.top  = e.clientY + 15 + "px";
  tooltip.style.opacity = 1;
}

function hideTooltip() {
  tooltip.style.opacity = 0;
  tooltip.style.display = "none";
}


const bindTooltip = (id, status) => {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener("mousemove", e => showPmTooltip(e, status));
  el.addEventListener("mouseleave", hideTooltip);
};

bindTooltip("cardPmOverdue", "Delay");
bindTooltip("cardPmOngoing", "Ongoing");
bindTooltip("cardPmDone", "Done");
bindTooltip("cardPmReject", "Reject");




function renderPerformanceCharts() {

  const currentWeek = getCurrentISOWeek();

  /* ================= TECHNICIAN ================= */
  const techDiv = document.getElementById("techPerformanceChart");
  techDiv.innerHTML = "";

  const techMap = {};

  cache.forEach(r => {
    if (!r.responsible) return;

    const w = Number(r.week);
    if (isNaN(w) || w <= 0) return;

    // 🔥 HANYA TASK YANG SUDAH JATUH TEMPO
    if (w > currentWeek) return;

    if (!techMap[r.responsible]) {
      techMap[r.responsible] = {
        total: 0,
        done: 0,
        ongoing: 0,
        delay: 0,
        reject: 0
      };
    }

    techMap[r.responsible].total++;

    switch (r._liveStatus) {
      case "Done":    techMap[r.responsible].done++;    break;
      case "Ongoing": techMap[r.responsible].ongoing++; break;
      case "Delay":   techMap[r.responsible].delay++;   break;
      case "Reject":  techMap[r.responsible].reject++;  break;
    }
  });

  //Object.entries(techMap).forEach(([name, v]) => {
  Object.entries(techMap)
  .sort((a, b) => b[1].done - a[1].done)   // 🔥 SORT DONE TERBANYAK
  .forEach(([name, v]) => {

    const pct = v.total
      ? Math.round((v.done / v.total) * 100)
      : 0;

    const donePct    = (v.done / v.total) * 100;
    const ongoingPct = (v.ongoing / v.total) * 100;
    const delayPct   = (v.delay / v.total) * 100;
    const rejectPct  = (v.reject / v.total) * 100;

    techDiv.innerHTML += `
    <div class="tech-row">
      <div class="tech-name">${name}</div>

      <div class="tech-bar-bg">

        <div class="tech-bar done"
          data-name="${name}"
          data-status="Done"
          style="width:${donePct}%"></div>

        <div class="tech-bar ongoing"
          data-name="${name}"
          data-status="Ongoing"
          style="width:${ongoingPct}%"></div>

        <div class="tech-bar delay"
          data-name="${name}"
          data-status="Delay"
          style="width:${delayPct}%"></div>

        <div class="tech-bar reject"
          data-name="${name}"
          data-status="Reject"
          style="width:${rejectPct}%"></div>

      </div>

      <div class="tech-percent">${pct}%</div>
    </div>
    `;

  });

    /* ================= MONTH ================= */
  const monthDiv = document.getElementById("executionMonthChart");
  monthDiv.innerHTML = `<div class="month-chart"></div>`;
  const chart = monthDiv.querySelector(".month-chart");


  const monthOrder = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  // 🔥 INIT SEMUA BULAN = 0
  const monthMap = {};
  monthOrder.forEach(m => {
    monthMap[m] = { total: 0, done: 0 };
  });

  // 🔥 HITUNG DATA YANG SUDAH JATUH TEMPO
  cache.forEach(r => {
    if (!r.month) return;

    const w = Number(r.week);
    if (isNaN(w) || w <= 0) return;

    // hanya sampai minggu sekarang
    if (w > currentWeek) return;

    if (!monthMap[r.month]) return;

    monthMap[r.month].total++;

    if (r._liveStatus === "Done") {
      monthMap[r.month].done++;
    }
  });

  // 🔥 RENDER 12 BULAN TANPA SYARAT
  monthOrder.forEach(m => {
    const v = monthMap[m];
    const pct = v.total
      ? Math.round((v.done / v.total) * 100)
      : 0;

    chart.innerHTML += `
      <div class="month-bar">
        <div class="month-value">${pct}%</div>
        <div class="month-track">
          <div class="month-fill" style="height:${pct}%"></div>
        </div>
        <div class="month-label">${m}</div>
      </div>
    `;
  });
  setTimeout(() => {
    document.querySelectorAll(".tech-bar").forEach(bar => {

      bar.addEventListener("mousemove", e => {
        const name = bar.dataset.name;
        const status = bar.dataset.status;
        showTechTooltip(e, name, status);
      });

      bar.addEventListener("mouseleave", hideTooltip);
    });
  }, 0);

}


function showTechTooltip(e, name, status) {

  let total = 0;

  cache.forEach(r => {
    if (r.responsible !== name) return;
    if (r._liveStatus !== status) return;
    total++;
  });

  tooltip.innerHTML = `
    <h6>${name}</h6>
    <div>${status} PM : <strong>${total}</strong></div>
  `;

  tooltip.style.display = "block";   // WAJIB
  tooltip.style.left = e.clientX + 15 + "px";
  tooltip.style.top  = e.clientY + 15 + "px";
  tooltip.style.opacity = 1;
}

