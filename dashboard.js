// ===============================
// 🔥 FIREBASE CONNECTION
// ===============================
import { db, ref, set, get, update, remove, onValue } from "./firebase-config.js";

// dashboard.js (FINAL + Activity Tab Edition)
// Updated: Tab-based Activity Detail + preserved modal + full features (status color, hover tooltip, placeholder "--")
// ===================================================================

// ===============================
// LOGIN CHECK & LOGOUT HANDLER
// ===============================
const loggedUser = localStorage.getItem("loggedUser");
if (!loggedUser && !location.pathname.endsWith("index.html")) {
  // jika bukan halaman login dan belum ada session, redirect ke index (login)
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const userInfo = document.querySelector(".user-info");
  if (userInfo && loggedUser) {
    userInfo.innerHTML = `
      <i class="bi bi-person-circle"></i> ${escapeHtml(loggedUser)}
      <button class="btn btn-sm btn-outline-danger ms-2" id="logoutBtn">Logout</button>`;
    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("loggedUser");
      window.location.href = "index.html";
    });
  }
});

// ===============================
// DEFAULT CONFIG (Dropdown Data)
// ===============================
const defaultConfig = {
  tpm: ["Aldo", "Mahyu", "Tomi", "Indra", "Welsy", "Reisya", "Bambang"],
  ee: ["Aldo", "Mahyu", "Tomi", "Indra", "Welsy", "Reisya", "Bambang"],
  model: ["9784", "9781", "9787", "9641"],
  site: ["FA", "DC", "MD"],
  supplier: ["Panasonic", "Foxconn", "WIK", "PSP"],
  type: ["NPI", "KAIZEN&VAVE", "Downtime and Finding"]
};

let configData = defaultConfig;

// Coba load config dari Firebase saat halaman pertama kali dibuka
loadConfigFromFirebase().then(cfg => {
  if (Object.keys(cfg).length > 0) {
    configData = cfg;
    console.log("✅ Config loaded from Firebase");
  } else {
    console.warn("⚠️ Using default config (no data in Firebase)");
  }
});

// mapping untuk nama-nama filter (label kiri)
const filterTitles = {
  filterType: "Project Type",
  filterModel: "Model",
  filterSite: "Site",
  filterTPM: "PM",
  filterEE: "Engineer",
  filterStatus: "Status",

  openFilterType: "Project Type",
  openFilterModel: "Model",
  openFilterSite: "Site",
  openFilterTPM: "PM",
  openFilterEE: "Engineer",
  openFilterStatus: "Status",
  openSearch: "Search"
};

// function saveConfig() { localStorage.setItem("configData", JSON.stringify(configData)); }
function saveConfig() {
  saveConfigToFirebase(configData);
}
// Utility: escape HTML
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// small util: insert before node
function insertBefore(newNode, referenceNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode);
}

// update or create labels placed to the LEFT of filter elements
// label style set inline so plug-and-play tanpa edit CSS
function ensureFilterLabelLeft(el) {
  if (!el) return;
  const id = el.id || "";
  const labelId = id + "LabelLeft";
  let labelEl = document.getElementById(labelId);

  if (!labelEl) {
    labelEl = document.createElement("label");
    labelEl.id = labelId;
    labelEl.setAttribute("for", id);
    labelEl.className = "filter-label-left";
    // inline style for immediate visibility
    labelEl.style.marginRight = "8px";
    labelEl.style.fontWeight = "600";
    labelEl.style.color = "#145a32";
    labelEl.style.fontSize = "13px";
    labelEl.style.whiteSpace = "nowrap";
    labelEl.style.display = "inline-block";
    // Insert before the element so label appears to the left
    insertBefore(labelEl, el);
  }

  // set text -> always show filter name (user requested fixed label)
  if (filterTitles[id]) labelEl.textContent = filterTitles[id];
  else {
    // fallback: if no mapping, show 'Filter'
    labelEl.textContent = "Filter";
  }
}

// ===============================
// GANTT CHART MODULE LOADER
// ===============================
function loadGanttModule() {
  fetch("gantt.html")
    .then(res => res.text())
    .then(html => {
      const mainContent = document.getElementById("main-content");
      mainContent.innerHTML = html;

      // Load script modul Gantt
      const script = document.createElement("script");
      script.src = "gantt.js";
      document.body.appendChild(script);

      // Load CSS khusus Gantt
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "gantt.css";
      document.head.appendChild(link);
    })
    .catch(err => console.error("Failed to load Gantt module:", err));
}


// ===============================
// PAGES (HTML snippets)
// ===============================
const pages = {
  "project-state": "<div id='ganttLoader'></div>",
  "npi": "<h4>NPI</h4><p>New Product Introduction tracking dashboard.</p>",
  "project-list": `
    <h4>Project List</h4>
    <div class="mb-3 d-flex flex-wrap gap-2 align-items-center">
      <select id="filterType" class="form-select form-select-sm w-auto"><option value="">All Type</option></select>
      <select id="filterModel" class="form-select form-select-sm w-auto"><option value="">All Model</option></select>
      <select id="filterSite" class="form-select form-select-sm w-auto"><option value="">All Site</option></select>
      <select id="filterTPM" class="form-select form-select-sm w-auto"><option value="">All TPM</option></select>
      <select id="filterEE" class="form-select form-select-sm w-auto"><option value="">All EE</option></select>
      <select id="filterStatus" class="form-select form-select-sm w-auto"><option value="">All Status</option><option>On Progress</option><option>Completed</option><option>Delay</option></select>
      <button id="btnSearchProjects" class="btn btn-outline-primary btn-sm"><i class="bi bi-search"></i> Search</button>
      <button id="addTaskBtn" class="btn btn-success btn-sm ms-auto"><i class="bi bi-plus-circle"></i> Add Task</button>
    </div>
    <div class="table-responsive">
      <table class="table table-bordered table-striped" id="projectTable">
        <thead class="table-primary text-center align-middle">
          <tr>
            <th>No</th>
            <th>Project Title</th>
            <th>Project Type</th>
            <th>Model</th>
            <th>Site</th>
            <th>Responsible TPM</th>
            <th>Responsible EE</th>
            <th>Detail</th>
            <th>Gate1/Concept Study</th><th>Gate2/3D Drawing</th><th>FOT/Assembly</th><th>ER1/Debugging</th><th>ER2/Aging</th><th>ER3/Validation</th><th>Pilot Run</th><th>SOP</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="projectBody"></tbody>
      </table>
    </div>`,
  "open-list": `
    <h4>Open List</h4>
    <div class="mb-3 d-flex flex-wrap gap-2 align-items-center">
      <select id="openFilterType" class="form-select form-select-sm w-auto"><option value="">All Type</option></select>
      <select id="openFilterModel" class="form-select form-select-sm w-auto"><option value="">All Model</option></select>
      <select id="openFilterSite" class="form-select form-select-sm w-auto"><option value="">All Site</option></select>
      <select id="openFilterTPM" class="form-select form-select-sm w-auto"><option value="">All TPM</option></select>
      <select id="openFilterEE" class="form-select form-select-sm w-auto"><option value="">All EE</option></select>
      <select id="openFilterStatus" class="form-select form-select-sm w-auto">
        <option value="">All Status</option><option>On Progress</option><option>Completed</option><option>Delay</option>
      </select>
      <input id="openSearch" class="form-control form-control-sm w-auto" placeholder="Search open list...">
      <button id="openBtnSearch" class="btn btn-outline-primary btn-sm"><i class="bi bi-search"></i> Search</button>
      <button id="openRefresh" class="btn btn-primary btn-sm ms-2">Refresh</button>
    </div>
    <div class="table-responsive">
      <table class="table table-bordered table-striped" id="openListTable">
        <thead class="table-primary text-center align-middle">
          <tr>
            <th>No</th><th>Project Title</th><th>Project Type</th><th>Activity</th><th>Model</th>
            <th>Question</th><th>Reason</th><th>Action</th><th>Responsibility EE</th><th>Supplier</th>
            <th>Start Date</th><th>Plan Date</th><th>Actual Date</th><th>Delay Days</th><th>Status</th><th>File</th><th>Remarks</th><th>Action</th>
          </tr>
        </thead>
        <tbody id="openListBody"></tbody>
      </table>
    </div>`,
  "activity-tab-placeholder": `
    <div class="d-flex align-items-center gap-2 mb-3">
      <h4 class="m-0">Activity Detail</h4>
      <div class="ms-auto">
        <button id="addActivityGlobal" class="btn btn-success btn-sm"><i class="bi bi-plus-circle"></i> Add Task</button>
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-bordered table-hover table-striped align-middle" id="activityTableTab">
        <thead class="table-dark">
          <tr>
            <th>No</th><th>Activity</th><th>Site</th><th>Owner</th>
            <th>Requirement</th><th>Design</th><th>Quotation</th><th>IO</th><th>PR/PO</th>
            <th>3D Design</th><th>Fabrication</th><th>Assembly</th><th>ETA</th><th>Debugging</th><th>Aging Test</th>
            <th>Validation</th><th>Trial Run</th><th>Pilot Run</th><th>SOP</th><th>Level</th><th>Supplier</th><th>Action</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>`,
  "file-list": "<h4>File List</h4><p>All project documents managed here.</p>",
  "open-list-old": "<h4>Open List (legacy)</h4>",
  "asset-list": "<h4>Asset List</h4><p>Engineering asset details, ID, and ownership records.</p>",
  "asset-category": "<h4>Asset Category</h4><p>Organize assets by group or functionality.</p>",
  "device-state": "<h4>Device State</h4><p>Monitor device performance and operation state.</p>",
  "part-list": "<h4>Part List</h4><p>Registered spare parts and components.</p>",
  "inout": "<h4>In/Out</h4><p>Log of part transactions (issued and returned).</p>",
  "storage": "<h4>Storage</h4><p>Warehouse and inventory control overview.</p>",
  "device-category": "<h4>Device Category</h4><p>Device classifications and grouping setup.</p>",
  "device-list": "<h4>Device List</h4><p>List of all machines or devices registered in system.</p>",
  "maintenance-item": "<h4>Maintenance Item</h4><p>Preventive maintenance record library.</p>",
  "analytical-tools": "<h4>Analytical Tools</h4><p>Statistical and visualization tools for engineering KPIs.</p>",
  "system-config": `
    <h4>System Configuration</h4>
    <p class="text-muted">Manage dropdown options for Project List and Activity Table.</p>
    <table class="table table-bordered align-middle">
      <thead class="table-light">
        <tr><th>Configuration</th><th>Values</th><th>Action</th></tr>
      </thead>
      <tbody id="configTableBody"></tbody>
    </table>`
};

// ===============================
// TAB MANAGEMENT (Dynamic Tabs)
// ===============================
// Note: HTML should contain a container with id="tabContainer" (eg. right under navbar)
// If absent, code will fall back to old behavior (no tabs).
const tabContainer = document.getElementById("tabContainer");

function openTab(pageKey, title) {
  // If no tab container, fallback to setActiveTab
  if (!tabContainer) return setActiveTab(pageKey);

  // Cek apakah tab sudah ada
  let existingTab = document.querySelector(`.tab[data-page="${pageKey}"]`);
  if (existingTab) {
    setActiveTab(pageKey);
    return;
  }

  // Buat tab baru
  const tab = document.createElement("div");
  tab.className = "tab active";
  tab.dataset.page = pageKey;
  tab.innerHTML = `${escapeHtml(title)} <span class="close-tab" title="Close">&times;</span>`;
  tabContainer.appendChild(tab);

  // Aktifkan tab baru
  setActiveTab(pageKey);

  // Klik tab → ubah content (klik pada tab body)
  tab.addEventListener("click", (e) => {
    if (e.target.classList.contains("close-tab")) return;
    setActiveTab(pageKey);
  });

  // Klik "x" → hapus tab
  tab.querySelector(".close-tab").addEventListener("click", (e) => {
    e.stopPropagation();
    tab.remove();
    // Jika tab dihapus dan aktif, pindah ke tab terakhir
    const lastTab = document.querySelector(".tab:last-child");
    if (lastTab) setActiveTab(lastTab.dataset.page);
    else showWelcomePage();
  });
}

function setActiveTab(pageKey) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  const tab = document.querySelector(`.tab[data-page="${pageKey}"]`);
  if (tab) tab.classList.add("active");

  // Render isi halaman
  let contentHtml = pages[pageKey] || "<p>Page under development...</p>";
  // special case: activity tab needs project pid context; we'll assume pageKey like "activity-{pid}"
  if (pageKey.startsWith("activity-")) {
    // placeholder content will be rendered by renderActivityTableInTab
    contentHtml = pages["activity-tab-placeholder"];
  }
  document.getElementById("main-content").innerHTML = `<div class="page active">${contentHtml}</div>`;
  document.getElementById("page-title").textContent = pageKey.replace(/-/g, " ").toUpperCase();

  // Jalankan fungsi khusus tiap halaman
  if (pageKey === "project-list") {
    initFilterOptions();
    renderProjectTable();
    attachProjectSearchHandler();
  } else if (pageKey === "open-list") {
    initOpenListFilterOptions();
    renderOpenList();
  } else if (pageKey === "system-config") {
    renderConfigTable();
  } else if (pageKey.startsWith("activity-")) {
    const pid = parseInt(pageKey.split("-")[1], 10);
  renderActivityTableInTab(pid);
  }
}

function showWelcomePage() {
  document.getElementById("main-content").innerHTML = `
    <div class="text-center p-4">
      <h4>Welcome to WIK-TPM Dashboard</h4>
      <p>Select a menu from the sidebar to view content.</p>
    </div>`;
  document.getElementById("page-title").textContent = "Dashboard Overview";
}

// ===============================
// SIDEBAR MENU HANDLER (with tab navigation)
// ===============================
document.querySelectorAll(".menu li[data-page]").forEach(item => {
  item.addEventListener("click", () => {
    const key = item.getAttribute("data-page");
    const title = item.textContent.trim();
    openTab(key, title);
    // Jika menu Project State diklik → muat modul Gantt
    if (key === "project-state") {
      loadGanttModule();
    }
  });
});

// ===============================
// PROJECT DATA (saved in localStorage key "projects")
// schema: [{ title, type, model, site, tpm, ee, gate1...sop }]
// ===============================
let projectData = [];

loadProjectsFromFirebase().then(data => {
  projectData = data || [];
  renderProjectTable(projectData);
});

onValue(ref(db, "projects/"), (snapshot) => {
  if (snapshot.exists()) {
    projectData = snapshot.val();
    renderProjectTable(projectData);
    console.log("🔁 Project data updated in real-time");
  }
});

onValue(ref(db, "activities/"), (snapshot) => {
  if (!snapshot.exists()) return;
  console.log("🔁 Activities updated in real-time");

  const activeTab = document.querySelector(".tab.active");
  // Jika tab Activity sedang terbuka, otomatis refresh datanya
  if (activeTab && activeTab.dataset.page.startsWith("activity-")) {
    const pid = activeTab.dataset.page.split("-")[1];
    renderActivityTableInTab(pid);
  }
});

// ===============================
// HELPERS: select HTML & date cell
// ===============================
const selectHtml = (f, opts, v, disabled = true) =>
  `<select id="${f}" class="form-select form-select-sm" data-field="${f}" ${disabled ? "disabled" : ""}>${opts.map(o => `<option ${o === v ? "selected" : ""}>${escapeHtml(o)}</option>`).join("")}</select>`;

const dateCellHtml = (f, v, disabled = true) =>
  `<input type="date" class="form-control form-control-sm" data-field="${f}" value="${v || ""}" ${disabled ? "disabled" : ""}>`;

// ===============================
// INIT filter dropdowns in project list
// Note: filters now auto-apply (renderProjectTable called on change/input)
// ===============================
function initFilterOptions() {
  const fill = (id, arr) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<option value="">All</option>` + arr.map(a => `<option>${escapeHtml(a)}</option>`).join("");
    // ensure left label exists & set initial label (always show filter name)
    ensureFilterLabelLeft(el);
  };
  fill("filterType", configData.type || []);
  fill("filterModel", configData.model || []);
  fill("filterSite", configData.site || []);
  fill("filterTPM", configData.tpm || []);
  fill("filterEE", configData.ee || []);
  // ensure label for status exists
  ensureFilterLabelLeft(document.getElementById("filterStatus"));

  // attach change/input handlers to auto apply filter (renderProjectTable)
  ["filterType","filterModel","filterSite","filterTPM","filterEE","filterStatus"].forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.onchange = el.oninput = () => {
      ensureFilterLabelLeft(el);
      // reload and render with current filter values
      applyProjectFiltersAndRender();
    };
  });
}

// apply filters and renderProjectTable with filtered data
function applyProjectFiltersAndRender() {
  // read filter values
  const ft = (document.getElementById("filterType")?.value || "").trim();
  const fm = (document.getElementById("filterModel")?.value || "").trim();
  const fs = (document.getElementById("filterSite")?.value || "").trim();
  const ftp = (document.getElementById("filterTPM")?.value || "").trim();
  const fee = (document.getElementById("filterEE")?.value || "").trim();
  const fst = (document.getElementById("filterStatus")?.value || "").trim();

  // projectData = JSON.parse(localStorage.getItem("projects")) || projectData;
  const filtered = projectData.filter(p => {
    let ok = true;
    if (ft && p.type !== ft) ok = false;
    if (fm && p.model !== fm) ok = false;
    if (fs && p.site !== fs) ok = false;
    if (ftp && p.tpm !== ftp) ok = false;
    if (fee && p.ee !== fee) ok = false;
    if (fst) {
      const fields = ["gate1","gate2","fot","er1","er2","er3","pr","sop"];
      const completed = fields.every(f => p[f]);
      const delayed = fields.some(f => p[f] && new Date(p[f]) < toDateOnly(new Date()) && !p[`actual_${f}`]);
      const status = completed ? "Completed" : (delayed ? "Delay" : "On Progress");
      if (status !== fst) ok = false;
    }
    return ok;
  });

  renderProjectTable(filtered);
}

// ===============================
// INIT filter dropdowns for Open List
// ===============================
function initOpenListFilterOptions() {
  const fill = (id, arr) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<option value="">All</option>` + arr.map(a => `<option>${escapeHtml(a)}</option>`).join("");
    ensureFilterLabelLeft(el);
  };
  fill("openFilterType", configData.type || []);
  fill("openFilterModel", configData.model || []);
  fill("openFilterSite", configData.site || []);
  fill("openFilterTPM", configData.tpm || []);
  fill("openFilterEE", configData.ee || []);

  // ensure label for status and search exists too (left side)
  ensureFilterLabelLeft(document.getElementById("openFilterStatus"));
  const openSearchEl = document.getElementById("openSearch");
  if (openSearchEl) {
    let lbl = document.getElementById("openSearchLabelLeft");
    if (!lbl) {
      lbl = document.createElement("label");
      lbl.id = "openSearchLabelLeft";
      lbl.className = "filter-label-left";
      lbl.style.marginRight = "8px";
      lbl.style.fontWeight = "600";
      lbl.style.color = "#145a32";
      lbl.style.fontSize = "13px";
      lbl.style.whiteSpace = "nowrap";
      lbl.style.display = "inline-block";
      insertBefore(lbl, openSearchEl);
    }
    lbl.textContent = filterTitles["openSearch"] || "Search";
  }

  // attach handlers
  attachOpenListSearchHandler();
}

function attachOpenListSearchHandler() {
  const btn = document.getElementById("openBtnSearch");
  const refresh = document.getElementById("openRefresh");
  const inputs = ["openFilterType","openFilterModel","openFilterSite","openFilterTPM","openFilterEE","openFilterStatus","openSearch"];
  if (btn) {
    btn.onclick = () => { renderOpenList(); };
  }
  if (refresh) refresh.onclick = () => renderOpenList();
  inputs.forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    el.onchange = el.oninput = () => {
      ensureFilterLabelLeft(el);
      renderOpenList();
    };
  });
}

// ===============================
// RENDER Project Table
// ===============================
function renderProjectTable(filtered = null) {
  const tbody = document.getElementById("projectBody");
  if (!tbody) return;
  // ensure projectData from storage
  // projectData = JSON.parse(localStorage.getItem("projects")) || projectData;
  const rows = (filtered || projectData);

  tbody.innerHTML = "";
  rows.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="text-center">${i + 1}</td>
      <td><input class="form-control form-control-sm project-title" data-field="title" value="${escapeHtml(p.title||"")}" disabled></td>
      ${wrapTd(selectHtml("type", configData.type, p.type))}
      ${wrapTd(selectHtml("model", configData.model, p.model))}
      ${wrapTd(selectHtml("site", configData.site, p.site))}
      ${wrapTd(selectHtml("tpm", configData.tpm, p.tpm))}
      ${wrapTd(selectHtml("ee", configData.ee, p.ee))}
      <td class="text-center"><button class="btn btn-sm btn-outline-info view-act" data-id="${i}"><i class="bi bi-eye"></i></button></td>
      ${wrapTd(dateCellHtml("gate1", p.gate1))}
      ${wrapTd(dateCellHtml("gate2", p.gate2))}
      ${wrapTd(dateCellHtml("fot", p.fot))}
      ${wrapTd(dateCellHtml("er1", p.er1))}
      ${wrapTd(dateCellHtml("er2", p.er2))}
      ${wrapTd(dateCellHtml("er3", p.er3))}
      ${wrapTd(dateCellHtml("pr", p.pr))}
      ${wrapTd(dateCellHtml("sop", p.sop))}
      <td class="text-center">
        <button class="btn btn-sm btn-warning edit-btn"><i class="bi bi-pencil-square"></i></button>
        <button class="btn btn-sm btn-danger del-btn"><i class="bi bi-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);

    // events
    tr.querySelector(".view-act").onclick = () => {
      // open Activity as TAB (page key: activity-{pid})
      const pageKey = `activity-${i}`;
      openTab(pageKey, `Activity — ${p.title || 'Project'}`);
      console.log("🧩 Open Activity Tab for project:", i, p.title);
    };
    tr.querySelector(".edit-btn").onclick = () => toggleEditProjectRow(tr, i);
    tr.querySelector(".del-btn").onclick = () => {
      if (confirm("Delete project and its activities?")) {
        projectData.splice(i, 1);
        saveProjects();
        // refresh using current filters
        applyProjectFiltersAndRender();
      }
    };
  });

  // add task
  const today = new Date();
  tbody.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.value) return; // skip kosong
    const dateVal = new Date(input.value);
    input.style.transition = "background-color 0.3s ease";
    if (dateVal < today) {
      // Sudah lewat → hijau muda
      input.style.backgroundColor = "#d1e7dd";
      input.style.color = "#0f5132";
      input.style.fontWeight = "600";
    } else {
      // Belum lewat → kuning muda
      input.style.backgroundColor = "#fff3cd";
      input.style.color = "#664d03";
      input.style.fontWeight = "600";
    }
  });
  const addBtn = document.getElementById("addTaskBtn");
  showPlaceholderForEmptyDates("#projectBody");
  if (addBtn) {
    addBtn.onclick = () => {
      projectData.push({
        title: "New Project",
        type: configData.type[0] || "",
        model: configData.model[0] || "",
        site: configData.site[0] || "",
        tpm: configData.tpm[0] || "",
        ee: configData.ee[0] || ""
      });
      saveProjects();
      applyProjectFiltersAndRender();
    };
  }
}

function wrapTd(inner) { return `<td>${inner}</td>`; }

// ============================================
// 🔧 Utility: tampilkan '--' untuk tanggal kosong
// ============================================

function showPlaceholderForEmptyDates(containerSelector = "body") {
  document.querySelectorAll(`${containerSelector} input[type="date"]`).forEach(input => {
    if (!input.value) {
      input.type = "text"; // ubah agar bisa tampilkan teks biasa
      input.value = "--";
      input.style.textAlign = "center";
      input.style.color = "#888";
      input.classList.add("placeholder-date");

      // Saat fokus (misalnya klik edit), kembalikan ke date picker
      input.addEventListener("focus", () => {
        input.type = "date";
        if (input.value === "--") input.value = "";
      });
    } else if (input.value === "--") {
      input.type = "date";
      input.value = "";
    }
  });
}



// ===============================
// toggle edit row
// ===============================
function toggleEditProjectRow(row, index) {
  const btn = row.querySelector(".edit-btn");
  const editing = btn.classList.toggle("editing");
  const inputs = row.querySelectorAll("input, select");
  if (editing) {
    inputs.forEach(x => x.disabled = false);
    btn.innerHTML = '<i class="bi bi-check-lg"></i>';
  } else {
    // save values back to object
    const obj = {};
    inputs.forEach(inp => {
      const f = inp.dataset.field || inp.getAttribute("data-field") || inp.className;
      // for project title special
      if (inp.classList.contains("project-title")) obj.title = inp.value;
      else if (f) obj[f] = inp.value;
    });
    // merge into projectData[index]
    Object.assign(projectData[index], obj);
    saveProjects();
    // refresh with current filters
    applyProjectFiltersAndRender();
  }
}

function saveProjects() {
  saveProjectsToFirebase(projectData);
}

// ===============================
// Attach Project Search Handler (button Search)
// (still present but not required because filters auto-apply)
// ===============================
function attachProjectSearchHandler() {
  const btn = document.getElementById("btnSearchProjects");
  if (!btn) return;
  btn.onclick = () => {
    applyProjectFiltersAndRender();
  };
}

// ===============================
// ACTIVITY DETAIL: modal & tab rendering (shared logic)
// ===============================
const activityDateFields = ["req","design","quotation","io","prpo","d3","cnc","assembly","eta","debugging","aging","validation","trial","pr","sop"];

// Render activity as modal (backward-compatible)
function openActivityModal(pid) {
  const modalEl = document.getElementById("activityModal");
  if (!modalEl) return alert("Activity modal not found in HTML.");
  const modal = new bootstrap.Modal(modalEl);
  modalEl.setAttribute("data-pid", pid);
  // let data = JSON.parse(localStorage.getItem(`act_${pid}`)) || [];
  let data = [];
  loadActivitiesFromFirebase(pid).then(acts => {
    data = acts || [];
    render();
  });

  async function saveAct() {
    await saveActivitiesToFirebase(pid, data);
    console.log(`✅ Activity ${pid} saved to Firebase`);
  }
  const tbody = modalEl.querySelector("#activityTable tbody");

  // prepare select options
  const ownerOpts = Array.from(new Set([...(configData.ee||[]), ...(configData.tpm||[])]));
  const siteOpts = configData.site || [];
  const supplierOpts = configData.supplier || [];

  function render() {
    tbody.innerHTML = "";
    data.forEach((a, i) => {
      // normalize
      a.activity = a.activity || "";
      a.site = a.site || siteOpts[0] || "";
      a.owner = a.owner || ownerOpts[0] || "";
      a.level = a.level || "";
      a.supplier = a.supplier || supplierOpts[0] || "";
      // ensure date keys exist
      activityDateFields.forEach(k => {
        if (a[`plan_${k}`] === undefined) a[`plan_${k}`] = a[k] || "";
        if (a[`actual_${k}`] === undefined) a[`actual_${k}`] = "";
      });

      const singleDateCell = (k) => {
        const plan = a[`plan_${k}`] || "";
        const act = a[`actual_${k}`] || "";
        return `<td>
                  <input type="date" class="form-control form-control-sm mb-1" data-field="plan_${k}" value="${plan}" disabled>
                  <input type="date" class="form-control form-control-sm" data-field="actual_${k}" value="${act}" disabled>
                </td>`;
      };

      const rowHtml = `
        <tr data-i="${i}">
          <td class="text-center">${i+1}</td>
          <td><input class="form-control form-control-sm" data-field="activity" value="${escapeHtml(a.activity)}" disabled></td>
          <td>${renderSelectHtml("site", siteOpts, a.site)}</td>
          <td>${renderSelectHtml("owner", ownerOpts, a.owner)}</td>
          ${singleDateCell("req")}
          ${singleDateCell("design")}
          ${singleDateCell("quotation")}
          ${singleDateCell("io")}
          ${singleDateCell("prpo")}
          ${singleDateCell("d3")}
          ${singleDateCell("cnc")}
          ${singleDateCell("assembly")}
          ${singleDateCell("eta")}
          ${singleDateCell("debugging")}
          ${singleDateCell("aging")}
          ${singleDateCell("validation")}
          ${singleDateCell("trial")}
          ${singleDateCell("pr")}
          ${singleDateCell("sop")}
          <td><input class="form-control form-control-sm" data-field="level" value="${escapeHtml(a.level)}" disabled></td>
          <td>${renderSelectHtml("supplier", supplierOpts, a.supplier)}</td>
          <td>
            <div class="d-flex gap-1">
              <button class="btn btn-sm btn-outline-primary edit-act" data-i="${i}"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-outline-danger del-act" data-i="${i}"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
      tbody.insertAdjacentHTML("beforeend", rowHtml);
    });

    // after render, mark delayed inputs (color background) for plan/actual comparisons
    markDelaysInActivityTable(modalEl); // pass element context
  }

  // click handlers inside modal tbody
  tbody.onclick = async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const i = parseInt(btn.dataset.i, 10);
    if (btn.classList.contains("del-act")) {
      if (!confirm("Delete activity?")) return;
      data.splice(i, 1);
      saveActToFirebase();
      render();
      return;
    }
    if (btn.classList.contains("edit-act")) {
      const row = btn.closest("tr");
      const inputs = row.querySelectorAll("input, select");
      const toggled = btn.classList.toggle("editing");
      if (toggled) {
        inputs.forEach(x => x.disabled = false);
        btn.innerHTML = '<i class="bi bi-check-lg"></i>';
      } else {
        // read inputs ordered as in row
        const arr = Array.from(inputs);
        let idx = 0;
        const obj = {};
        obj.activity = arr[idx++].value;
        obj.site = arr[idx++].value;
        obj.owner = arr[idx++].value;
        activityDateFields.forEach(k => {
          obj[`plan_${k}`] = arr[idx++].value; // plan
          obj[`actual_${k}`] = arr[idx++].value; // actual
        });
        obj.level = arr[idx++].value;
        obj.supplier = arr[idx++].value;

        data[i] = Object.assign({}, data[i], obj);
        saveAct();
        render();
        showPlaceholderForEmptyDates("#activityTable tbody");
      }
    }
  };

  // add / search handlers in modal
  const addBtn = modalEl.querySelector("#addActivityBtn");
  addBtn.onclick = () => {
    data.push({
      activity: "New Task",
      site: siteOpts[0] || "",
      owner: ownerOpts[0] || "",
      supplier: supplierOpts[0] || ""
    });
    saveAct(); render();
  };
  const searchInput = modalEl.querySelector("#searchActivity");
  searchInput.oninput = () => {
    const v = searchInput.value.toLowerCase();
    tbody.querySelectorAll("tr").forEach(r => {
      r.style.display = r.innerText.toLowerCase().includes(v) ? "" : "none";
    });
  };

  //function saveAct() { localStorage.setItem(`act_${pid}`, JSON.stringify(data)); }
  async function saveActToFirebase() {
    try {
      await saveActivitiesToFirebase(pid, data);
      console.log(`✅ Activity ${pid} saved to Firebase`);
    } catch (err) {
      console.error("❌ Failed saving activities:", err);
    }
  }
  render();
  showPlaceholderForEmptyDates("#activityTable tbody");
  modal.show();
}

// renderSelectHtml used by modal (returns full select wrapped in HTML, used inside td)
function renderSelectHtml(name, options = [], selected = "") {
  return `<select class="form-select form-select-sm" data-field="${name}" disabled>
    ${options.map(o => `<option ${o === selected ? "selected" : ""}>${escapeHtml(o)}</option>`).join("")}
  </select>`;
}

// mark delayed inputs coloring in activity table (modal or tab)
// - pass containerEl optional (modalEl or document)
function markDelaysInActivityTable(containerEl = document) {
  const root = (containerEl && containerEl.querySelector) ? containerEl : document;
  const rows = root.querySelectorAll("#activityTable tbody tr, #activityTableTab tbody tr");

  rows.forEach(row => {
    activityDateFields.forEach(k => {
      const planInput = row.querySelector(`[data-field="plan_${k}"]`);
      const actualInput = row.querySelector(`[data-field="actual_${k}"]`);
      if (planInput && planInput.value === "--") {
        planInput.type = "date";
        planInput.value = "";
      }
      if (actualInput && actualInput.value === "--") {
        actualInput.type = "date";
        actualInput.value = "";
      }

      const planVal = planInput ? planInput.value : "";
      const actualVal = actualInput ? actualInput.value : "";      
      
      // reset warna
      [planInput, actualInput].forEach(inp => {
        if (inp) {
          inp.style.backgroundColor = "";
          inp.classList.remove("border-danger");
        }
      });

      // skip jika tidak ada plan
      if (!planVal) return;

      const planDate = toDateOnly(planVal);
      const actualDate = actualVal ? toDateOnly(actualVal) : null;
      const today = toDateOnly(new Date());

      let color = ""; // default
      let isDelay = false;

      // Kondisi 1: actual melebihi plan
      if (actualDate && actualDate > planDate) {
        color = "#f8d7da"; // merah muda (delay)
        isDelay = true;
      }
      // Kondisi 2: actual kosong dan plan sudah lewat hari ini
      else if ((!actualVal || actualVal === "--") && planDate < today) {
        color = "#f8d7da"; // merah muda (delay)
        isDelay = true;
      }
      // Kondisi 3: actual kosong tapi belum lewat plan (On Progress)
      else if (!actualDate && planDate >= today) {
        color = "#fff3cd"; // kuning muda
      }
      // Kondisi 4: actual ada dan ≤ plan (Completed)
      else if (actualDate && actualDate <= planDate) {
        color = "#d1e7dd"; // hijau muda
      }

      // apply warna
      [planInput, actualInput].forEach(inp => {
        if (inp && color) inp.style.backgroundColor = color;
      });

      // tandai border merah kalau delay
      if (isDelay && planInput) planInput.classList.add("border-danger");
      if (isDelay && actualInput && !actualVal) actualInput.classList.add("border-danger");
    });

    // Cek apakah semua actual sudah terisi dan tidak ada delay → hijau semua kolom
    let allActual = true, anyDelay = false;
    activityDateFields.forEach(k => {
      const p = row.querySelector(`[data-field="plan_${k}"]`);
      const a = row.querySelector(`[data-field="actual_${k}"]`);
      const pv = p ? p.value : "";
      const av = a ? a.value : "";
      if (!av) allActual = false;
      const delay = computePhaseDelay(pv, av);
      if (delay !== null && delay > 0) anyDelay = true;
    });
    if (allActual && !anyDelay) {
      activityDateFields.forEach(k => {
        const p = row.querySelector(`[data-field="plan_${k}"]`);
        const a = row.querySelector(`[data-field="actual_${k}"]`);
        [p, a].forEach(inp => {
          if (inp) inp.style.backgroundColor = "#d1e7dd"; // hijau muda
        });
      });
    }
  });
}

// ===============================
// ✅ FINAL: RENDER Activity in TAB (full page) — fixed async version
// ===============================
async function renderActivityTableInTab(pid) {
  const container = document.getElementById("main-content");
  if (!container) return;
  
  // Pastikan tabel ada
  const tbody = container.querySelector("#activityTableTab tbody");
  if (!tbody) {
    container.innerHTML = pages["activity-tab-placeholder"];
  }
  
  const tb = document.getElementById("activityTableTab");
  if (!tb) return;
  const tbodyFinal = tb.querySelector("tbody");
  tbodyFinal.innerHTML = "";

  // 🔥 Tunggu data selesai diambil dari Firebase dulu
  const data = await loadActivitiesFromFirebase(pid);
  populateActivityTab(Array.isArray(data) ? data : []);

  // Fungsi ini render isi tabel Activity
  function populateActivityTab(data) {
    const ownerOpts = Array.from(new Set([...(configData.ee||[]), ...(configData.tpm||[])]));
    const siteOpts = configData.site || [];
    const supplierOpts = configData.supplier || [];

    tbodyFinal.innerHTML = "";

    data.forEach((a, i) => {
      a.activity = a.activity || "";
      a.site = a.site || siteOpts[0] || "";
      a.owner = a.owner || ownerOpts[0] || "";
      a.level = a.level || "";
      a.supplier = a.supplier || supplierOpts[0] || "";
      activityDateFields.forEach(k => {
        if (a[`plan_${k}`] === undefined) a[`plan_${k}`] = a[k] || "";
        if (a[`actual_${k}`] === undefined) a[`actual_${k}`] = "";
      });

      const tr = document.createElement("tr");
      tr.dataset.pid = pid;
      tr.dataset.i = i;
      tr.innerHTML = `
        <td class="text-center">${i+1}</td>
        <td><input class="form-control form-control-sm" data-field="activity" value="${escapeHtml(a.activity)}" disabled></td>
        <td>${renderSelectHtml("site", siteOpts, a.site)}</td>
        <td>${renderSelectHtml("owner", ownerOpts, a.owner)}</td>
        ${activityDateFields.map(k => `
          <td>
            <input type="date" class="form-control form-control-sm mb-1" data-field="plan_${k}" value="${a[`plan_${k}`]}" disabled>
            <input type="date" class="form-control form-control-sm" data-field="actual_${k}" value="${a[`actual_${k}`]}" disabled>
          </td>`).join("")}
        <td><input class="form-control form-control-sm" data-field="level" value="${escapeHtml(a.level)}" disabled></td>
        <td>${renderSelectHtml("supplier", supplierOpts, a.supplier)}</td>
        <td>
          <div class="d-flex gap-1">
            <button class="btn btn-sm btn-outline-primary edit-act-tab" data-i="${i}"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-danger del-act-tab" data-i="${i}"><i class="bi bi-trash"></i></button>
          </div>
        </td>`;
      tbodyFinal.appendChild(tr);
    });

  }

  // Handler untuk delete & edit
  tb.querySelectorAll(".del-act-tab").forEach(b => {
    b.onclick = async () => {
      const idx = parseInt(b.dataset.i, 10);
      if (!confirm("Delete activity?")) return;
      const acts = await loadActivitiesFromFirebase(pid);
      acts.splice(idx, 1);
      await saveActivitiesToFirebase(pid, acts);
      renderActivityTableInTab(pid);
    };
  });

  tb.querySelectorAll(".edit-act-tab").forEach(b => {
    b.onclick = async (e) => {
      const btn = e.currentTarget;
      const idx = parseInt(btn.dataset.i, 10);
      const row = btn.closest("tr");
      const inputs = row.querySelectorAll("input, select");
      const toggled = btn.classList.toggle("editing");
      if (toggled) {
        inputs.forEach(x => x.disabled = false);
        btn.innerHTML = '<i class="bi bi-check-lg"></i>';
      } else {
        const arr = Array.from(inputs);
        let p = 0;
        const obj = {};
        obj.activity = arr[p++].value;
        obj.site = arr[p++].value;
        obj.owner = arr[p++].value;
        activityDateFields.forEach(k => {
          obj[`plan_${k}`] = arr[p++].value;
          obj[`actual_${k}`] = arr[p++].value;
        });
        obj.level = arr[p++].value;
        obj.supplier = arr[p++].value;

        const acts = await loadActivitiesFromFirebase(pid);
        acts[idx] = Object.assign({}, acts[idx], obj);
        await saveActivitiesToFirebase(pid, acts);
        renderActivityTableInTab(pid);
      }
    };
  });


  setTimeout(() => {
  const addGlobal = document.getElementById("addActivityGlobal");
  if (!addGlobal) {
    console.warn("⚠️ Add Task button not found yet — retry next render");
    return;
  }

  addGlobal.onclick = async () => {
    console.log("✅ Add Task clicked for pid:", pid);
    const acts = await loadActivitiesFromFirebase(pid);
    const updated = Array.isArray(acts) ? acts : [];
    updated.push({
      activity: "New Task",
      site: configData.site[0] || "",
      owner: configData.ee[0] || configData.tpm[0] || "",
      supplier: configData.supplier[0] || "",
      level: ""
    });
    await saveActivitiesToFirebase(pid, updated);
    console.log("✅ Task added successfully, total:", updated.length);
    renderActivityTableInTab(pid);
  };

  // tampilkan status dan placeholder tanggal setelah render
  setTimeout(() => {
    // Warna delay dulu
    markDelaysInActivityTable(document);

    // Baru tampilkan placeholder "--" (tidak akan menimpa warna lagi)
    setTimeout(() => {
      showPlaceholderForEmptyDates("#activityTableTab tbody");
    }, 300);
  }, 300);
});
}


// ===============================
// OPEN LIST: breakdown per-phase
// Updated: move phaseName into Remarks and avoid duplication
// Includes filter & search support for Open List
// ===============================
async function renderOpenList() {
  const tbody = document.getElementById("openListBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  // projectData = JSON.parse(localStorage.getItem("projects")) || projectData;

  // read filter values
  const fType = (document.getElementById("openFilterType")?.value || "").trim();
  const fModel = (document.getElementById("openFilterModel")?.value || "").trim();
  const fSite = (document.getElementById("openFilterSite")?.value || "").trim();
  const fTPM = (document.getElementById("openFilterTPM")?.value || "").trim();
  const fEE = (document.getElementById("openFilterEE")?.value || "").trim();
  const fStatus = (document.getElementById("openFilterStatus")?.value || "").trim();
  const fSearch = (document.getElementById("openSearch")?.value || "").toLowerCase().trim();

  // phase mapping
  const phaseKeys = ["req","design","quotation","io","prpo","d3","cnc","assembly","eta","debugging","aging","validation","trial","pr","sop"];
  const phaseNames = {
    req: "Requirement Validation",
    design: "Design",
    quotation: "Quotation",
    io: "IO",
    prpo: "PR/PO",
    d3: "3D Design",
    cnc: "Fabrication (CNC)",
    assembly: "Assembly",
    eta: "ETA",
    debugging: "Debugging",
    aging: "Aging Test",
    validation: "Validation",
    trial: "Trial Run",
    pr: "Pilot Run",
    sop: "SOP"
  };

  let rows = [];
  for (let pid = 0; pid < projectData.length; pid++) {
    const proj = projectData[pid];
    // apply project-level filters early to skip unnecessary activities
    if (fType && proj.type !== fType) continue;
    if (fModel && proj.model !== fModel) continue;
    if (fSite && proj.site !== fSite) continue;
    const acts = await loadActivitiesFromFirebase(pid) || [];

    acts.forEach((a, aid) => {
      phaseKeys.forEach(pk => {
        const plan = a[`plan_${pk}`] || "";
        const actual = a[`actual_${pk}`] || "";
        const delay = computePhaseDelay(plan, actual);
        const today = toDateOnly(new Date());
        const planDate = plan && plan !== "--" ? toDateOnly(plan) : null;
        const actualDate = actual && actual !== "--" ? toDateOnly(actual) : null;
        let status = "On Progress";

        if (actualDate && planDate) {
          if (actualDate > planDate) status = "Delay";
          else status = "Completed";
        } else if (!actualDate && planDate && planDate < today) {
          status = "Delay";
        } else if (!planDate) {
          status = "On Progress";
        }
        // build a row object
        const start = a.start || a[`start_${pk}`] || "";
        const rowObj = {
          pid, aid,
          projectTitle: proj.title || "",
          projectType: proj.type || "",
          activity: a.activity || "",
          model: proj.model || "",
          start,
      
          
          // Prioritaskan field per-phase (misal reason_design), fallback ke global
          question: (a.hasOwnProperty(`question_${pk}`)) ? a[`question_${pk}`] : (a.question || ""),
          reason: (a.hasOwnProperty(`reason_${pk}`)) ? a[`reason_${pk}`] : (a.reason || ""),
          actionText: (a.hasOwnProperty(`action_${pk}`)) ? a[`action_${pk}`] : (a.action || ""),
          ee: a.owner || proj.ee || "",
          supplier: a.supplier || "",
          phaseKey: pk,
          phaseName: phaseNames[pk] || pk,
          plan, actual, delay, status,
          file: a[`file_${pk}`] || a.file || "",
          remarks: a[`remarks_${pk}`] || a.remarks || ""
        };

        // apply filters that require row-level knowledge
        if (fTPM) {
          const ownerName = (rowObj.ee || "").toString();
          if (ownerName !== fTPM) return;
        }
        if (fEE) {
          const eeName = (rowObj.ee || "").toString();
          if (eeName !== fEE) return;
        }
        if (fStatus) {
          if (rowObj.status !== fStatus) return;
        }
        // apply search text across several columns
        if (fSearch) {
          const hay = `${rowObj.projectTitle} ${rowObj.projectType} ${rowObj.activity} ${rowObj.model} ${rowObj.phaseName} ${rowObj.question} ${rowObj.reason} ${rowObj.remarks}`.toLowerCase();
          if (!hay.includes(fSearch)) return;
        }

        rows.push(rowObj);
      });
    });
  }

  // render rows
  rows.forEach((r, idx) => {
    const delayCell = (r.delay === null || r.delay === 0) ? "" : `<span class="badge bg-danger">${r.delay}</span>`;
    const statusHtml = r.status === "Completed" ? `<span class="badge bg-success">Completed</span>`
                    : r.status === "Delay" ? `<span class="badge bg-danger">Delay</span>`
                    : `<span class="badge bg-warning text-dark">On Progress</span>`;

    const tr = document.createElement("tr");
    tr.dataset.pid = r.pid;
    tr.dataset.aid = r.aid;
    tr.dataset.phase = r.phaseKey;

    // build remarks value with phaseName (avoid duplication)
    const existingRemark = (r.remarks || "").trim();
    let remarksVal = "";
    if (existingRemark) {
      const escPN = (r.phaseName || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const startsWithPhase = escPN && new RegExp('^' + escPN, 'i').test(existingRemark);
      remarksVal = startsWithPhase ? existingRemark : `${r.phaseName} - ${existingRemark}`;
    } else {
      remarksVal = r.phaseName || "";
    }

    tr.innerHTML = `
      <td class="text-center">${idx + 1}</td>
      <td>${escapeHtml(r.projectTitle)}</td>
      <td>${escapeHtml(r.projectType)}</td>
      <td>${escapeHtml(r.activity)}</td>
      <td>${escapeHtml(r.model)}</td>
      <td><input class="form-control form-control-sm" data-field="question" value="${escapeHtml(r.question)}" disabled></td>
      <td><input class="form-control form-control-sm" data-field="reason" value="${escapeHtml(r.reason)}" disabled></td>
      <td><input class="form-control form-control-sm" data-field="actionText" value="${escapeHtml(r.actionText)}" disabled></td>
      <td>${selectHtml("ee", configData.ee || [], r.ee)}</td>
      <td>${selectHtml("supplier", configData.supplier || [], r.supplier)}</td>
      <td><input type="date" class="form-control form-control-sm" data-field="start_time" value="${r.start||""}" disabled></td>
      <td><input type="date" class="form-control form-control-sm mt-1" data-field="plan_time" value="${r.plan||""}" disabled></td>
      <td><input type="date" class="form-control form-control-sm" data-field="actual_time" value="${r.actual||""}" disabled></td>
      <td class="text-center">${delayCell}</td>
      <td class="text-center">${statusHtml}</td>
      <td><input class="form-control form-control-sm" data-field="file" value="${escapeHtml(r.file)}" disabled></td>
      <td><input class="form-control form-control-sm" data-field="remarks" value="${escapeHtml(remarksVal)}" disabled></td>
      <td class="text-center">
        <button class="btn btn-sm btn-warning open-edit" data-row="${idx}"><i class="bi bi-pencil-square"></i></button>
        <button class="btn btn-sm btn-danger open-del" data-row="${idx}"><i class="bi bi-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // row click handlers for edit/delete
  tbody.onclick = async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const tr = btn.closest("tr");
    if (!tr) return;
    const pid = parseInt(tr.dataset.pid, 10);
    const aid = parseInt(tr.dataset.aid, 10);
    const phase = tr.dataset.phase;
    const phaseNameLocal = (phase && (phaseNames && phaseNames[phase])) ? phaseNames[phase] : (phase || "");

    if (btn.classList.contains("open-del")) {
      if (!confirm("Delete this activity? This will remove the whole activity for the project.")) return;
      const acts = await loadActivitiesFromFirebase(pid);
      acts.splice(aid, 1);
      await saveActivitiesToFirebase(pid, acts);
      renderOpenList();
      return;
    }

    if (btn.classList.contains("open-edit")) {
      const inputs = tr.querySelectorAll("input, select");
      const editing = btn.classList.toggle("editing");
      if (editing) {
        inputs.forEach(x => x.disabled = false);
        btn.innerHTML = '<i class="bi bi-check-lg"></i>';
      } else {
        const acts = await loadActivitiesFromFirebase(pid);
        const actObj = acts[aid] || {};
        const phaseKey = phase;

        // Ambil input dari baris
        const startInp = tr.querySelector('[data-field="start_time"]');
        const planInp = tr.querySelector('[data-field="plan_time"]');
        const actualInp = tr.querySelector('[data-field="actual_time"]');
        const eeSel = tr.querySelector('[data-field="ee"]');
        const suppSel = tr.querySelector('[data-field="supplier"]');
        const questionInp = tr.querySelector('[data-field="question"]');
        const reasonInp = tr.querySelector('[data-field="reason"]');
        const actionInp = tr.querySelector('[data-field="actionText"]');
        const fileInp = tr.querySelector('[data-field="file"]');
        const remarksInp = tr.querySelector('[data-field="remarks"]');

        // Simpan Plan dan Actual sesuai phase
        if (startInp) actObj.start = startInp.value || "";
        if (planInp) actObj[`plan_${phaseKey}`] = planInp.value || "";
        if (actualInp) actObj[`actual_${phaseKey}`] = actualInp.value || "";
        

        // Simpan data tambahan (spesifik per-phase)
        if (questionInp) actObj[`question_${phaseKey}`] = questionInp.value === "" ? "" : questionInp.value;
        if (reasonInp) actObj[`reason_${phaseKey}`] = reasonInp.value === "" ? "" : reasonInp.value;
        if (actionInp) actObj[`action_${phaseKey}`] = actionInp.value === "" ? "" : actionInp.value;
        if (fileInp) actObj[`file_${phaseKey}`] = fileInp.value;
        if (remarksInp) {
          let val = (remarksInp.value || "").trim();
          if (phaseNameLocal) {
            const esc = phaseNameLocal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            val = val.replace(new RegExp('^(?:' + esc + '\\s*-?\\s*)+', 'i'), '');
            val = val.trim();
          }
          actObj[`remarks_${phaseKey}`] = val;
        }

        if (eeSel) actObj.owner = eeSel.value || actObj.owner;
        if (suppSel) actObj.supplier = suppSel.value || actObj.supplier;

        acts[aid] = actObj;
        await saveActivitiesToFirebase(pid, acts);
        renderOpenList();
      }
    }
  };
  showPlaceholderForEmptyDates("#openListBody");
}

// ===============================
// Delay computation helper
// - If actual present -> return actual-plan (days) or null if plan missing
// - If actual empty and plan < today -> return today - plan
// - Else null
// All date inputs are ISO strings (YYYY-MM-DD) from input[type="date"]
// ===============================
function toDateOnly(d) {
  if (!d) return null;
  const dt = (d instanceof Date) ? d : new Date(d);
  // normalize to midnight
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}
// Patch tambahan agar nilai "--" tidak dianggap tanggal
function sanitizeDateValue(value) {
  if (!value || value === "--" || value === "—") return "";
  return value;
}

function computePhaseDelay(planIso, actualIso) {
  try {
    planIso = sanitizeDateValue(planIso);
    actualIso = sanitizeDateValue(actualIso);
    if (!planIso && !actualIso) return null;
    if (actualIso) {
      if (!planIso) return null;
      const p = toDateOnly(planIso);
      const a = toDateOnly(actualIso);
      if (!p || !a) return null;
      const diff = Math.round((a - p) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    } else {
      // actual empty
      if (!planIso) return null;
      const p = toDateOnly(planIso);
      const today = toDateOnly(new Date());
      if (p < today) {
        return Math.round((today - p) / (1000 * 60 * 60 * 24));
      }
      return null;
    }
  } catch (err) {
    return null;
  }
}

// ===============================
// CONFIGURATION MANAGEMENT (System Config Page)
// ===============================
function renderConfigTable() {
  const tbody = document.getElementById("configTableBody");
  if (!tbody) return;
  tbody.innerHTML = Object.keys(configData).map(key => `
    <tr>
      <td>${escapeHtml(key.toUpperCase())}</td>
      <td>${configData[key].map(v => escapeHtml(v)).join(", ")}</td>
      <td><button class="btn btn-sm btn-outline-primary edit-config" data-key="${key}"><i class="bi bi-pencil-square"></i> Edit</button></td>
    </tr>
  `).join("");

  document.querySelectorAll(".edit-config").forEach(btn => {
    btn.onclick = () => openConfigModal(btn.dataset.key);
  });
}

function openConfigModal(key) {
  const modalEl = document.getElementById("configModal");
  if (!modalEl) return alert("Config modal not found.");
  const modal = new bootstrap.Modal(modalEl);
  document.getElementById("configTitle").textContent = `Edit ${key.toUpperCase()}`;
  const list = document.getElementById("configList");
  const input = document.getElementById("configInput");
  const addBtn = document.getElementById("addConfigItem");

  function render() {
    list.innerHTML = configData[key].map((item, i) => `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        ${escapeHtml(item)}
        <button class="btn btn-sm btn-danger del-item" data-i="${i}"><i class="bi bi-trash"></i></button>
      </li>
    `).join("");
    list.querySelectorAll(".del-item").forEach(b => {
      b.onclick = () => {
        configData[key].splice(parseInt(b.dataset.i, 10), 1);
        saveConfig();
        render();
        renderConfigTable();
      };
    });
  }

  addBtn.onclick = () => {
    const val = input.value.trim();
    if (!val) return;
    if (!configData[key].includes(val)) {
      configData[key].push(val);
      input.value = "";
      saveConfig();
      render();
      renderConfigTable();
    } else alert("Item already exists");
  };

  render();
  modal.show();
}

// ===============================
// INITIAL LOAD (optional: if page already loaded and sidebar not clicked)
// ===============================
if (document.readyState === "complete" || document.readyState === "interactive") {
  // If the dashboard page is directly opened (dashboard.html), initialize default view
  if (document.getElementById("main-content") && document.getElementById("page-title")) {
    // default to Project List
    document.getElementById("main-content").innerHTML = `<div class="page active">${pages["project-list"]}</div>`;
    document.getElementById("page-title").textContent = "PROJECT LIST";
    initFilterOptions();
    renderProjectTable();
    showPlaceholderForEmptyDates("#projectBody");
    attachProjectSearchHandler();
  }
}

// ===============================
// Extra: show delay count on hover for date inputs (in activity modal OR tab)
// When mouseenter on a plan/actual input, compute delay for that phase and show title tooltip
// Menampilkan total Delay Days + Reason dari data Open List
// ===============================
document.addEventListener("mouseover", async (e) => {
  const el = e.target;
  if (!el) return;
  const field = el.getAttribute("data-field");
  if (!field || (!field.startsWith("plan_") && !field.startsWith("actual_"))) return;

  const td = el.closest("td");
  const row = el.closest("tr");
  if (!td || !row) return;

  // Determine project id:
  // 1) If inside modal -> modal has data-pid
  // 2) If inside tab -> tr.dataset.pid (we set it)
  let pid = null;
  const modalEl = document.getElementById("activityModal");
  if (modalEl && modalEl.getAttribute("data-pid")) {
    pid = modalEl.getAttribute("data-pid");
  } else {
    // try dataset on row
    pid = row.dataset.pid || null;
  }
  if (pid === null || pid === undefined) return;

  // Tentukan phase (misal "quotation")
  const phase = field.replace("plan_", "").replace("actual_", "");
  const planVal = row.querySelector(`[data-field="plan_${phase}"]`)?.value || "";
  const actualVal = row.querySelector(`[data-field="actual_${phase}"]`)?.value || "";

  // Hitung delay
  const delayDays = computePhaseDelay(planVal, actualVal);
  let tooltip = "";

  if (delayDays && delayDays > 0) {
    tooltip += `Delay: ${delayDays} day${delayDays > 1 ? "s" : ""}`;
  }

  // Ambil reason dari data activity yang tersimpan di localStorage
  try {
    const acts = await loadActivitiesFromFirebase(pid);
    // ambil index row
    const idx = parseInt(row.dataset.i || row.dataset.aid || row.dataset.row || row.rowIndex, 10);
    const act = acts[idx];
    let reason = "";
    let action = "";
    if (phase) {
      reason = (act && Object.prototype.hasOwnProperty.call(act, `reason_${phase}`))
        ? act[`reason_${phase}`]
        : (act?.reason || "");

      action = (act && Object.prototype.hasOwnProperty.call(act, `action_${phase}`))
        ? act[`action_${phase}`]
        : (act?.action || "");
    }
    // Tambahkan ke tooltip
    if (reason) {
      tooltip += (tooltip ? "\n" : "") + `Reason: ${reason}`;
    }
    if (action) {
      tooltip += (tooltip ? "\n" : "") + `Action: ${action}`;
    }

  } catch (err) {
    console.error("Failed to fetch reason:", err);
  }

  el.title = tooltip;
});

// ===============================
// 🔥 FIREBASE SAVE & LOAD FUNCTIONS
// ===============================
async function saveProjectsToFirebase(data) {
  try {
    await set(ref(db, "projects/"), data);
    console.log("✅ Project data saved to Firebase");
  } catch (error) {
    console.error("❌ Error saving to Firebase:", error);
  }
}

async function loadProjectsFromFirebase() {
  try {
    const snapshot = await get(ref(db, "projects/"));
    if (snapshot.exists()) {
      console.log("✅ Project data loaded from Firebase");
      return snapshot.val();
    } else {
      console.warn("⚠️ No project data found in Firebase");
      return [];
    }
  } catch (error) {
    console.error("❌ Error loading from Firebase:", error);
    return [];
  }
}

// Simpan dan load konfigurasi sistem
async function saveConfigToFirebase(config) {
  try {
    await set(ref(db, "config/default"), config);
    console.log("✅ Config saved to Firebase");
  } catch (error) {
    console.error("❌ Error saving config:", error);
  }
}

async function loadConfigFromFirebase() {
  try {
    const snapshot = await get(ref(db, "config/default"));
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.error("❌ Error loading config:", error);
    return {};
  }
}

// Simpan dan load aktivitas project
async function saveActivitiesToFirebase(pid, activities) {
  try {
    await set(ref(db, `activities/${pid}`), activities);
    console.log(`✅ Activities for ${pid} saved`);
  } catch (error) {
    console.error("❌ Error saving activities:", error);
  }
}

async function loadActivitiesFromFirebase(pid) {
  try {
    const snapshot = await get(ref(db, `activities/${pid}`));
    return snapshot.exists() ? snapshot.val() : [];
  } catch (error) {
    console.error("❌ Error loading activities:", error);
    return [];
  }
}

// ===============================
// Utility for external usage
// ===============================
window.computePhaseDelay = computePhaseDelay;
window.renderProjectTable = renderProjectTable;
window.renderOpenList = renderOpenList;
window.renderConfigTable = renderConfigTable;
window.openActivityModal = openActivityModal;
window.renderActivityTableInTab = renderActivityTableInTab;
