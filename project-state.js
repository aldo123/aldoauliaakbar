// ================================
// PROJECT STATE JS – FIXED VERSION
// ================================
import { db, ref, get } from "./firebase-config.js";

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
  let total = 0, completed = 0;

  const aSnap = await get(ref(db, "activities"));
  if (!aSnap.exists()) return { total:0, completed:0, percent:0 };

  const acts = aSnap.val();

  Object.values(acts).forEach(p => {
    Object.values(p).forEach(a => {
      total++;
      const sop = getSOP(a);
      if (sop.plan && sop.actual) completed++;
    });
  });

  return {
    total, completed,
    percent: total ? (completed / total) * 100 : 0
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
        x: { stacked:true, ticks:{ color:"#ffffff" } },
        y: { stacked:true, ticks:{ color:"#ffffff" } }
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
function drawDonutChart(o){
  const ctx = document.getElementById("chartDonut");
  if (charts.donut) charts.donut.destroy();

  const percent = Number(o.percent.toFixed(2));

  charts.donut = new Chart(ctx,{
    type:"doughnut",
    data:{
      labels:["Completed","Remaining"],
      datasets:[
        {
          data:[o.completed, o.total - o.completed],
          backgroundColor:["#2ecc71","#75c4fdff"],
          borderWidth:2,
          borderColor:"#083c1f"
        }
      ]
    },
    options:{
      cutout:"68%",
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{ display:false }
      }
    }
  });

  document.getElementById("donutCenterLabel").textContent = percent + "%";
}
