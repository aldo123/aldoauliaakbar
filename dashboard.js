// dashboard.js (FINAL — Option 1 storage layout)
// Projects stored as: projects/{PROJECT_ID}/
// Activities stored as: activities/{PROJECT_ID}/{ACTIVITY_ID}
// Project ID format: ddmmyyyyhhmmss (e.g., 04022025131722)
// Activity IDs remain arbitrary (e.g., ACT-12345)
// This file aims to keep all original functions and behavior, adapted to Option 1 storage layout.

import { db, ref, set, get, update, remove, onValue } from "./firebase-config.js";

// ===============================
// LOGIN CHECK & LOGOUT HANDLER
// ===============================
const loggedUser = localStorage.getItem("loggedUser");
if (!loggedUser && !location.pathname.endsWith("index.html")) {
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
// DEFAULT CONFIG
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
loadConfigFromFirebase().then(cfg=>{
  if (Object.keys(cfg||{}).length>0) configData = cfg;
});

async function loadConfigFromFirebase() {
  try {
    const snapshot = await get(ref(db, "config/default"));
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.error("❌ Error loading config:", error);
    return {};
  }
}
// mapping untuk label filter kiri
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


function saveConfig(){
   saveConfigToFirebase(configData); }

// Utility
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function insertBefore(newNode, referenceNode){ referenceNode.parentNode.insertBefore(newNode, referenceNode); }

function ensureFilterLabelLeft(el){
  if (!el) return;
  const id = el.id || "", labelId = id + "LabelLeft";
  let labelEl = document.getElementById(labelId);
  if (!labelEl) {
    labelEl = document.createElement("label");
    labelEl.id = labelId;
    labelEl.setAttribute("for", id);
    labelEl.className = "filter-label-left";
    labelEl.style.marginRight = "8px";
    labelEl.style.fontWeight = "600";
    labelEl.style.color = "#145a32";
    labelEl.style.fontSize = "13px";
    labelEl.style.whiteSpace = "nowrap";
    labelEl.style.display = "inline-block";
    insertBefore(labelEl, el);
  }
  labelEl.textContent = filterTitles[id] || "Filter";
}

function loadOEETPMModule() {
    fetch("oee-tpm.html?ver=" + Date.now())
      .then(res => res.text())
      .then(html => {
         document.getElementById("main-content").innerHTML = html;

         // load CSS
         const link = document.createElement("link");
         link.rel = "stylesheet";
         link.href = "powerBI.css?ver=" + Date.now();
         document.head.appendChild(link);
      });
}

function traceabilitysn() {
    fetch("traceability.html?ver=" + Date.now())
      .then(res => res.text())
      .then(html => {
         document.getElementById("main-content").innerHTML = html;

         // load CSS
         const link = document.createElement("link");
         link.rel = "stylesheet";
         link.href = "powerBI.css?ver=" + Date.now();
         document.head.appendChild(link);
      });
}

function loadRSA() {
    fetch("equipment-downtime.html?ver=" + Date.now())
      .then(res => res.text())
      .then(html => {
         document.getElementById("main-content").innerHTML = html;

         // load CSS
         const link = document.createElement("link");
         link.rel = "stylesheet";
         link.href = "powerBI.css?ver=" + Date.now();
         document.head.appendChild(link);
      });
}

function loadMESReport() {
    fetch("equipment-fpy.html?ver=" + Date.now())
      .then(res => res.text())
      .then(html => {
         document.getElementById("main-content").innerHTML = html;

         // load CSS
         const link = document.createElement("link");
         link.rel = "stylesheet";
         link.href = "powerBI.css?ver=" + Date.now();
         document.head.appendChild(link);
      });
}

function loadPMReport() {
    fetch("pm.html?ver=" + Date.now())
      .then(res => res.text())
      .then(html => {
         document.getElementById("main-content").innerHTML = html;

         // load CSS
         const link = document.createElement("link");
         link.rel = "stylesheet";
         link.href = "powerBI.css?ver=" + Date.now();
         document.head.appendChild(link);
      });
}

function loadtechnician() {
  fetch("technician-performance.html?ver=" + Date.now())
    .then(r => r.text())
    .then(html => {
      document.getElementById("main-content").innerHTML = html;

      const script = document.createElement("script");
      script.type = "module";
      script.src = "technician-performance.js?ver=" + Date.now();
      document.body.appendChild(script);
    });
}

function loadrequestlist() {
  fetch("request-list.html?ver=" + Date.now())
    .then(r => r.text())
    .then(html => {
      document.getElementById("main-content").innerHTML = html;

      const script = document.createElement("script");
      script.type = "module";
      script.src = "request-list.js?ver=" + Date.now();
      document.body.appendChild(script);
    });
}

function loadequipmentlist() {
  fetch("equipmentlist.html?ver=" + Date.now())
    .then(r => r.text())
    .then(html => {
      document.getElementById("main-content").innerHTML = html;

      const script = document.createElement("script");
      script.type = "module";
      script.src = "equipmentlist.js?ver=" + Date.now();
      document.body.appendChild(script);
    });
}

function loadcalibration() {
  fetch("calibration.html?ver=" + Date.now())
    .then(r => r.text())
    .then(html => {
      document.getElementById("main-content").innerHTML = html;

      const script = document.createElement("script");
      script.type = "module";
      script.src = "calibration.js?ver=" + Date.now();
      document.body.appendChild(script);
    });
}

function loadpartlist() {
  fetch("partlist.html?ver=" + Date.now())
    .then(r => r.text())
    .then(html => {
      document.getElementById("main-content").innerHTML = html;

      const script = document.createElement("script");
      script.type = "module";
      script.src = "partlist.js?ver=" + Date.now();
      document.body.appendChild(script);
    });
}

function loadstorage() {
  fetch("storage.html?ver=" + Date.now())
    .then(r => r.text())
    .then(html => {
      document.getElementById("main-content").innerHTML = html;

      const script = document.createElement("script");
      script.type = "module";
      script.src = "storage.js?ver=" + Date.now();
      document.body.appendChild(script);
    });
}

function loadInOut() {
  fetch("inout.html")
    .then(r => r.text())
    .then(html => {
      document.getElementById("main-content").innerHTML = html;

      // CSS
      if (!document.getElementById("inout-css")) {
        const link = document.createElement("link");
        link.id = "inout-css";
        link.rel = "stylesheet";
        link.href = "inout.css";
        document.head.appendChild(link);
      }

      // JS (MODULE)
      const script = document.createElement("script");
      script.type = "module";
      script.src = "inout.js?ver=" + Date.now();
      document.body.appendChild(script);
    });
}

function loadDefectReport() {
    fetch("defect.html?ver=" + Date.now())
      .then(res => res.text())
      .then(html => {
         document.getElementById("main-content").innerHTML = html;

         // load CSS
         const link = document.createElement("link");
         link.rel = "stylesheet";
         link.href = "powerBI.css?ver=" + Date.now();
         document.head.appendChild(link);
      });
}


function loadProjectStateModule() {

  // bersihkan module lama agar reload fresh
  const old = document.querySelectorAll("script[data-ps]");
  old.forEach(s => s.remove());

  fetch("project-state.html?ver=" + Date.now())
    .then(r => r.text())
    .then(html => {

      document.getElementById("main-content").innerHTML = html;

      // inject CSS (cache-buster)
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "project-state.css?ver=" + Date.now();
      document.head.appendChild(link);

      // inject Chart.js (cache-buster)
      const chart = document.createElement("script");
      chart.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
      chart.defer = true;
      chart.setAttribute("data-ps", "1");
      document.body.appendChild(chart);

      // inject project-state.js (cache-buster)
      chart.onload = () => {
        const script = document.createElement("script");
        script.type = "module";
        script.src = "project-state.js?ver=" + Date.now();
        script.setAttribute("data-ps", "1");
        document.body.appendChild(script);
      };

    })
    .catch(err => console.error("Failed loading Project State module:", err));
}



// PAGES snippets (unchanged)
const pages = {
  "project-state": "<div id='projectStateContainer'></div>",
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
      <button id="exportProjectList" class="btn btn-outline-success btn-sm"><i class="bi bi-file-earmark-excel"></i> Export Excel</button>
      <button id="importProjectList" class="btn btn-outline-warning btn-sm"><i class="bi bi-upload"></i> Import Excel</button>
      <input type="file" id="projectImportFile" style="display:none;" accept=".xlsx,.xls" />
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
        <button id="exportActBtn" class="btn btn-outline-success btn-sm"><i class="bi bi-file-earmark-excel"></i> Export Activity</button>
        <button id="importActBtn" class="btn btn-outline-warning btn-sm"><i class="bi bi-upload"></i> Import Activity</button>
        <input type="file" id="importActFile" accept=".xlsx,.xls" style="display:none;">
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
  "request-list": "<h4>Request List</h4><p>All PR/PO documents managed here.</p>",
  "open-list-old": "<h4>Open List (legacy)</h4>",
  "technician-performance": "<h4>Technician Performance</h4><p>Performance from technician</p>",
  "asset-list": "<h4>Asset list</h4><p>All the asset from equipment</p>",
  "device-state": "<h4>Device State</h4><p>EE Device.</p>",
  "part-list": "<div id='partlistLoader'></div>",
  "inout": "<div id='inoutLoader'></div>",
  "storage": "<div id='storageLoader'></div>",
  "equipmentlist": "<div id='equipment-listLoader'></div>",
  "calibration": "<div id='calibration-planLoader'></div>",
  "maintenance-plan": "<div id='maintenance-planLoader'></div>",
  "oee-tpm": "<div id='oeeLoader'></div>",
  "equipment-downtime": "<div id='RSALoader'></div>",
  "equipment-fpy": "<div id='MESLoader'></div>",
  "defect": "<div id='defectLoader'></div>",
  "traceability": "<div id='traceabilityLoader'></div>",
  "file-list": `<h4>Request List</h4><p>All project documents managed here.</p>`,
  "project-state": `<div id="ganttLoader"><p class="text-muted">Loading project state...</p></div>`,
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

// Note: some page snippets are truncated above but original full HTML used in your project should be present.
// TAB management (unchanged)
const tabContainer = document.getElementById("tabContainer");
function openTab(pageKey, title){
  if (!tabContainer) return setActiveTab(pageKey);
  let existingTab = document.querySelector(`.tab[data-page="${pageKey}"]`);
  if (existingTab){ setActiveTab(pageKey); return; }
  const tab = document.createElement("div"); tab.className="tab active"; tab.dataset.page=pageKey;
  tab.innerHTML = `${escapeHtml(title)} <span class="close-tab" title="Close">&times;</span>`;
  tabContainer.appendChild(tab); setActiveTab(pageKey);
  tab.addEventListener("click", (e)=>{ if (e.target.classList.contains("close-tab")) return; setActiveTab(pageKey); 
    if (pageKey === "oee-tpm") loadOEETPMModule(); 
    if (pageKey === "project-state") loadProjectStateModule(); 
    if (pageKey === "equipment-fpy") loadMESReport(); 
    if (pageKey === "equipment-downtime") loadRSA();
    if (pageKey === "defect") loadDefectReport();
    if (pageKey === "maintenance-plan") loadPMReport();
    if (pageKey === "part-list") loadpartlist();
    if (pageKey === "inout") loadInOut();
    if (pageKey === "storage") loadstorage();
    if (pageKey === "request-list") loadrequestlist(); 
    if (pageKey === "equipmentlist") loadequipmentlist(); 
    if (pageKey === "calibration") loadcalibration();
    if (pageKey === "technician-performance") loadtechnician();
    if (pageKey === "traceability") traceabilitysn();});
  tab.querySelector(".close-tab").addEventListener("click", (e)=>{ e.stopPropagation(); tab.remove(); const lastTab=document.querySelector(".tab:last-child"); 
    if (lastTab) setActiveTab(lastTab.dataset.page); else showWelcomePage(); });
}
function setActiveTab(pageKey){
  document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
  const tab = document.querySelector(`.tab[data-page="${pageKey}"]`); if (tab) tab.classList.add("active");
  let contentHtml = pages[pageKey] || "<p>Page under development...</p>";
  if (pageKey && pageKey.startsWith("activity-")) contentHtml = pages["activity-tab-placeholder"];
  document.getElementById("main-content").innerHTML = `<div class="page active">${contentHtml}</div>`;
  document.getElementById("page-title").textContent = pageKey ? pageKey.replace(/-/g," ").toUpperCase() : "";
  if (pageKey === "project-list"){ initFilterOptions(); renderProjectTable(); attachProjectSearchHandler(); }
  else if (pageKey === "open-list"){ initOpenListFilterOptions(); renderOpenList(); }
  else if (pageKey === "system-config"){ renderConfigTable(); }
  else if (pageKey && pageKey.startsWith("activity-")){ const pid = pageKey.split("-").slice(1).join("-"); renderActivityTableInTab(pid); }
}
function showWelcomePage(){ document.getElementById("main-content").innerHTML = `<div class="text-center p-4"><h4>Welcome to WIK-TPM Dashboard</h4><p>Select a menu from the sidebar to view content.</p></div>`; document.getElementById("page-title").textContent="Dashboard Overview"; }

// Sidebar handler
//document.querySelectorAll(".menu li[data-page]").forEach(item=>{ item.addEventListener("click", ()=>{ const key=item.getAttribute("data-page"); const title=item.textContent.trim(); openTab(key,title); if (key==="project-state") loadProjectStateModule(); }); });
// === Dropdown Handler for Analytical Tools ===
document.querySelectorAll(".menu li[data-page]").forEach(item => {
    item.addEventListener("click", () => {
        const key = item.getAttribute("data-page");
        const title = item.textContent.trim();

        openTab(key, title);

        if (key === "oee-tpm") {
            loadOEETPMModule();
        }
        else if (key === "project-state") {
            loadProjectStateModule();
        }
        else if (key === "equipment-fpy") {
            loadMESReport();
        }
        else if (key === "equipment-downtime") {
            loadRSA();
        }
        else if (key === "defect") {
            loadDefectReport();
        }
        else if (key === "maintenance-plan") {
            loadPMReport();
        }
        else if (key === "traceability") {
            traceabilitysn();
        }
        else if (key === "part-list") {
            loadpartlist();
        }
        else if (key === "inout") {
            loadInOut();
        }
        else if (key === "storage") {
            loadstorage();
        }
        else if (key === "calibration") {
            loadcalibration();
        }
        else if (key === "equipmentlist") {
            loadequipmentlist();
        }
        else if (key === "request-list") {
            loadrequestlist();
        }
        else if (key === "technician-performance") {
            loadtechnician();
        }

    });
});

// ===============================
// PROJECT DATA (Option 1 storage)
// projects stored at: projects/{projectId} (object per id)
// We'll maintain projectData as array of objects {id, ...}
// ===============================
let projectData = [];

// load once at startup
loadProjectsFromFirebase().then(data=>{
  projectData = Array.isArray(data) ? data : (data || []);
  renderProjectTable(projectData);
});

// realtime listeners to keep UI in sync
onValue(ref(db, "projects/"), (snapshot)=>{
  if (snapshot.exists()){
    const val = snapshot.val();
    if (typeof val === "object" && !Array.isArray(val)) {
      projectData = Object.entries(val).map(([id,obj]) => ({ id, ...obj }));
    } else {
      projectData = val || [];
    }
    renderProjectTable(projectData);
    console.log("🔁 Project data updated in real-time");
  }
});
onValue(ref(db, "activities/"), (snapshot)=>{
  if (!snapshot.exists()) return;
  console.log("🔁 Activities updated in real-time");
  clearTimeout(window._refreshDelayTimer);
  window._refreshDelayTimer = setTimeout(()=>{
    const activeTab = document.querySelector(".tab.active");
    if (activeTab && activeTab.dataset.page && activeTab.dataset.page.startsWith("activity-")){
      const pid = activeTab.dataset.page.split("-").slice(1).join("-");
      renderActivityTableInTab(pid);
      setTimeout(()=>markDelaysInActivityTable(document),600);
    }
  },400);
});

// Helpers for rendering
const selectHtml = (f, opts, v, disabled=true) => `<select id="${f}" class="form-select form-select-sm" data-field="${f}" ${disabled?"disabled":""}>${opts.map(o=>`<option ${o===v?"selected":""}>${escapeHtml(o)}</option>`).join("")}</select>`;
const dateCellHtml = (f,v,disabled=true) => `<input type="date" class="form-control form-control-sm" data-field="${f}" value="${v||""}" ${disabled?"disabled":""}>`;

// init filters
function initFilterOptions(){
  const fill=(id,arr)=>{ const el=document.getElementById(id); if(!el) return; el.innerHTML=`<option value="">All</option>`+arr.map(a=>`<option>${escapeHtml(a)}</option>`).join(""); ensureFilterLabelLeft(el); };
  fill("filterType", configData.type||[]); fill("filterModel", configData.model||[]); fill("filterSite", configData.site||[]);
  fill("filterTPM", configData.tpm||[]); fill("filterEE", configData.ee||[]); ensureFilterLabelLeft(document.getElementById("filterStatus"));
  ["filterType","filterModel","filterSite","filterTPM","filterEE","filterStatus"].forEach(id=>{ const el=document.getElementById(id); if(!el) return; el.onchange=el.oninput=()=>{ ensureFilterLabelLeft(el); applyProjectFiltersAndRender(); }; });
}
function applyProjectFiltersAndRender(){
  const ft=(document.getElementById("filterType")?.value||"").trim();
  const fm=(document.getElementById("filterModel")?.value||"").trim();
  const fs=(document.getElementById("filterSite")?.value||"").trim();
  const ftp=(document.getElementById("filterTPM")?.value||"").trim();
  const fee=(document.getElementById("filterEE")?.value||"").trim();
  const fst=(document.getElementById("filterStatus")?.value||"").trim();
  const filtered = projectData.filter(p=>{
    let ok=true;
    if(ft && p.type!==ft) ok=false;
    if(fm && p.model!==fm) ok=false;
    if(fs && p.site!==fs) ok=false;
    if(ftp && p.tpm!==ftp) ok=false;
    if(fee && p.ee!==fee) ok=false;
    if(fst){
      const fields=["gate1","gate2","fot","er1","er2","er3","pr","sop"];
      const completed = fields.every(f=>p[f]);
      const delayed = fields.some(f=>p[f] && new Date(p[f]) < toDateOnly(new Date()) && !p[`actual_${f}`]);
      const status = completed ? "Completed" : (delayed ? "Delay" : "On Progress");
      if(status !== fst) ok=false;
    }
    return ok;
  });
  renderProjectTable(filtered);
}

// init open list filters
function initOpenListFilterOptions(){
  const fill=(id,arr)=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.innerHTML=`<option value="">All</option>`+
      arr.map(a=>`<option>${escapeHtml(a)}</option>`).join("");
    ensureFilterLabelLeft(el);
  };

  fill("openFilterType", configData.type||[]);
  fill("openFilterModel", configData.model||[]);
  fill("openFilterSite", configData.site||[]);
  fill("openFilterTPM", configData.tpm||[]);
  fill("openFilterEE", configData.ee||[]);

  ensureFilterLabelLeft(document.getElementById("openFilterStatus"));

  const openSearchEl=document.getElementById("openSearch");
  if(openSearchEl){
    let lbl=document.getElementById("openSearchLabelLeft");
    if(!lbl){
      lbl=document.createElement("label");
      lbl.id="openSearchLabelLeft";
      lbl.className="filter-label-left";
      lbl.style.marginRight="8px";
      lbl.style.fontWeight="600";
      lbl.style.color="#145a32";
      lbl.style.fontSize="13px";
      lbl.style.whiteSpace="nowrap";
      lbl.style.display="inline-block";
      insertBefore(lbl, openSearchEl);
    }
    lbl.textContent=filterTitles["openSearch"]||"Search";
  }

  attachOpenListSearchHandler();

  // ==========================================
  // DEFAULT: Set Status = Delay, bukan All
  // ==========================================
  const statusEl = document.getElementById("openFilterStatus");
  if (statusEl) {
    statusEl.value = "Delay";   // default wajib Delay
  }

}

function attachOpenListSearchHandler(){ const btn=document.getElementById("openBtnSearch"); const refresh=document.getElementById("openRefresh"); const inputs=["openFilterType","openFilterModel","openFilterSite","openFilterTPM","openFilterEE","openFilterStatus","openSearch"]; if(btn) btn.onclick=()=>{ renderOpenList(); }; if(refresh) refresh.onclick=()=>renderOpenList(); inputs.forEach(id=>{ const el=document.getElementById(id); if(!el) return; el.onchange=el.oninput=()=>{ ensureFilterLabelLeft(el); renderOpenList(); }; }); }

// renderProjectTable — uses stable project.id (ddmmyyyyhhmmss)
function renderProjectTable(filtered=null){
  const tbody = document.getElementById("projectBody");
  if(!tbody) return;
  const rows = (filtered || projectData);
  tbody.innerHTML = "";
  rows.forEach((p,i)=>{
    if(!p.id) p.id = generateProjectId();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="text-center">${i+1}</td>
      <td><input class="form-control form-control-sm project-title" data-field="title" value="${escapeHtml(p.title||"")}" disabled></td>
      ${wrapTd(selectHtml("type", configData.type, p.type))}
      ${wrapTd(selectHtml("model", configData.model, p.model))}
      ${wrapTd(selectHtml("site", configData.site, p.site))}
      ${wrapTd(selectHtml("tpm", configData.tpm, p.tpm))}
      ${wrapTd(selectHtml("ee", configData.ee, p.ee))}
      <td class="text-center"><button class="btn btn-sm btn-outline-info view-act" data-pid="${escapeHtml(p.id)}"><i class="bi bi-eye"></i></button></td>
      ${wrapTd(dateCellHtml("gate1", p.gate1))}
      ${wrapTd(dateCellHtml("gate2", p.gate2))}
      ${wrapTd(dateCellHtml("fot", p.fot))}
      ${wrapTd(dateCellHtml("er1", p.er1))}
      ${wrapTd(dateCellHtml("er2", p.er2))}
      ${wrapTd(dateCellHtml("er3", p.er3))}
      ${wrapTd(dateCellHtml("pr", p.pr))}
      ${wrapTd(dateCellHtml("sop", p.sop))}
      <td class="text-center">
        <button class="btn btn-sm btn-warning edit-btn" data-pid="${escapeHtml(p.id)}"><i class="bi bi-pencil-square"></i></button>
        <button class="btn btn-sm btn-danger del-btn" data-pid="${escapeHtml(p.id)}"><i class="bi bi-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);

    tr.querySelector(".view-act").onclick = (ev) => {
      const pid = ev.currentTarget.dataset.pid;
      const pageKey = `activity-${pid}`;
      openTab(pageKey, `Activity — ${p.title || 'Project'}`);
    };
    tr.querySelector(".edit-btn").onclick = (ev) => {
      const pid = ev.currentTarget.dataset.pid;
      const idx = projectData.findIndex(x=>x.id===pid);
      if (idx!==-1) toggleEditProjectRow(tr, idx);
    };
    tr.querySelector(".del-btn").onclick = async (ev) => {
      const pid = ev.currentTarget.dataset.pid;
      if (confirm("Delete project and its activities?")) {
        await deleteProject(pid);
        projectData = await loadProjectsFromFirebase();
        renderProjectTable(projectData);
        applyProjectFiltersAndRender();
      }
    };
  });

  // style dates
  const today = new Date();
  tbody.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.value) return;
    const dateVal = new Date(input.value);
    input.style.transition = "background-color 0.3s ease";
    if (dateVal < today) { input.style.backgroundColor = "#d1e7dd"; input.style.color = "#0f5132"; input.style.fontWeight = "600"; }
    else { input.style.backgroundColor = "#fff3cd"; input.style.color = "#664d03"; input.style.fontWeight = "600"; }
  });

  const addBtn = document.getElementById("addTaskBtn");
  document.getElementById("exportProjectList").onclick = () => {
      exportProjectListToExcel(projectData);
  };

  // IMPORT
  document.getElementById("importProjectList").onclick = () => {
      document.getElementById("projectImportFile").click();
  };

  document.getElementById("projectImportFile").onchange = (e) => {
      handleProjectListImport(e.target.files[0]);
  };


  showPlaceholderForEmptyDates("#projectBody");
  if (addBtn) {
    addBtn.onclick = async () => {
      const newProj = {
        id: generateProjectId(),
        title: "New Project",
        type: configData.type[0]||"",
        model: configData.model[0]||"",
        site: configData.site[0]||"",
        tpm: configData.tpm[0]||"",
        ee: configData.ee[0]||""
      };
      projectData.push(newProj);
      await saveProjects();
      applyProjectFiltersAndRender();
    };
  }
}
function wrapTd(inner){ return `<td>${inner}</td>`; }

// placeholder helper
function showPlaceholderForEmptyDates(containerSelector="body"){
  document.querySelectorAll(`${containerSelector} input[type="date"]`).forEach(input=>{
    if (!input.value || input.value==="--") {
      input.type="text"; input.value="--"; input.style.textAlign="center"; input.style.color="#888"; input.classList.add("placeholder-date");
      input.addEventListener("focus", ()=>{ input.type="date"; if (input.value==="--") input.value=""; });
    } else if (input.value==="--") { input.type="date"; input.value=""; }
  });
}

// toggle edit row
function toggleEditProjectRow(row, index){
  const btn = row.querySelector(".edit-btn");
  const editing = btn.classList.toggle("editing");
  const inputs = row.querySelectorAll("input, select");
  if (editing) { inputs.forEach(x=>x.disabled=false); btn.innerHTML='<i class="bi bi-check-lg"></i>'; }
  else {
    const obj = {};
    inputs.forEach(inp=>{ const f=inp.dataset.field||inp.getAttribute("data-field")||inp.className; if (inp.classList.contains("project-title")) obj.title=inp.value; else if (f) obj[f]=inp.value; });
    const proj = projectData[index];
    Object.assign(proj, obj);
    saveProjects();
    applyProjectFiltersAndRender();
  }
}
async function saveProjects(){
  // Option 1: save each project under projects/{projectId}
  try {
    const updates = [];
    for (const p of projectData) {
      if (!p.id) p.id = generateProjectId();
      await set(ref(db, `projects/${p.id}`), p);
    }
    console.log("✅ Projects saved (per-ID) to Firebase");
  } catch (err) { console.error("❌ Error saving projects:", err); }
}

// Attach search handler
function attachProjectSearchHandler(){ const btn=document.getElementById("btnSearchProjects"); if(!btn) return; btn.onclick=()=>{ applyProjectFiltersAndRender(); }; }

// ACTIVITY logic (modal & tab) - preserved behavior, now uses activities/{projectId}/{activityId}
const activityDateFields = ["req","design","quotation","io","prpo","d3","cnc","assembly","eta","debugging","aging","validation","trial","pr","sop"];
function markDelaysInActivityTable(containerEl=document){
  const root = (containerEl && containerEl.querySelector) ? containerEl : document;
  const rows = root.querySelectorAll("#activityTable tbody tr, #activityTableTab tbody tr");
  rows.forEach(row=>{
    activityDateFields.forEach(k=>{
      const planInput = row.querySelector(`[data-field="plan_${k}"]`);
      const actualInput = row.querySelector(`[data-field="actual_${k}"]`);
      if (!planInput) return;
      const planValRaw = planInput.value?.trim()||"";
      const actualValRaw = actualInput?.value?.trim()||"";
      const planVal = (planValRaw==="--"||planValRaw==="—")?"":planValRaw;
      const actualVal = (actualValRaw==="--"||actualValRaw==="—")?"":actualValRaw;
      [planInput, actualInput].forEach(inp=>{ if(inp){ inp.style.backgroundColor=""; inp.classList.remove("border-danger"); } });
      if(!planVal) return;
      const planDate = toDateOnly(planVal);
      const actualDate = actualVal ? toDateOnly(actualVal) : null;
      const today = toDateOnly(new Date());
      let color = "", isDelay = false;
      if (actualDate && actualDate > planDate) { color="#f8d7da"; isDelay=true; }
      else if (!actualDate && planDate < today) { color="#f8d7da"; isDelay=true; }
      else if (!actualDate && planDate >= today) { color="#fff3cd"; }
      else if (actualDate && actualDate <= planDate) { color="#d1e7dd"; }
      [planInput, actualInput].forEach(inp=>{ if (inp && color) inp.style.backgroundColor = color; });
      if (isDelay){ if (planInput) planInput.classList.add("border-danger"); if (actualInput && !actualVal) actualInput.classList.add("border-danger"); }
    });
  });
}

// openActivityModal uses activities/{pid}
function openActivityModal(pid){
  const modalEl = document.getElementById("activityModal");
  if(!modalEl) return alert("Activity modal not found in HTML.");
  const modal = new bootstrap.Modal(modalEl);
  modalEl.setAttribute("data-pid", pid);
  let data = [];
  loadActivitiesFromFirebase(pid).then(acts=>{ data = acts || []; render(); });

  const tbody = modalEl.querySelector("#activityTable tbody");
  const ownerOpts = Array.from(new Set([...(configData.ee||[]), ...(configData.tpm||[])]));
  const siteOpts = configData.site || [];
  const supplierOpts = configData.supplier || [];

  function render(){
    tbody.innerHTML = "";
    data.forEach((a,i)=>{
      a.activity = a.activity||"";
      a.site = a.site||siteOpts[0]||"";
      a.owner = a.owner||ownerOpts[0]||"";
      a.level = a.level||"";
      a.supplier = a.supplier||supplierOpts[0]||"";
      activityDateFields.forEach(k=>{ if (a[`plan_${k}`]===undefined) a[`plan_${k}`]=a[k]||""; if (a[`actual_${k}`]===undefined) a[`actual_${k}`]=""; });
      const singleDateCell = (k)=>{ const plan=a[`plan_${k}`]||""; const act=a[`actual_${k}`]||""; return `<td><input type="date" class="form-control form-control-sm mb-1" data-field="plan_${k}" value="${plan}" disabled><input type="date" class="form-control form-control-sm" data-field="actual_${k}" value="${act}" disabled></td>`; };
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
    showPlaceholderForEmptyDates("#activityTable tbody");
    markDelaysInActivityTable(modalEl);
    modal.show();
  }

  tbody.onclick = async (e)=>{
    const btn = e.target.closest("button");
    if(!btn) return;
    const i = parseInt(btn.dataset.i,10);
    if (btn.classList.contains("del-act")) {
      if (!confirm("Delete activity?")) return;
      await deleteActivity(pid, data[i].id);
      data = await loadActivitiesFromFirebase(pid);
      render(); return;
    }
    if (btn.classList.contains("edit-act")) {
      const row = btn.closest("tr");
      const inputs = row.querySelectorAll("input, select");
      const toggled = btn.classList.toggle("editing");
      if (toggled) { inputs.forEach(x=>x.disabled=false); btn.innerHTML='<i class="bi bi-check-lg"></i>'; }
      else {
        const arr = Array.from(inputs); let idx = 0; const obj={};
        obj.activity = arr[idx++].value; obj.site = arr[idx++].value; obj.owner = arr[idx++].value;
        activityDateFields.forEach(k=>{ obj[`plan_${k}`] = arr[idx++].value; obj[`actual_${k}`] = arr[idx++].value; });
        obj.level = arr[idx++].value; obj.supplier = arr[idx++].value;
        const actId = data[i].id;
        await saveSingleActivity(pid, actId, { ...data[i], ...obj });
        data = await loadActivitiesFromFirebase(pid);
        render(); showPlaceholderForEmptyDates("#activityTable tbody");
      }
    }
  };

  const addBtn = modalEl.querySelector("#addActivityBtn");
  addBtn.onclick = async ()=>{
    const actId = generateActivityId();
    await saveSingleActivity(pid, actId, { activity:"New Task", site:siteOpts[0]||"", owner:ownerOpts[0]||"", open_pic: ownerOpts[0], supplier:supplierOpts[0]||"", level:"" });
    data = await loadActivitiesFromFirebase(pid); render();
    phaseKeys.forEach(pk=>{
      actObj[`open_pic_${pk}`] = actObj.owner;
    });
  };

  const searchInput = modalEl.querySelector("#searchActivity");
  if (searchInput) searchInput.oninput = ()=>{ const v = searchInput.value.toLowerCase(); tbody.querySelectorAll("tr").forEach(r=>{ r.style.display = r.innerText.toLowerCase().includes(v) ? "" : "none"; }); };

  render();
  showPlaceholderForEmptyDates("#activityTable tbody");
}

// renderSelectHtml (unchanged)
function renderSelectHtml(name, options=[], selected=""){
  return `<select class="form-select form-select-sm" data-field="${name}" disabled>${options.map(o=>`<option ${o===selected?"selected":""}>${escapeHtml(o)}</option>`).join("")}</select>`;
}

// Activity in tab (preserve behavior)
async function renderActivityTableInTab(pid){
  const container = document.getElementById("main-content"); if(!container) return;
  if(!container.querySelector("#activityTableTab")) container.innerHTML = pages["activity-tab-placeholder"];
  const tb = document.getElementById("activityTableTab"); if(!tb) return;
  const tbodyFinal = tb.querySelector("tbody"); tbodyFinal.innerHTML = "";
  const data = await loadActivitiesFromFirebase(pid);
  populateActivityTab(Array.isArray(data)?data:[]);
  function populateActivityTab(data){
    const ownerOpts = Array.from(new Set([...(configData.ee||[]), ...(configData.tpm||[])]));
    const siteOpts = configData.site || [];
    const supplierOpts = configData.supplier || [];
    tbodyFinal.innerHTML = "";
    data.forEach((a,i)=>{
      a.activity = a.activity||""; a.site = a.site||siteOpts[0]||""; a.owner = a.owner||ownerOpts[0]||""; a.level = a.level||""; a.supplier = a.supplier||supplierOpts[0]||"";
      activityDateFields.forEach(k=>{ if(a[`plan_${k}`]===undefined) a[`plan_${k}`]=a[k]||""; if(a[`actual_${k}`]===undefined) a[`actual_${k}`]=""; });
      const tr = document.createElement("tr"); tr.dataset.pid = pid; tr.dataset.i = i;
      tr.innerHTML = `<td class="text-center">${i+1}</td><td><input class="form-control form-control-sm" data-field="activity" value="${escapeHtml(a.activity)}" disabled></td><td>${renderSelectHtml("site", siteOpts, a.site)}</td><td>${renderSelectHtml("owner", ownerOpts, a.owner)}</td>${activityDateFields.map(k=>`<td><input type="date" class="form-control form-control-sm mb-1" data-field="plan_${k}" value="${a[`plan_${k}`]||""}" disabled><input type="date" class="form-control form-control-sm" data-field="actual_${k}" value="${a[`actual_${k}`]||""}" disabled></td>`).join("")}<td><input class="form-control form-control-sm" data-field="level" value="${escapeHtml(a.level)}" disabled></td><td>${renderSelectHtml("supplier", supplierOpts, a.supplier)}</td><td><div class="d-flex gap-1"><button class="btn btn-sm btn-outline-primary edit-act-tab" data-i="${i}"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-outline-danger del-act-tab" data-i="${i}"><i class="bi bi-trash"></i></button></div></td>`;
      tbodyFinal.appendChild(tr);
    });
  }

  tb.querySelectorAll(".del-act-tab").forEach(b=>{ b.onclick = async ()=>{ const idx = parseInt(b.dataset.i,10); if(!confirm("Delete activity?")) return; const acts = await loadActivitiesFromFirebase(pid); await deleteActivity(pid, acts[idx].id); renderActivityTableInTab(pid); }; });
  tb.querySelectorAll(".edit-act-tab").forEach(b=>{ b.onclick = async (e)=>{ const btn = e.currentTarget; const idx = parseInt(btn.dataset.i,10); const row = btn.closest("tr"); const inputs = row.querySelectorAll("input, select"); const toggled = btn.classList.toggle("editing"); if(toggled){ inputs.forEach(x=>x.disabled=false); btn.innerHTML='<i class="bi bi-check-lg"></i>'; } else { const arr = Array.from(inputs); let p=0; const obj={}; obj.activity = arr[p++].value; obj.site = arr[p++].value; obj.owner = arr[p++].value; activityDateFields.forEach(k=>{ obj[`plan_${k}`] = arr[p++].value; obj[`actual_${k}`] = arr[p++].value; }); obj.level = arr[p++].value; obj.supplier = arr[p++].value; const acts = await loadActivitiesFromFirebase(pid); const actId = acts[idx].id; await saveSingleActivity(pid, actId, { ...acts[idx], ...obj }); renderActivityTableInTab(pid); } }; });

  setTimeout(()=>{ const addGlobal = document.getElementById("addActivityGlobal"); if(!addGlobal) return; addGlobal.onclick = async ()=>{ const actId = generateActivityId(); await saveSingleActivity(pid, actId, { activity:"New Task", site:configData.site[0]||"", owner:configData.ee[0]||configData.tpm[0]||"", supplier:configData.supplier[0]||"", level:"" }); renderActivityTableInTab(pid); }; setTimeout(()=>{ showPlaceholderForEmptyDates("#activityTableTab tbody"); setTimeout(()=>{ markDelaysInActivityTable(document); },500); },300); },400);
  setTimeout(()=>{ const exportBtn = document.getElementById("exportActBtn"); if (exportBtn) {exportBtn.onclick = () => exportActivityToExcel(pid);}const importBtn = document.getElementById("importActBtn");const importFile = document.getElementById("importActFile");if (importBtn && importFile) {importBtn.onclick = () => importFile.click();importFile.onchange = (e) => {importActivityFromExcel(pid, e.target.files[0]);};}}, 500);

}

// OPEN LIST (preserve behavior) — iterates projectData and reads activities per project
async function renderOpenList(){
  const tbody = document.getElementById("openListBody"); if(!tbody) return; tbody.innerHTML="";
  const fType = (document.getElementById("openFilterType")?.value||"").trim();
  const fModel = (document.getElementById("openFilterModel")?.value||"").trim();
  const fSite = (document.getElementById("openFilterSite")?.value||"").trim();
  const fTPM = (document.getElementById("openFilterTPM")?.value||"").trim();
  const fEE = (document.getElementById("openFilterEE")?.value||"").trim();
  const fStatus = (document.getElementById("openFilterStatus")?.value||"").trim();
  const fSearch = (document.getElementById("openSearch")?.value||"").toLowerCase().trim();

  const phaseKeys = ["req","design","quotation","io","prpo","d3","cnc","assembly","eta","debugging","aging","validation","trial","pr","sop"];
  const phaseNames = { req:"Requirement Validation", design:"Design", quotation:"Quotation", io:"IO", prpo:"PR/PO", d3:"3D Design", cnc:"Fabrication (CNC)", assembly:"Assembly", eta:"ETA", debugging:"Debugging", aging:"Aging Test", validation:"Validation", trial:"Trial Run", pr:"Pilot Run", sop:"SOP" };

  let rows = [];
  for (let idx=0; idx<projectData.length; idx++){
    const proj = projectData[idx]; const pid = proj.id;
    if (fType && proj.type!==fType) continue;
    if (fModel && proj.model!==fModel) continue;
    if (fSite && proj.site!==fSite) continue;
    const acts = await loadActivitiesFromFirebase(pid) || [];
    acts.forEach((a,aid)=>{
      phaseKeys.forEach(pk=>{
        const plan = a[`plan_${pk}`]||""; const actual = a[`actual_${pk}`]||""; const delay = computePhaseDelay(plan, actual); const today=toDateOnly(new Date());
        const planDate = plan && plan!=="--" ? toDateOnly(plan) : null;
        const actualDate = actual && actual!=="--" ? toDateOnly(actual) : null;
        let status = "On Progress";
        if (actualDate && planDate) status="Completed"; 
        else if (!actualDate && planDate && planDate<today) status="Delay";
        else if (!planDate) status="On Progress";
        const start = a.start || a[`start_${pk}`] || "";
        const rowObj = { pid, aid, projectTitle: proj.title||"", projectType: proj.type||"", activity: a.activity||"", model: proj.model||"", start,
          question: (a.hasOwnProperty(`question_${pk}`))?a[`question_${pk}`]:(a.question||""), reason:(a.hasOwnProperty(`reason_${pk}`))?a[`reason_${pk}`]:(a.reason||""), actionText:(a.hasOwnProperty(`action_${pk}`))?a[`action_${pk}`]:(a.action||""), open_pic: a[`open_pic_${pk}`] || a.owner || proj.ee || "", supplier: a.supplier||"", phaseKey: pk, phaseName: phaseNames[pk]||pk, plan, actual, delay, status, file: a[`file_${pk}`]||a.file||"", remarks: a[`remarks_${pk}`]||a.remarks||"" };
        if (fTPM){ const ownerName = (rowObj.ee||"").toString(); if(ownerName!==fTPM) return; }
        if (fEE && rowObj.open_pic !== fEE) return;
        if (fStatus){ if(rowObj.status!==fStatus) return; }
        if (fSearch){ const hay = `${rowObj.projectTitle} ${rowObj.projectType} ${rowObj.activity} ${rowObj.model} ${rowObj.phaseName} ${rowObj.question} ${rowObj.reason} ${rowObj.remarks}`.toLowerCase(); if(!hay.includes(fSearch)) return; }
        rows.push(rowObj);
      });
    });
  }

  rows.forEach((r,idx)=>{
    const delayCell = (r.delay===null||r.delay===0) ? "" : `<span class="badge bg-danger">${r.delay}</span>`;
    const statusHtml = r.status==="Completed" ? `<span class="badge bg-success">Completed</span>` : r.status==="Delay" ? `<span class="badge bg-danger">Delay</span>` : `<span class="badge bg-warning text-dark">On Progress</span>`;
    const tr = document.createElement("tr"); tr.dataset.pid = r.pid; tr.dataset.aid = r.aid; tr.dataset.phase = r.phaseKey;
    const existingRemark = (r.remarks||"").trim(); let remarksVal = "";
    if (existingRemark){ const escPN = (r.phaseName||"").replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); const startsWithPhase = escPN && new RegExp('^'+escPN,'i').test(existingRemark); remarksVal = startsWithPhase ? existingRemark : `${r.phaseName} - ${existingRemark}`; } else remarksVal = r.phaseName || "";
    //tr.innerHTML = `<td class="text-center">${idx+1}</td><td>${escapeHtml(r.projectTitle)}</td><td>${escapeHtml(r.projectType)}</td><td>${escapeHtml(r.activity)}</td><td>${escapeHtml(r.model)}</td><td><input class="form-control form-control-sm" data-field="question" value="${escapeHtml(r.question)}" disabled></td><td><input class="form-control form-control-sm" data-field="reason" value="${escapeHtml(r.reason)}" disabled></td><td><input class="form-control form-control-sm" data-field="actionText" value="${escapeHtml(r.actionText)}" disabled></td><td>${selectHtml("open_pic", configData.ee||[], r.open_pic)}</td><td>${selectHtml("supplier", configData.supplier||[], r.supplier)}</td><td><input type="date" class="form-control form-control-sm" data-field="start_time" value="${r.start||""}" disabled></td><td><input type="date" class="form-control form-control-sm mt-1" data-field="plan_time" value="${r.plan||""}" disabled></td><td><input type="date" class="form-control form-control-sm" data-field="actual_time" value="${r.actual||""}" disabled></td><td class="text-center">${delayCell}</td><td class="text-center">${statusHtml}</td><td><input class="form-control form-control-sm" data-field="file" value="${escapeHtml(r.file)}" disabled></td><td><input class="form-control form-control-sm" data-field="remarks" value="${escapeHtml(remarksVal)}" disabled></td><td class="text-center"><button class="btn btn-sm btn-warning open-edit" data-row="${idx}"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-danger open-del" data-row="${idx}"><i class="bi bi-trash"></i></button></td>`;
    tr.innerHTML = `<td class="text-center">${idx+1}</td><td>${escapeHtml(r.projectTitle)}</td><td>${escapeHtml(r.projectType)}</td><td>${escapeHtml(r.activity)}</td><td>${escapeHtml(r.model)}</td><td><input class="form-control form-control-sm" data-field="question" value="${escapeHtml(r.question)}" disabled></td><td><input class="form-control form-control-sm" data-field="reason" value="${escapeHtml(r.reason)}" disabled></td><td><input class="form-control form-control-sm" data-field="actionText" value="${escapeHtml(r.actionText)}" disabled></td><td>${selectHtml("open_pic", configData.ee||[], r.open_pic)}</td><td>${selectHtml("supplier", configData.supplier||[], r.supplier)}</td><td><input type="date" class="form-control form-control-sm" data-field="start_time" value="${r.start||""}" disabled></td><td><input type="date" class="form-control form-control-sm mt-1" data-field="plan_time" value="${r.plan||""}" disabled></td><td><input type="date" class="form-control form-control-sm" data-field="actual_time" value="${r.actual||""}" disabled></td><td class="text-center">${delayCell}</td><td class="text-center">${statusHtml}</td><td><input class="form-control form-control-sm" data-field="file" value="${escapeHtml(r.file)}" disabled></td><td><input class="form-control form-control-sm" data-field="remarks" value="${escapeHtml(remarksVal)}" disabled></td><td class="text-center"><button class="btn btn-sm btn-warning open-edit" data-row="${idx}"><i class="bi bi-pencil-square"></i></button>`;
    tbody.appendChild(tr);
  });

  tbody.onclick = async (e)=>{
    const btn = e.target.closest("button"); if(!btn) return; const tr = btn.closest("tr"); if(!tr) return;
    const pid = tr.dataset.pid; const aid = parseInt(tr.dataset.aid,10); const phase = tr.dataset.phase; const phaseNameLocal = (phase && (phaseNames && phaseNames[phase])) ? phaseNames[phase] : (phase||"");
    //if (btn.classList.contains("open-del")){ if(!confirm("Delete this activity? This will remove the whole activity for the project.")) return; const acts = await loadActivitiesFromFirebase(pid); await deleteActivity(pid, acts[aid].id); renderOpenList(); return; }
    if (btn.classList.contains("open-edit")){ const inputs = tr.querySelectorAll("input, select"); const editing = btn.classList.toggle("editing"); if(editing){ inputs.forEach(x=>x.disabled=false); btn.innerHTML='<i class="bi bi-check-lg"></i>'; } else { const acts = await loadActivitiesFromFirebase(pid); const actObj = acts[aid]||{}; const phaseKey = phase; const startInp = tr.querySelector('[data-field="start_time"]'); const planInp = tr.querySelector('[data-field="plan_time"]'); const actualInp = tr.querySelector('[data-field="actual_time"]'); const eeSel = tr.querySelector('[data-field="open_pic"]'); const suppSel = tr.querySelector('[data-field="supplier"]'); const questionInp = tr.querySelector('[data-field="question"]'); const reasonInp = tr.querySelector('[data-field="reason"]'); const actionInp = tr.querySelector('[data-field="actionText"]'); const fileInp = tr.querySelector('[data-field="file"]'); const remarksInp = tr.querySelector('[data-field="remarks"]'); if(startInp) actObj.start = startInp.value || ""; if(planInp) actObj[`plan_${phaseKey}`] = planInp.value || ""; if(actualInp) actObj[`actual_${phaseKey}`] = actualInp.value || ""; if(questionInp) actObj[`question_${phaseKey}`] = questionInp.value===""? "": questionInp.value; if(reasonInp) actObj[`reason_${phaseKey}`] = reasonInp.value===""? "": reasonInp.value; if(actionInp) actObj[`action_${phaseKey}`] = actionInp.value===""? "": actionInp.value; if(fileInp) actObj[`file_${phaseKey}`] = fileInp.value; if(remarksInp){ let val = (remarksInp.value||"").trim(); if(phaseNameLocal){ const esc = phaseNameLocal.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); val = val.replace(new RegExp('^(?:'+esc+'\\s*-?\\s*)+','i'),''); val = val.trim(); } actObj[`remarks_${phaseKey}`] = val; } if (eeSel) actObj[`open_pic_${phaseKey}`] = eeSel.value; if(suppSel) actObj.supplier = suppSel.value || actObj.supplier; await saveSingleActivity(pid, acts[aid].id, actObj); renderOpenList(); } }
  };
  showPlaceholderForEmptyDates("#openListBody");
}

// Delay helpers
function toDateOnly(d){ if(!d) return null; const dt=(d instanceof Date)?d:new Date(d); return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); }
function sanitizeDateValue(value){ if(!value || value==="--" || value==="—") return ""; return value; }
function computePhaseDelay(planIso, actualIso){ try{ planIso = sanitizeDateValue(planIso); actualIso = sanitizeDateValue(actualIso); if(!planIso && !actualIso) return null; if(actualIso){ if(!planIso) return null; const p = toDateOnly(planIso); const a = toDateOnly(actualIso); if(!p || !a) return null; const diff = Math.round((a - p) / (1000*60*60*24)); return diff>0 ? diff : 0; } else { if(!planIso) return null; const p = toDateOnly(planIso); const today = toDateOnly(new Date()); if(p < today) return Math.round((today - p) / (1000*60*60*24)); return null; } }catch(err){ return null; } }

// CONFIG MANAGEMENT
function renderConfigTable(){ const tbody = document.getElementById("configTableBody"); if(!tbody) return; tbody.innerHTML = Object.keys(configData).map(key=>`<tr><td>${escapeHtml(key.toUpperCase())}</td><td>${configData[key].map(v=>escapeHtml(v)).join(", ")}</td><td><button class="btn btn-sm btn-outline-primary edit-config" data-key="${key}"><i class="bi bi-pencil-square"></i> Edit</button></td></tr>`).join(""); document.querySelectorAll(".edit-config").forEach(btn=>{ btn.onclick=()=>openConfigModal(btn.dataset.key); }); }
function openConfigModal(key){ const modalEl=document.getElementById("configModal"); if(!modalEl) return alert("Config modal not found."); const modal=new bootstrap.Modal(modalEl); document.getElementById("configTitle").textContent = `Edit ${key.toUpperCase()}`; const list=document.getElementById("configList"); const input=document.getElementById("configInput"); const addBtn=document.getElementById("addConfigItem"); function render(){ list.innerHTML = configData[key].map((item,i)=>`<li class="list-group-item d-flex justify-content-between align-items-center">${escapeHtml(item)}<button class="btn btn-sm btn-danger del-item" data-i="${i}"><i class="bi bi-trash"></i></button></li>`).join(""); list.querySelectorAll(".del-item").forEach(b=>{ b.onclick=()=>{ configData[key].splice(parseInt(b.dataset.i,10),1); saveConfig(); render(); renderConfigTable(); }; }); } addBtn.onclick=()=>{ const val=input.value.trim(); if(!val) return; if(!configData[key].includes(val)){ configData[key].push(val); input.value=""; saveConfig(); render(); renderConfigTable(); } else alert("Item already exists"); }; render(); modal.show(); }

// INITIAL LOAD
if (document.readyState === "complete" || document.readyState === "interactive") {
  if (document.getElementById("main-content") && document.getElementById("page-title")) {
    document.getElementById("main-content").innerHTML = `<div class="page active">${pages["project-list"]}</div>`;
    document.getElementById("page-title").textContent = "PROJECT LIST";
    initFilterOptions();
    renderProjectTable();
    showPlaceholderForEmptyDates("#projectBody");
    attachProjectSearchHandler();
  }
}

// Extra: hover tooltip with delay & reason
document.addEventListener("mouseover", async (e)=>{ const el=e.target; if(!el) return; const field = el.getAttribute("data-field"); if(!field || (!field.startsWith("plan_") && !field.startsWith("actual_"))) return; const td = el.closest("td"); const row = el.closest("tr"); if(!td || !row) return; let pid=null; const modalEl=document.getElementById("activityModal"); if (modalEl && modalEl.getAttribute("data-pid")) pid = modalEl.getAttribute("data-pid"); else pid = row.dataset.pid || null; if (pid===null || pid===undefined) return; const phase = field.replace("plan_","").replace("actual_",""); const planVal = row.querySelector(`[data-field="plan_${phase}"]`)?.value || ""; const actualVal = row.querySelector(`[data-field="actual_${phase}"]`)?.value || ""; const delayDays = computePhaseDelay(planVal, actualVal); let tooltip = ""; if (delayDays && delayDays>0) tooltip += `Delay: ${delayDays} day${delayDays>1?"s":""}`; try{ const acts = await loadActivitiesFromFirebase(pid); const idx = parseInt(row.dataset.i||row.dataset.aid||row.dataset.row||row.rowIndex,10); const act = acts[idx]; let reason=""; let action=""; if(phase){ reason = (act && Object.prototype.hasOwnProperty.call(act, `reason_${phase}`)) ? act[`reason_${phase}`] : (act?.reason||""); action = (act && Object.prototype.hasOwnProperty.call(act, `action_${phase}`)) ? act[`action_${phase}`] : (act?.action||""); } if(reason) tooltip += (tooltip? "\n":"") + `Reason: ${reason}`; if(action) tooltip += (tooltip? "\n":"") + `Action: ${action}`; } catch(err){ console.error("Failed to fetch reason:", err); } el.title = tooltip; });

function excelDateToISO(excelDate){
    if (!excelDate) return "";
    if (typeof excelDate === "number"){
        const d = new Date((excelDate - 25569) * 86400 * 1000);
        return d.toISOString().split("T")[0];
    }
    if (typeof excelDate === "string" && excelDate.includes("-")) return excelDate;
    return "";
}

async function exportProjectListToExcel(data){
    const rows = data.map(p => ({
        ProjectID: p.id,
        Title: p.title,
        Type: p.type,
        Model: p.model,
        Site: p.site,
        TPM: p.tpm,
        EE: p.ee,
        Gate1: p.gate1 || "",
        Gate2: p.gate2 || "",
        FOT: p.fot || "",
        ER1: p.er1 || "",
        ER2: p.er2 || "",
        ER3: p.er3 || "",
        PR: p.pr || "",
        SOP: p.sop || ""
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "ProjectList");
    XLSX.writeFile(wb, "ProjectList.xlsx");
}

async function exportActivityToExcel(pid) {
    const acts = await loadActivitiesFromFirebase(pid);

    if (!acts.length) {
        alert("No activity data to export.");
        return;
    }

    const rows = acts.map(a => ({
        ActivityID: a.id,
        Activity: a.activity || "",
        Site: a.site || "",
        Owner: a.owner || "",
        Supplier: a.supplier || "",
        Level: a.level || "",
        ...Object.fromEntries(
            activityDateFields.flatMap(k => [
                [`Plan_${k.toUpperCase()}`, a[`plan_${k}`] || ""],
                [`Actual_${k.toUpperCase()}`, a[`actual_${k}`] || ""]
            ])
        )
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "ActivityList");

    XLSX.writeFile(wb, `Activity_${pid}.xlsx`);
}


async function handleProjectListImport(file){
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const updated = [];

        for (const r of rows){
            if (!r.ProjectID) continue;
            updated.push({
                id: r.ProjectID,
                title: r.Title || "",
                type: r.Type || "",
                model: r.Model || "",
                site: r.Site || "",
                tpm: r.TPM || "",
                ee: r.EE || "",
                gate1: excelDateToISO(r.Gate1),
                gate2: excelDateToISO(r.Gate2),
                fot: excelDateToISO(r.FOT),
                er1: excelDateToISO(r.ER1),
                er2: excelDateToISO(r.ER2),
                er3: excelDateToISO(r.ER3),
                pr: excelDateToISO(r.PR),
                sop: excelDateToISO(r.SOP),
            });

            // update Firebase per project
            await set(ref(db, `projects/${r.ProjectID}`), updated[updated.length-1]);
        }

        projectData = updated;
        renderProjectTable();
        alert("Import berhasil!");
    };

    reader.readAsArrayBuffer(file);
}

async function importActivityFromExcel(pid, file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        for (const r of rows) {
            const actId = r.ActivityID || generateActivityId();
            const obj = {
                activity: r.Activity || "",
                site: r.Site || "",
                owner: r.Owner || "",
                supplier: r.Supplier || "",
                level: r.Level || "",
            };

            activityDateFields.forEach(k => {
                const colPlan = r[`Plan_${k.toUpperCase()}`];
                const colActual = r[`Actual_${k.toUpperCase()}`];

                obj[`plan_${k}`] = excelDateToISO(colPlan);
                obj[`actual_${k}`] = excelDateToISO(colActual);

                // jika masih undefined → set ""
                if (!obj[`plan_${k}`]) obj[`plan_${k}`] = "";
                if (!obj[`actual_${k}`]) obj[`actual_${k}`] = "";
            });


            await saveSingleActivity(pid, actId, obj);
        }

        alert("Activity Import Success!");

        renderActivityTableInTab(pid);
    };
    reader.readAsArrayBuffer(file);
}


// ===============================
// FIREBASE SAVE & LOAD (Option 1)
// projects/{projectId} and activities/{projectId}/{activityId}
// ===============================
async function saveProjectsToFirebase_all(projectsArray){
  // Save all projects: overwrite projects node with object keyed by id (useful for batch)
  try{
    const obj = {};
    for (const p of projectsArray) { if(!p.id) p.id = generateProjectId(); obj[p.id] = p; }
    await set(ref(db, "projects/"), obj);
    console.log("✅ All projects written to projects/ (object)");
  }catch(err){ console.error("❌ Error writing all projects:", err); }
}
async function saveProjectsToFirebase_individual(project){
  // Save single project to projects/{id}
  try{
    await set(ref(db, `projects/${project.id}`), project);
    console.log(`✅ Project ${project.id} saved`);
  }catch(err){ console.error("❌ Error saving project:", err); }
}
async function saveProjectsToFirebase(data){
  // Backward-compatible wrapper (array or single)
  if (Array.isArray(data)) return saveProjectsToFirebase_all(data);
  if (typeof data === "object" && data !== null) return saveProjectsToFirebase_individual(data);
}
async function loadProjectsFromFirebase(){
  try{
    const snapshot = await get(ref(db, "projects/"));
    if (snapshot.exists()){
      const val = snapshot.val();
      if (typeof val === "object" && !Array.isArray(val)) {
        return Object.entries(val).map(([id,obj])=>({ id, ...obj }));
      } else return val || [];
    } else {
      return [];
    }
  }catch(err){ console.error("❌ Error loading projects:", err); return []; }
}

async function saveConfigToFirebase(data) {
  try {
    await set(ref(db, "config/default"), data);
    console.log("✅ Config saved to Firebase");
  } catch (error) {
    console.error("❌ Error saving config:", error);
  }
}

// delete single project and its activities
async function deleteProject(pid){
  try{
    await remove(ref(db, `projects/${pid}`));
    await remove(ref(db, `activities/${pid}`));
    console.log(`✅ Deleted project ${pid} and its activities`);
  }catch(err){ console.error("❌ Error deleting project:", err); }
}

// Activities save/load/delete (Option 1)
function generateActivityId(){ return "ACT-" + Date.now() + "-" + Math.floor(Math.random()*99999); }
async function saveSingleActivity(pid, actId, actObj){
  try{
    await set(ref(db, `activities/${pid}/${actId}`), actObj);
  }catch(err){ console.error("❌ Error saving activity:", err); }
}
async function deleteActivity(pid, actId){
  try{ await remove(ref(db, `activities/${pid}/${actId}`)); }catch(err){ console.error("❌ Error deleting activity:", err); }
}
async function loadActivitiesFromFirebase(pid){
  try{
    const snapshot = await get(ref(db, `activities/${pid}`));
    if (!snapshot.exists()) return [];
    const obj = snapshot.val();
    return Object.entries(obj).map(([id, data]) => ({ id, ...data }));
  }catch(err){ console.error("❌ Error loading activities:", err); return []; }
}

// Support functions: generateProjectId ddmmyyyyhhmmss
function pad(n){ return n<10? "0"+n : ""+n; }
function generateProjectId(){
  const d = new Date();
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth()+1);
  const yyyy = d.getFullYear();
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${dd}${mm}${yyyy}${hh}${mi}${ss}`;
}

// Export utilities to window
window.computePhaseDelay = computePhaseDelay;
window.renderProjectTable = renderProjectTable;
window.renderOpenList = renderOpenList;
window.renderConfigTable = renderConfigTable;
window.openActivityModal = openActivityModal;
window.renderActivityTableInTab = renderActivityTableInTab;
window.generateProjectId = generateProjectId;
