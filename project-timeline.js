import { db, ref, get } from "./firebase-config.js";

/* =========================
   PHASE ORDER (FINAL)
========================= */
const phases = [
  "req","design","quotation","io","prpo","d3",
  "cnc","assembly","eta","debugging","aging",
  "validation","trial","pr","sop"
];

/* =========================
   DATE UTIL
========================= */
function parseDateSafe(d) {
  if (!d || d === "--") return null;

  // support DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    const [day, month, year] = d.split("/");
    return new Date(`${year}-${month}-${day}`);
  }

  // fallback ISO
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}


function minusDays(date, days) {
  const d = parseDateSafe(date);
  if (!d) return null;
  d.setDate(d.getDate() - days);
  return d;
}

/* =========================
   GANTT TASK BUILDER
========================= */
function buildGanttTask({ id, name, start, end, progress = 0, dependencies = "" }) {
  const s = parseDateSafe(start);
  const e = parseDateSafe(end);

  if (!s || !e) return null;
  if (s > e) return null;

  return {
    id,
    name,
    start: s.toISOString().slice(0,10),
    end: e.toISOString().slice(0,10),
    progress,
    dependencies
  };
}

/* =========================
   LOAD & RENDER
========================= */
async function loadGantt() {

  const [pSnap, aSnap] = await Promise.all([
    get(ref(db, "projects")),
    get(ref(db, "activities"))
  ]);

  if (!pSnap.exists()) return;

  const projects = pSnap.val();
  const activities = aSnap.exists() ? aSnap.val() : {};

  const tasks = [];

  Object.entries(projects).forEach(([pid, p]) => {

    /* ===== PROJECT BAR ===== */
    const projectTask = buildGanttTask({
      id: pid,
      name: p.projectName || pid,
      start: p.startDate,
      end: p.targetDate,
      progress: 0
    });

    if (!projectTask) return;
    tasks.push(projectTask);

    /* ===== PHASE TASKS ===== */
    const acts = activities[pid] || {};

    Object.entries(acts).forEach(([aid, a]) => {

      phases.forEach((ph, idx) => {

        let startDate;

        // Requirement = 1 week before plan_req
        if (idx === 0) {
          startDate = minusDays(a[`plan_${ph}`], 7);
        } else {
          const prev = phases[idx - 1];
          startDate = a[`plan_${prev}`];
        }

        const endDate = a[`actual_${ph}`] || a[`plan_${ph}`];

        // 🔥 SKIP IF NO DATE
        if (!startDate || !endDate) return;

        const task = buildGanttTask({
          id: `${pid}-${aid}-${ph}`,
          name: `${a.activity || aid} · ${ph.toUpperCase()}`,
          start: startDate,
          end: endDate,
          progress: a[`actual_${ph}`] ? 100 : 50,
          dependencies:
            idx === 0
              ? pid
              : `${pid}-${aid}-${phases[idx - 1]}`
        });

        if (task) tasks.push(task);
      });
    });
  });

  if (!tasks.length) return;

  new Gantt("#gantt", tasks, {
    view_mode: "Week",
    bar_height: 22,
    padding: 50,
    date_format: "YYYY-MM-DD"
  });
}

loadGantt();
