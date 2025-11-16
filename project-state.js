import { db, ref, get } from "./firebase-config.js";

// Load Chart.js
const chartScript = document.createElement("script");
chartScript.src = "https://cdn.jsdelivr.net/npm/chart.js";
document.head.appendChild(chartScript);
chartScript.onload = () => initProjectState();

// Normalize empty value
function val(v) {
    return (v === undefined || v === null || v === "" || v === "--") ? "" : v;
}

// SOP getter
function getSOP(a) {
    return {
        plan: val(a.plan_sop),
        actual: val(a.actual_sop)
    };
}

// PHASES
const phases = [
    "req","design","quotation","io","prpo","d3","cnc",
    "assembly","eta","debugging","aging","validation",
    "trial","pr","sop"
];

async function initProjectState() {
    const engineerStats = await computeEngineerStats();
    const typeStats = await computeTypeStats();

    drawEngineerChart(engineerStats);
    drawTypeChart(typeStats);
}

// ======================================================
// ENGINEER STATS
// ======================================================
async function computeEngineerStats() {
    let result = {};

    const projectsSnap = await get(ref(db, "projects"));
    const activitiesSnap = await get(ref(db, "activities"));

    if (!projectsSnap.exists() || !activitiesSnap.exists()) return result;

    const projects = projectsSnap.val();
    const activities = activitiesSnap.val();

    Object.entries(projects).forEach(([pid, p]) => {
        const actList = activities[pid] ? Object.entries(activities[pid]).map(([id,obj]) => ({id, ...obj})) : [];

        actList.forEach(a => {
            const owner = a.owner || p.ee || "UNKNOWN";
            if (!result[owner]) result[owner] = { completed: 0, delay: 0, progress: 0 };

            const sop = getSOP(a);

            // ===============================
            // COMPLETED
            // ===============================
            const isCompleted = sop.plan && sop.actual;

            // ===============================
            // DELAY
            // ===============================
            let isDelay = false;
            const today = new Date();

            phases.forEach(key => {
                const pl = val(a[`plan_${key}`]);
                const ac = val(a[`actual_${key}`]);

                if (pl) {
                    const pd = new Date(pl);

                    if (!ac && pd < today) isDelay = true;
                    if (ac && new Date(ac) > pd) isDelay = true;
                }
            });

            // FINAL STATUS
            if (isCompleted) result[owner].completed++;
            else if (isDelay) result[owner].delay++;
            else result[owner].progress++;
        });
    });

    return result;
}

// ======================================================
// TYPE STATS
// ======================================================
async function computeTypeStats() {
    let result = {};

    const projectsSnap = await get(ref(db, "projects"));
    const activitiesSnap = await get(ref(db, "activities"));

    if (!projectsSnap.exists() || !activitiesSnap.exists()) return result;

    const projects = projectsSnap.val();
    const activities = activitiesSnap.val();

    Object.entries(projects).forEach(([pid, p]) => {
        const type = p.type || "UNKNOWN";
        if (!result[type]) result[type] = { completed: 0, delay: 0, progress: 0 };

        const actList = activities[pid] ? Object.entries(activities[pid]).map(([id,obj]) => ({id, ...obj})) : [];

        actList.forEach(a => {
            const sop = getSOP(a);

            const isCompleted = sop.plan && sop.actual;

            // DELAY
            let isDelay = false;
            const today = new Date();

            phases.forEach(key => {
                const pl = val(a[`plan_${key}`]);
                const ac = val(a[`actual_${key}`]);

                if (pl) {
                    const pd = new Date(pl);

                    if (!ac && pd < today) isDelay = true;
                    if (ac && new Date(ac) > pd) isDelay = true;
                }
            });

            if (isCompleted) result[type].completed++;
            else if (isDelay) result[type].delay++;
            else result[type].progress++;
        });
    });

    return result;
}

// ======================================================
// CHARTS
// ======================================================
function drawEngineerChart(stats) {
    new Chart(document.getElementById("chartEngineer"), {
        type: "bar",
        data: {
            labels: Object.keys(stats),
            datasets: [
                { label: "Completed", data: Object.values(stats).map(v => v.completed), backgroundColor: "#2ecc71" },
                { label: "Delay", data: Object.values(stats).map(v => v.delay), backgroundColor: "#e74c3c" },
                { label: "In Progress", data: Object.values(stats).map(v => v.progress), backgroundColor: "#f1c40f" }
            ]
        },
        options: { indexAxis: "y" }
    });
}

function drawTypeChart(stats) {
    new Chart(document.getElementById("chartType"), {
        type: "bar",
        data: {
            labels: Object.keys(stats),
            datasets: [
                { label: "Completed", data: Object.values(stats).map(v => v.completed), backgroundColor: "#2ecc71" },
                { label: "Delay", data: Object.values(stats).map(v => v.delay), backgroundColor: "#e74c3c" },
                { label: "In Progress", data: Object.values(stats).map(v => v.progress), backgroundColor: "#f1c40f" }
            ]
        }
    });
}
