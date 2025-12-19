import { db, update, ref, onValue, remove } from "./firebase-config.js";

const editModal = new bootstrap.Modal(
  document.getElementById("editMinStockModal")
);

const editPartCodeView = document.getElementById("editPartCodeView");
const editMinStockInput = document.getElementById("editMinStock");
const saveMinStockBtn = document.getElementById("saveMinStock");
const filterCategory    = document.getElementById("filterCategory");
const filterSubCategory = document.getElementById("filterSubCategory");
const filterMachine     = document.getElementById("filterMachine");
const filterRack        = document.getElementById("filterRack");
const filterStatus      = document.getElementById("filterStatus");

let editingStorageKey = null;


/* ===============================
   DOM
================================ */
const tbody = document.getElementById("storageBody");
const searchInput = document.getElementById("searchStorage");

let storageData = [];
let partMap = {};

/* ===============================
   LOAD PART LIST (SAFE MAP)
================================ */
onValue(ref(db, "parts"), snap => {
  partMap = {};
  if (!snap.exists()) return;

  Object.entries(snap.val()).forEach(([id, p]) => {
    if (p.code) {
      partMap[p.code] = {
        id,
        ...p
      };
    }
  });
});

/* ===============================
   LOAD STORAGE (KEEP KEY)
================================ */
onValue(ref(db, "storage"), snap => {
  storageData = [];
  if (!snap.exists()) {
    renderTable([]);
    return;
  }

  Object.entries(snap.val()).forEach(([key, s]) => {
    storageData.push({
      key,        // 🔑 simpan key firebase
      ...s
    });
  });

  renderTable(storageData);
});

/* ===============================
   SEARCH
================================ */
searchInput?.addEventListener("input", () => {
  const key = searchInput.value.toLowerCase();

  const filtered = storageData.filter(s =>
    (s.partName || "").toLowerCase().includes(key) ||
    (s.partCode || "").toLowerCase().includes(key)
  );

  renderTable(filtered);
});

/* ===============================
   RENDER TABLE
================================ */
function renderTable(data) {
  tbody.innerHTML = "";

  // 🔽 isi filter dropdown dari data
  fillFilter(filterCategory, data.map(d => partMap[d.partCode]?.category));
  fillFilter(filterSubCategory, data.map(d => partMap[d.partCode]?.sub));
  fillFilter(filterMachine, data.map(d => partMap[d.partCode]?.machine));
  fillFilter(filterRack, data.map(d => d.rack));

  data.forEach(s => {
    const part = partMap[s.partCode] || {};

    const stock = Number(s.stock || 0);
    const min   = Number(s.minStock || 0);
    const isLow = stock < min;

    // 🔥 FILTER LOGIC
    if (filterCategory.value && part.category !== filterCategory.value) return;
    if (filterSubCategory.value && part.sub !== filterSubCategory.value) return;
    if (filterMachine.value && part.machine !== filterMachine.value) return;
    if (filterRack.value && s.rack !== filterRack.value) return;
    if (filterStatus.value) {
      if (filterStatus.value === "LOW" && !isLow) return;
      if (filterStatus.value === "NORMAL" && isLow) return;
    }

    const tr = document.createElement("tr");
    if (isLow) tr.classList.add("low-stock");

    tr.innerHTML = `
      <td>${s.partCode}</td>
      <td>${s.partName}</td>
      <td>${part.category || "-"}</td>
      <td>${part.sub || "-"}</td>
      <td>${part.machine || "-"}</td>
      <td>${part.spec || "-"}</td>
      <td>${s.rack}</td>
      <td>${s.row}</td>
      <td>${min}</td>
      <td>${stock}</td>
      <td>
        <span class="status-badge ${isLow ? "status-low" : "status-ok"}">
          ${isLow ? "LOW STOCK" : "NORMAL"}
        </span>
      </td>
      <td class="action-cell">
        <button class="icon-btn edit-btn" data-key="${s.key}">✏️</button>
        <button class="icon-btn delete-btn" data-key="${s.key}">🗑️</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

[
  filterCategory,
  filterSubCategory,
  filterMachine,
  filterRack,
  filterStatus
].forEach(f =>
  f?.addEventListener("change", () => renderTable(storageData))
);

saveMinStockBtn.addEventListener("click", async () => {
  const newMin = Number(editMinStockInput.value);

  if (editingStorageKey === null) return;
  if (isNaN(newMin) || newMin < 0) {
    alert("Minimum stock must be 0 or more");
    return;
  }

  await update(
    ref(db, `storage/${editingStorageKey}`),
    { minStock: newMin }
  );

  // 🔥 FIX accessibility warning
  saveMinStockBtn.blur();

  editModal.hide();
  editingStorageKey = null;
});

function fillFilter(selectEl, values) {
  const current = selectEl.value;
  selectEl.innerHTML = `<option value="">All</option>`;

  [...new Set(values.filter(v => v))].sort().forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    selectEl.appendChild(opt);
  });

  selectEl.value = current;
}


tbody.addEventListener("click", async (e) => {

  const editBtn = e.target.closest(".edit-btn");
  const delBtn  = e.target.closest(".delete-btn");

  /* =========================
     EDIT MIN STOCK
  ========================== */
  if (editBtn) {
    const key = editBtn.dataset.key;
    const item = storageData.find(s => s.key === key);
    if (!item) return;

    editingStorageKey = key;
    editPartCodeView.value = item.partCode;
    editMinStockInput.value = item.minStock ?? 0;

    editModal.show();
    return;
  }

  /* =========================
     DELETE STORAGE
  ========================== */
  if (delBtn) {
    const key = delBtn.dataset.key;
    const item = storageData.find(s => s.key === key);
    if (!item) return;

    const ok = confirm(`Delete storage data for ${item.partCode}?`);
    if (!ok) return;

    await remove(ref(db, `storage/${key}`));
  }
});