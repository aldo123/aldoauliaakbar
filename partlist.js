// ===============================
// PART LIST — FIREBASE VERSION
// WIK BT-TPM (FINAL / PLUG & PLAY)
// ===============================

import { db, ref, set, remove, onValue } from "./firebase-config.js";

// -------------------------------
// GLOBAL STATE
// -------------------------------
let partData = [];
let editingPartId = null;

// -------------------------------
// INIT
// -------------------------------
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPartList);
} else {
  initPartList();
}

function initPartList() {
  console.log("✅ initPartList running");

  const addBtn = document.getElementById("addPartBtn");
  const importBtn = document.getElementById("btnImport");
  const importFile = document.getElementById("importFile");

  if (!addBtn || !importBtn || !importFile) {
    console.error("❌ Part List DOM belum siap");
    return;
  }

  // ADD PART
  addBtn.onclick = () => {
  editingPartId = null;

  document.querySelectorAll("#addPartModal input")
    .forEach(i => i.value = "");

  openAddPartModal();};


  // 🔥 IMPORT BUTTON (INI YANG HILANG)
  importBtn.onclick = () => {
    console.log("📥 Import clicked");
    importFile.value = ""; // reset supaya bisa re-import file yang sama
    importFile.click();
  };

  listenPartList();
}


// -------------------------------
// FIREBASE LISTENER (REALTIME)
// -------------------------------
function listenPartList() {
  const partRef = ref(db, "parts/");
  onValue(partRef, (snapshot) => {
    if (!snapshot.exists()) {
      partData = [];
    } else {
      const obj = snapshot.val();
      partData = Object.entries(obj).map(([id, data]) => ({
        id,
        ...data
      }));
    }
    renderPartTable();
  });
}

// -------------------------------
// RENDER TABLE
// -------------------------------
function renderPartTable() {
  const tbody = document.querySelector("#partTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  partData.forEach((p, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.code || ""}</td>
      <td>${p.name || ""}</td>
      <td>${p.category || ""}</td>
      <td>${p.sub || ""}</td>
      <td>${p.machine || ""}</td>
      <td>${p.spec || ""}</td>
      <td>${p.supplier || ""}</td>
      <td>${p.unit || "pcs"}</td>
      <td class="${p.status === "Active" ? "status-active" : "status-obsolete"}">
        ${p.status || "Active"}
      </td>
      <td>
        <button class="btn btn-sm btn-outline-primary part-edit-btn"
                data-id="${p.id}">
            Edit
        </button>
        <button class="btn btn-sm btn-outline-danger part-delete-btn"
                data-id="${p.id}">
          Delete
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// -------------------------------
// DELETE PART (SAFE SCOPE)
// -------------------------------
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".part-delete-btn");
  if (!btn) return;

  const partId = btn.dataset.id;
  if (!partId) return;

  if (confirm("Delete this part?")) {
    await remove(ref(db, `parts/${partId}`));
  }
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".part-edit-btn");
  if (!btn) return;

  const partId = btn.dataset.id;
  const part = partData.find(p => p.id === partId);
  if (!part) return;

  editingPartId = partId;

  // isi form
  document.getElementById("partCode").value = part.code || "";
  document.getElementById("partName").value = part.name || "";
  document.getElementById("partCategory").value = part.category || "";
  document.getElementById("partSub").value = part.sub || "";
  document.getElementById("partMachine").value = part.machine || "";
  document.getElementById("partSpec").value = part.spec || "";
  document.getElementById("partSupplier").value = part.supplier || "";
  document.getElementById("partUnit").value = part.unit || "";

  // buka modal
  openAddPartModal();
});

// -------------------------------
// ADD PART (CALLED FROM MODAL)
// -------------------------------
async function saveNewPart(part) {
  const partId = "PART-" + Date.now();

  await set(ref(db, `parts/${partId}`), {
    code: part.code || "",
    name: part.name || "",
    category: part.category || "",
    sub: part.sub || "",
    machine: part.machine || "",
    spec: part.spec || "",
    supplier: part.supplier || "",
    unit: part.unit || "",
    status: part.status || "",
    createdAt: Date.now()
  });
}

// -------------------------------
// EXPORT EXCEL
// -------------------------------
document.getElementById("btnExport")?.addEventListener("click", () => {
  const ws = XLSX.utils.json_to_sheet(partData.map(p => ({
  "PART CODE": p.code,
  "PART NAME": p.name,
  "CATEGORY": p.category,
  "SUB CATEGORY": p.sub,
  "MACHINE / LINE": p.machine,
  "SPECIFICATION": p.spec,
  "SUPPLIER": p.supplier,
  "UNIT": p.unit,
  "STATUS": p.status
})));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PartList");
  XLSX.writeFile(wb, "Part_List.xlsx");
});

// -------------------------------
// IMPORT EXCEL
// -------------------------------
document.getElementById("importFile")?.addEventListener("change", async (e) => {
  const reader = new FileReader();

  reader.onload = async (evt) => {
    const wb = XLSX.read(evt.target.result, { type: "binary" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: ""
    });

    // ==========================
    // 1️⃣ BUILD EXCEL CODE SET
    // ==========================
    const excelParts = [];
    const excelCodeSet = new Set();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const code = row[0]?.toString().trim();
      const name = row[1]?.toString().trim();
      if (!code || !name) continue;

      excelCodeSet.add(code);

      excelParts.push({
        code,
        name,
        category: row[2] || "",
        sub: row[3] || "",
        machine: row[4] || "",
        spec: row[5] || "",
        supplier: row[6] || "",
        unit: row[7] || "",
        status: row[8] || "Active"
      });
    }

    // ==========================
    // 2️⃣ DELETE PART NOT IN EXCEL
    // ==========================
    let deleteCount = 0;
    for (const p of partData) {
      if (p.code && !excelCodeSet.has(p.code)) {
        await remove(ref(db, `parts/${p.id}`));
        deleteCount++;
      }
    }

    // ==========================
    // 3️⃣ UPSERT EXCEL DATA
    // ==========================
    const existingMap = {};
    partData.forEach(p => {
      if (p.code) existingMap[p.code] = p.id;
    });

    let updateCount = 0;
    let insertCount = 0;

    for (const part of excelParts) {
      let partId;

      if (existingMap[part.code]) {
        partId = existingMap[part.code];
        updateCount++;
      } else {
        partId = "PART-" + Date.now() + "-" + Math.floor(Math.random() * 9999);
        insertCount++;
      }

      await set(ref(db, `parts/${partId}`), {
        ...part,
        updatedAt: Date.now(),
        createdAt: Date.now()
      });
    }

    alert(
      `✅ Import SINKRON selesai\n` +
      `➕ Insert: ${insertCount}\n` +
      `♻️ Update: ${updateCount}\n` +
      `🗑️ Delete: ${deleteCount}`
    );
  };

  reader.readAsBinaryString(e.target.files[0]);
});



// -------------------------------
// PLACEHOLDER MODAL FUNCTION
// (WAJIB DIGANTI KE MODAL BOOTSTRAP)
// -------------------------------
function openAddPartModal() {
  const modal = new bootstrap.Modal(
    document.getElementById("addPartModal")
  );
  modal.show();
}

document.getElementById("btnSavePart")?.addEventListener("click", async () => {
  const part = {
    code: document.getElementById("partCode").value.trim(),
    name: document.getElementById("partName").value.trim(),
    category: document.getElementById("partCategory").value.trim(),
    sub: document.getElementById("partSub").value.trim(),
    machine: document.getElementById("partMachine").value.trim(),
    spec: document.getElementById("partSpec").value.trim(),
    supplier: document.getElementById("partSupplier").value.trim(),
    unit: document.getElementById("partUnit").value.trim(),
    status: "Active"
  };

  if (!part.code || !part.name) {
    alert("Part Code & Part Name wajib diisi");
    return;
  }

  // =========================
  // MODE EDIT
  // =========================
  if (editingPartId) {
    await set(ref(db, `parts/${editingPartId}`), {
      ...part,
      updatedAt: Date.now()
    });
  }
  // =========================
  // MODE ADD
  // =========================
  else {
    const partId = "PART-" + Date.now();
    await set(ref(db, `parts/${partId}`), {
      ...part,
      createdAt: Date.now()
    });
  }

  editingPartId = null;

  // reset form
  document.querySelectorAll("#addPartModal input").forEach(i => i.value = "");

  bootstrap.Modal.getInstance(
    document.getElementById("addPartModal")
  ).hide();
});


