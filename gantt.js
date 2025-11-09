// modules/gantt/gantt.js
document.addEventListener("DOMContentLoaded", async () => {
  // Load Frappe Gantt library dynamically
  if (!window.FrappeGanttLoaded) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/frappe-gantt/dist/frappe-gantt.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/frappe-gantt/dist/frappe-gantt.umd.js";
    document.body.appendChild(script);
    await new Promise(r => script.onload = r);
    window.FrappeGanttLoaded = true;
  }

  renderProjectListGantt();
});

function renderProjectListGantt() {
  const tbody = document.querySelector("#ganttTable tbody");
  const ganttContainer = document.getElementById("ganttChart");
  tbody.innerHTML = "";
  ganttContainer.innerHTML = "";

  // Ambil data project dari localStorage (dari dashboard)
  let projects = JSON.parse(localStorage.getItem("projects")) || [];

  if (!Array.isArray(projects)) projects = [];

  const tasks = [];
  const phaseKeys = [
    "req", "design", "quotation", "io", "prpo", "d3", "cnc",
    "assembly", "eta", "debugging", "aging", "validation",
    "trial", "pr", "sop"
  ];

  projects.forEach((proj, pid) => {
    const actList = JSON.parse(localStorage.getItem(`act_${pid}`)) || [];
    if (!actList.length) return;

    // Header Project
    const trProj = document.createElement("tr");
    trProj.innerHTML = `
      <td colspan="5" class="fw-bold bg-success text-white">
        ${proj.title || "Untitled Project"} (${proj.model || ""})
      </td>`;
    tbody.appendChild(trProj);

    // Loop activity
    actList.forEach((a, aid) => {
      phaseKeys.forEach(pk => {
        const plan = a[`plan_${pk}`];
        const actual = a[`actual_${pk}`];
        if (!plan && !actual) return;

        const start = plan || actual;
        const end = actual || plan;
        const ee = a.owner || proj.ee || "—";
        const activityName = `${a.activity || "Task"} (${pk.toUpperCase()})`;

        // Status logic
        const today = new Date();
        let statusClass = "bar-warning"; // default progress
        if (actual && new Date(actual) <= new Date(plan)) statusClass = "bar-success";
        else if (plan && new Date(plan) < today && !actual) statusClass = "bar-danger";

        // Tambah ke tabel kiri
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${proj.title || "—"}</td>
          <td>${activityName}</td>
          <td>${ee}</td>
          <td>${plan || "--"}</td>
          <td>${actual || "--"}</td>
        `;
        tbody.appendChild(tr);

        // Tambah ke dataset Gantt
        tasks.push({
          id: `${pid}-${aid}-${pk}`,
          name: `${proj.title} - ${activityName}`,
          start: start,
          end: end,
          progress: actual ? 100 : 40,
          custom_class: statusClass
        });
      });
    });
  });

  // Jika kosong tampilkan placeholder
  if (!tasks.length) {
    ganttContainer.innerHTML =
      "<p class='text-muted text-center mt-3'>No project activity data found.</p>";
    return;
  }

  // Render Gantt Chart
  const gantt = new window.FrappeGantt("#ganttChart", tasks, {
    view_mode: "Week",
    language: "en",
    custom_popup_html: (task) => `
      <div class="card p-2" style="font-size:12px;">
        <strong>${task.name}</strong><br>
        <b>Start:</b> ${task.start}<br>
        <b>Finish:</b> ${task.end}<br>
        <b>Status:</b> ${task.custom_class.replace("bar-", "")}
      </div>
    `,
  });

  // Zoom buttons
  document.getElementById("zoomDay").onclick = () => gantt.change_view_mode("Day");
  document.getElementById("zoomWeek").onclick = () => gantt.change_view_mode("Week");
  document.getElementById("zoomMonth").onclick = () => gantt.change_view_mode("Month");
}
