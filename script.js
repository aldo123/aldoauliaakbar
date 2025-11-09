// ==================== CEK LOGIN ====================
const loggedUser = localStorage.getItem("loggedUser");
if (!loggedUser) {
  window.location.href = "index.html"; // redirect jika belum login
}

// ==================== TAMPILKAN USER ====================
document.addEventListener("DOMContentLoaded", () => {
  const userInfo = document.querySelector(".user-info");
  if (userInfo && loggedUser) {
    userInfo.innerHTML = `<i class="bi bi-person-circle"></i> ${loggedUser} 
      <button class="btn btn-sm btn-outline-danger ms-2" id="logoutBtn">Logout</button>`;
  }

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("loggedUser");
    window.location.href = "index.html";
  });
});

// ==================== HALAMAN (SIMULASI) ====================
const pages = {
  "project-state": "<h4>Project State</h4><p>Display all project progress data here.</p>",
  "npi": "<h4>NPI</h4><p>New Product Introduction tracking dashboard.</p>",
  "project-list": `<h4>Project List</h4>
    <div id="project-table-container" class="mt-3"></div>`,
  "file-list": "<h4>File List</h4><p>All related files managed here.</p>",
  "open-list": "<h4>Open List</h4><p>All open issues or ongoing projects.</p>",
  "asset-list": "<h4>Asset List</h4><p>Engineering asset information.</p>",
  "asset-category": "<h4>Asset Category</h4><p>Manage all categories of assets.</p>",
  "device-state": "<h4>Device State</h4><p>Monitor current state of devices.</p>",
  "part-list": "<h4>Part List</h4><p>Inventory of available parts.</p>",
  "inout": "<h4>In/Out</h4><p>Transaction log for parts in and out.</p>",
  "storage": "<h4>Storage</h4><p>Warehouse and stock control view.</p>",
  "device-category": "<h4>Device Category</h4><p>Categories for device grouping.</p>",
  "device-list": "<h4>Device List</h4><p>All devices registered in TPM system.</p>",
  "maintenance-item": "<h4>Maintenance Item</h4><p>Preventive maintenance records.</p>",
  "analytical-tools": "<h4>Analytical Tools</h4><p>Data visualization and KPI tracking tools.</p>",
  "system-config": "<h4>System Configuration</h4><p>Manage users, permissions, and system settings.</p>"
};

// ==================== EVENT MENU KLIK ====================
document.querySelectorAll(".menu li[data-page]").forEach(item => {
  item.addEventListener("click", async () => {
    const pageKey = item.getAttribute("data-page");
    const content = pages[pageKey] || "<p>Page not found.</p>";
    document.getElementById("main-content").innerHTML = `<div class="page active">${content}</div>`;
    const pageTitle = pageKey.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    document.getElementById("page-title").textContent = pageTitle;

    // Jika klik project list, tampilkan tabel interaktif
    if (pageKey === "project-list") {
      loadProjectList();
    }
  });
});

// ==================== PROJECT LIST TABLE ====================
function loadProjectList() {
  const container = document.getElementById("project-table-container");

  const projectTypes = ["NPI", "KAIZEN & VAVE", "Downtime & Finding"];
  const models = ["9784", "9781", "9787", "9641"];
  const sites = ["FA", "DC", "MD"];
  const responsibles = ["Aldo", "Mahyu", "Tomi", "Indra", "Welsy", "Reisya", "Bambang"];

  const gates = [
    "Gate 1 / Concept Design",
    "Gate 2 / 3D Drawing",
    "FOT / Assembly",
    "ER1 / Debugging",
    "ER2 / Aging",
    "ER3 / Validation",
    "PR",
    "SOP"
  ];

  let savedData = JSON.parse(localStorage.getItem("projectListData")) || [];

  const makeSelect = (options, selected = "") =>
    `<select class="form-select form-select-sm">${options
      .map(opt => `<option ${opt === selected ? "selected" : ""}>${opt}</option>`)
      .join("")}</select>`;

  const makeDateInput = value =>
    `<input type="date" class="form-control form-control-sm" value="${value || ""}">`;

  const renderTable = () => {
    const rowsHTML = savedData
      .map(row => {
        return `
        <tr>
          <td>${makeSelect(projectTypes, row.type)}</td>
          <td>${makeSelect(models, row.model)}</td>
          <td>${makeSelect(sites, row.site)}</td>
          <td>${makeSelect(responsibles, row.tpm)}</td>
          <td>${makeSelect(responsibles, row.ee)}</td>
          ${gates.map(g => `<td>${makeDateInput(row[g] || "")}</td>`).join("")}
        </tr>`;
      })
      .join("");

    container.innerHTML = `
      <button id="addRowBtn" class="btn btn-primary btn-sm mb-2">+ Add Project</button>
      <button id="saveBtn" class="btn btn-success btn-sm mb-2 ms-2">💾 Save Data</button>
      <div class="table-responsive">
        <table class="table table-bordered table-striped table-sm">
          <thead class="table-dark">
            <tr>
              <th>Project Type</th>
              <th>Model</th>
              <th>Site</th>
              <th>Responsible TPM</th>
              <th>Responsible EE</th>
              ${gates.map(g => `<th>${g}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>
    `;

    document.getElementById("addRowBtn").addEventListener("click", () => {
      savedData.push({
        type: projectTypes[0],
        model: models[0],
        site: sites[0],
        tpm: responsibles[0],
        ee: responsibles[0]
      });
      renderTable();
    });

    document.getElementById("saveBtn").addEventListener("click", () => {
      const rows = [...container.querySelectorAll("tbody tr")];
      savedData = rows.map(r => {
        const selects = r.querySelectorAll("select");
        const inputs = r.querySelectorAll("input[type='date']");
        const data = {
          type: selects[0].value,
          model: selects[1].value,
          site: selects[2].value,
          tpm: selects[3].value,
          ee: selects[4].value
        };
        gates.forEach((g, i) => (data[g] = inputs[i].value));
        return data;
      });
      localStorage.setItem("projectListData", JSON.stringify(savedData));
      alert("✅ Project data saved successfully!");
    });
  };

  renderTable();
}
