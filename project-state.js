// ================================
// PROJECT STATE JS – FIXED VERSION
// ================================
import { db, onValue, ref, get } from "./firebase-config.js";

// Load Chart.js
const script = document.createElement("script");
script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
script.defer = true;
document.head.appendChild(script);
script.onload = () => initProjectState();

// =====================================
// Phase definitions
// =====================================
const phases = [
  "req","design","quotation","io","prpo","d3","cnc",
  "assembly","eta","debugging","aging","validation",
  "trial","pr","sop"
];

// Normalizer
function val(v) {
  return (v === undefined || v === null || v === "" || v === "--" || v === "—") ? "" : v;
}

function getSOP(a) {
  return {
    plan: val(a.plan_sop || a.plan_SOP),
    actual: val(a.actual_sop || a.actual_SOP)
  };
}

function toDateOnly(d){
  const dt = new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

let charts = { engineer:null, type:null, donut:null };

// MAIN INIT
async function initProjectState() {
  try {
    const [eng, typ, overall] = await Promise.all([
      computeEngineerStats(),
      computeTypeStats(),
      computeOverallTotals()
    ]);

    drawEngineerChart(eng);
    drawTypeChart(typ);
    drawDonutChart(overall);

    console.log("Project State Updated");
  } catch (e) {
    console.error("INIT ERROR:", e);
  }
}

// ========================================================
// ENGINEER STATS
// ========================================================
async function computeEngineerStats() {
  let result = {};
  const pSnap = await get(ref(db, "projects"));
  const aSnap = await get(ref(db, "activities"));

  if (!pSnap.exists() || !aSnap.exists()) return result;

  const projects = pSnap.val();
  const acts = aSnap.val();

  Object.entries(projects).forEach(([pid, p]) => {
    const actList = acts[pid] ? Object.entries(acts[pid]) : [];

    actList.forEach(([aid, a]) => {
      const owner = val(a.owner) || val(p.ee) || "UNKNOWN";
      if (!result[owner]) {
        result[owner] = {
          completed: 0, delay: 0, progress: 0,
          delayList: [], progressList: []
        };
      }

      const sop = getSOP(a);
      const isCompleted = sop.plan && sop.actual;

      let isDelay = false;
      let isProgress = false;

      const today = toDateOnly(new Date());

      for (const key of phases) {
        const pl = val(a[`plan_${key}`]);
        const ac = val(a[`actual_${key}`]);
        if (!pl) continue;
        const pd = toDateOnly(pl);

        if (!ac) {
          if (pd < today) isDelay = true;
          else isProgress = true;
        }
      }

      if (isCompleted) {
        result[owner].completed++;
      } else if (isDelay) {
        result[owner].delay++;
        result[owner].delayList.push(a.title || a.activity || aid);
      } else {
        result[owner].progress++;
        result[owner].progressList.push(a.title || a.activity || aid);
      }
    });
  });

  return result;
}

// ========================================================
// TYPE STATS
// ========================================================
async function computeTypeStats() {
  let result = {};
  const pSnap = await get(ref(db, "projects"));
  const aSnap = await get(ref(db, "activities"));

  if (!pSnap.exists() || !aSnap.exists()) return result;

  const projects = pSnap.val();
  const acts = aSnap.val();

  Object.entries(projects).forEach(([pid, p]) => {
    const type = val(p.type) || "UNKNOWN";
    if (!result[type]) {
      result[type] = {
        completed: 0, delay: 0, progress: 0,
        delayList: [], progressList: []
      };
    }

    const actList = acts[pid] ? Object.entries(acts[pid]) : [];

    actList.forEach(([aid, a]) => {
      const sop = getSOP(a);
      const isCompleted = sop.plan && sop.actual;

      let isDelay = false;
      let isProgress = false;

      const today = toDateOnly(new Date());

      for (const key of phases) {
        const pl = val(a[`plan_${key}`]);
        const ac = val(a[`actual_${key}`]);
        if (!pl) continue;
        const pd = toDateOnly(pl);

        if (!ac) {
          if (pd < today) isDelay = true;
          else isProgress = true;
        }
      }

      if (isCompleted) {
        result[type].completed++;
      } else if (isDelay) {
        result[type].delay++;
        result[type].delayList.push(a.title || a.activity || aid);
      } else {
        result[type].progress++;
        result[type].progressList.push(a.title || a.activity || aid);
      }
    });
  });

  return result;
}

// ========================================================
// OVERALL DONUT
// ========================================================
async function computeOverallTotals() {

  // 🔥 gunakan hasil engineerStats agar konsisten
  const eng = await computeEngineerStats();

  let totalTask = 0;
  let completedTask = 0;

  Object.values(eng).forEach(e => {
    totalTask += e.completed + e.delay + e.progress;
    completedTask += e.completed;
  });

  return {
    totalTask,
    completedTask,
    percent: totalTask ? (completedTask / totalTask) * 100 : 0
  };
}



// ========================================================
// DRAW ENGINEER CHART
// ========================================================
function drawEngineerChart(stats) {
  const labels = Object.keys(stats);
  const completed = labels.map(l => stats[l].completed);
  const delay = labels.map(l => stats[l].delay);
  const progress = labels.map(l => stats[l].progress);

  const tooltipDelay = labels.map(l => stats[l].delayList);
  const tooltipProgress = labels.map(l => stats[l].progressList);

  const ctx = document.getElementById("chartEngineer");
  if (charts.engineer) charts.engineer.destroy();

  charts.engineer = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label:"Completed", data:completed, backgroundColor:"#2ecc71", stack:"s1" },
        { label:"Delay", data:delay, backgroundColor:"#e74c3c", stack:"s1", activityList:tooltipDelay },
        { label:"In Progress", data:progress, backgroundColor:"#f1c40f", stack:"s1", activityList:tooltipProgress }
      ]
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      devicePixelRatio: window.devicePixelRatio || 1, 
      responsive: true,

      plugins: {
        legend: { labels: { color:"#ffffff" }},

        tooltip: {
          bodyColor: "#fff",
          callbacks: {
            label: function (ctx) {
            const ds = ctx.dataset;
            const idx = ctx.dataIndex;

            // Completed: hanya tampil angka
            if (ds.label === "Completed") {
                return [`${ds.label}: ${ds.data[idx]}`];
            }

            // Delay & Progress → multiline
            let lines = [];
            lines.push(`${ds.label}: ${ds.data[idx]}`);

            const arr = ds.activityList[idx];
            if (arr && arr.length > 0) {
                lines.push("Detail Activity:");
                arr.forEach(a => lines.push(`• ${a}`));
            }

            return lines;   // ⬅⬅ RETURN ARRAY → MULTILINE TOOLTIP
            }
          }
        },

        datalabels: {
          color: "#ffffff",
          anchor: "center",
          align: "center",
          formatter: v => (v > 0 ? v : "")
        }
      },

      scales: {
      x: {
        stacked: true,
        ticks: {
          color: "#ffffff",
          font: {
            size: 12,
            weight: "600",
            family: "Segoe UI, Arial, sans-serif"
          }
        }
      },
      y: {
        stacked: true,
        ticks: {
          color: "#ffffff",
          font: {
            size: 13,
            weight: "600",
            family: "Segoe UI, Arial, sans-serif"
          }
        }
      }
    }

    }
  });
}

// ========================================================
// DRAW TYPE CHART
// ========================================================
function drawTypeChart(stats) {
  const labels = Object.keys(stats);
  const completed = labels.map(l => stats[l].completed);
  const delay = labels.map(l => stats[l].delay);
  const progress = labels.map(l => stats[l].progress);

  const tooltipDelay = labels.map(l => stats[l].delayList);
  const tooltipProgress = labels.map(l => stats[l].progressList);

  const ctx = document.getElementById("chartType");
  if (charts.type) charts.type.destroy();

  charts.type = new Chart(ctx, {
    type:"bar",
    data:{
      labels,
      datasets:[
        { label:"Completed", data:completed, backgroundColor:"#2ecc71" },
        { label:"Delay", data:delay, backgroundColor:"#e74c3c", activityList:tooltipDelay },
        { label:"In Progress", data:progress, backgroundColor:"#f1c40f", activityList:tooltipProgress }
      ]
    },
    options:{
      maintainAspectRatio:false,
      responsive:true,
      devicePixelRatio: window.devicePixelRatio || 1, // 🔥 TAMBAH INI
      plugins:{
        legend:{ labels:{ color:"#ffffff" }},
        tooltip:{
          bodyColor:"#fff",
          callbacks:{
            label: function (ctx) {
            const ds = ctx.dataset;
            const idx = ctx.dataIndex;

            if (ds.label === "Completed") {
                return [`${ds.label}: ${ds.data[idx]}`];
            }

            let lines = [];
            lines.push(`${ds.label}: ${ds.data[idx]}`);

            const arr = ds.activityList[idx];
            if (arr && arr.length > 0) {
                lines.push("Detail Activity:");
                arr.forEach(a => lines.push(`• ${a}`));
            }

            return lines;   // ⬅⬅ multiline
            }
          }
        }
      },
      scales:{
        x:{ ticks:{color:"#ffffff"} },
        y:{ ticks:{color:"#ffffff"} }
      }
    }
  });
}

// ========================================================
// DONUT CHART
// ========================================================
function drawDonutChart(o) {
  const ctx = document.getElementById("chartDonut");
  if (charts.donut) charts.donut.destroy();

  const percent = Number(o.percent.toFixed(2));

  charts.donut = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Completed", "Remaining"],
      datasets: [
        {
          data: [o.completedTask, o.totalTask - o.completedTask],
          backgroundColor: ["#2ecc71", "rgba(170, 253, 179, 0.77)"],
          borderWidth: 2,
          borderColor: "#154717ff"
        }
      ]
    },
    options: {
      cutout: "68%",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      }
    }
  });

  // ================================
  // UPDATE CENTER + UNDER TEXT
  // ================================
  document.getElementById("donutCenterLabel").textContent = percent + "%";

  // Tambahan: jumlah completed task / total task
  const infoBox = document.getElementById("donutTaskInfo");
  if (infoBox) {
    infoBox.textContent = `${o.completedTask} Completed / ${o.totalTask} Total Task`;
  }
}

function getStatus(nextDate) {
  if (!nextDate || nextDate === "--") return "OK";

  const due = new Date(nextDate);
  if (isNaN(due.getTime())) return "OK";

  const today = new Date();
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return "OVERDUE";
  if (diff <= 30) return "DUE";
  return "OK";
}

function renderCalibrationTable(data) {
  const tbody = document.getElementById("calibrationBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  data.forEach(e => {

    // 🔥 FILTER ACTION LIST
    if (e.status === "OK") return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.equipmentNo}</td>
      <td>${e.group}</td>
      <td>${e.serialNo}</td>
      <td>${e.lastInspection}</td>
      <td>${e.nextCalibration}</td>
      <td>
        <span class="status-badge status-${e.status.toLowerCase()}">
          ${e.status}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}


onValue(ref(db, "equipment"), snap => {
  let ok = 0, due = 0, overdue = 0;
  const rows = [];

  if (snap.exists()) {
    Object.entries(snap.val()).forEach(([key, e]) => {

      if ((e.actionStatus || "").toUpperCase() !== "APPROVE") return;

      const status = getStatus(e.nextCalibration);

      if (status === "OK") ok++;
      if (status === "DUE") due++;
      if (status === "OVERDUE") overdue++;

      rows.push({
        key,
        equipmentNo: e.equipmentNo || "-",
        group: e.group || "-",
        serialNo: e.serialNo || "-",
        lastInspection: e.lastInspection || "-",
        nextCalibration: e.nextCalibration || "-",
        status
      });
    });
  }

  // SUMMARY
  document.getElementById("okCount").textContent = ok;
  document.getElementById("dueCount").textContent = due;
  document.getElementById("overdueCount").textContent = overdue;

  // TABLE
  renderCalibrationTable(rows);
});


onValue(ref(db, "parts"), snap => {
  const total = snap.exists() ? Object.keys(snap.val()).length : 0;
  document.getElementById("totalSkuValue").textContent = total;
});

onValue(ref(db, "storage"), snap => {
  const totalItem = snap.exists()
    ? Object.keys(snap.val()).length
    : 0;

  document.getElementById("totalSkuValue2").textContent = totalItem;
});

onValue(ref(db, "storage"), snap => {
  let low = 0;
  if (snap.exists()) {
    Object.values(snap.val()).forEach(s => {
      if (Number(s.stock) < Number(s.minStock)) low++;
    });
  }
  document.getElementById("lowStockCount").textContent = low;
});

onValue(ref(db, "transactions"), snap => {
  let incoming = 0, outgoing = 0;
  const today = new Date().toDateString();

  if (snap.exists()) {
    Object.values(snap.val()).forEach(t => {
      if (new Date(t.time).toDateString() !== today) return;
      if (t.type === "IN") incoming += Number(t.qty || 0);
      if (t.type === "OUT") outgoing += Number(t.qty || 0);
    });
  }

  document.getElementById("incomingValue").textContent = incoming;
  document.getElementById("outgoingValue").textContent = outgoing;
});

onValue(ref(db, "transactions"), snap => {
  const tbody = document.getElementById("logBody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!snap.exists()) return;

  Object.values(snap.val())
    .sort((a,b)=>new Date(b.time)-new Date(a.time))
    .forEach((t,i)=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i+1}</td>
        <td>${new Date(t.time).toLocaleString()}</td>
        <td>${t.partName || "-"}</td>
        <td class="${t.type==="IN"?"text-success":"text-danger"}">${t.type}</td>
        <td>${t.qty}</td>
        <td>${t.pic || "-"}</td>
        <td>${t.remark || "-"}</td>
      `;
      tbody.appendChild(tr);
    });
});


/* ===============================
   REQUEST STATUS COUNTER
================================ */

// ambil tanggal dari OA-PR#
function getDateFromOaPr(oaPr) {
  const match = String(oaPr || "").match(/PR(\d{8})/);
  if (!match) return null;

  const y = match[1].slice(0, 4);
  const m = match[1].slice(4, 6);
  const d = match[1].slice(6, 8);
  return new Date(`${y}-${m}-${d}`);
}

// status final (SAMA dgn request-list.js)
function computeRequestStatus(r) {
  const prOk = String(r.prNo || "").trim() !== "";
  const poOk = String(r.po || "").trim() !== "";
  if (prOk && poOk) return "Done";

  if (String(r.status || "").toLowerCase() === "cancelled") {
    return "Cancelled";
  }

  const prDate = getDateFromOaPr(r.oaPr);
  if (prDate) {
    const limit = new Date(prDate);
    limit.setDate(limit.getDate() + 10);
    if (new Date() > limit) return "Delay";
  }

  return "Ongoing";
}

/* ===============================
   REALTIME FIREBASE LISTENER
================================ */
onValue(ref(db, "request-list"), snap => {
  let delay = 0;
  let ongoing = 0;

  if (snap.exists()) {
    Object.values(snap.val()).forEach(r => {
      const status = computeRequestStatus(r);
      if (status === "Delay") delay++;
      else if (status === "Ongoing") ongoing++;
    });
  }

  // update UI
  const elDelay = document.getElementById("prOverdueCount");
  const elOngoing = document.getElementById("prOngoingCount");

  if (elDelay) elDelay.textContent = delay;
  if (elOngoing) elOngoing.textContent = ongoing;
});


//teknisi performance

function getCurrentISOWeek() {
  const today = new Date();
  const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function computeStatus(week, dateCompleted, weekCompleted) {
  const w = Number(week);
  const wc = Number(weekCompleted);
  const currentWeek = getCurrentISOWeek();

  const hasDate =
    typeof dateCompleted === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateCompleted);

  if (hasDate && !isNaN(w) && !isNaN(wc)) {
    return wc === w ? "Done" : "Reject";
  }

  if (!isNaN(w) && currentWeek > w) return "Delay";
  return "Ongoing";
}

onValue(ref(db, "preventive-maintenance"), snap => {
  const container = document.getElementById("techPerformanceChart");
  if (!container) return;

  container.innerHTML = "";

  // 🔥 GLOBAL COUNTER
  let pmDone = 0;
  let pmOngoing = 0;
  let pmDelay = 0;
  let pmReject = 0;

  if (!snap.exists()) return;

  const map = {};

  Object.values(snap.val()).forEach(r => {
    if (!r.responsible) return;

    // ======================
    // HITUNG STATUS
    // ======================
    const st = computeStatus(r.week, r.dateCompleted, r.weekCompleted);

    if (st === "Done") pmDone++;
    else if (st === "Reject") pmReject++;
    else if (st === "Delay") pmDelay++;
    else pmOngoing++;

    // ======================
    // TECHNICIAN PERFORMANCE
    // ======================
    if (!map[r.responsible]) {
      map[r.responsible] = { total:0, done:0, ongoing:0, delay:0, reject:0 };
    }

    map[r.responsible].total++;

    if (st === "Done") map[r.responsible].done++;
    else if (st === "Reject") map[r.responsible].reject++;
    else if (st === "Delay") map[r.responsible].delay++;
    else map[r.responsible].ongoing++;
  });

  // ======================
  // UPDATE PM SUMMARY CARDS
  // ======================
  const elDone = document.getElementById("pmDoneCount");
  const elOngoing = document.getElementById("pmOngoingCount");
  const elOverdue = document.getElementById("pmOverdueCount");
  const elReject = document.getElementById("pmRejectCount");

  if (elDone) elDone.textContent = pmDone;
  if (elOngoing) elOngoing.textContent = pmOngoing;
  if (elOverdue) elOverdue.textContent = pmDelay;
  if (elReject) elReject.textContent = pmReject;

  // ======================
  // RENDER TECH PERFORMANCE
  // ======================
  Object.entries(map).forEach(([name,v]) => {
    const total = v.total || 1;
    const pct = Math.round(v.done / total * 100);

    container.innerHTML += `
      <div class="tech-row">
        <div class="tech-name">${name}</div>
        <div class="tech-bar-bg">
          <div class="tech-bar done" style="width:${v.done/total*100}%"></div>
          <div class="tech-bar ongoing" style="width:${v.ongoing/total*100}%"></div>
          <div class="tech-bar delay" style="width:${v.delay/total*100}%"></div>
          <div class="tech-bar reject" style="width:${v.reject/total*100}%"></div>
        </div>
        <div class="tech-percent">${pct}%</div>
      </div>
    `;
  });
});
