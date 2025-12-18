import { db, update, ref, onValue, remove } from "./firebase-config.js";

const editModal = new bootstrap.Modal(
  document.getElementById("editMinStockModal")
);

const editPartCodeView = document.getElementById("editPartCodeView");
const editMinStockInput = document.getElementById("editMinStock");
const saveMinStockBtn = document.getElementById("saveMinStock");

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

  data.forEach(s => {
    const part = partMap[s.partCode] || {};

    const stock = Number(s.stock || 0);
    const min   = Number(s.minStock || 0);
    const isLow = stock < min;   // ✅ FIX LOGIC

    const tr = document.createElement("tr");
    if (isLow) tr.classList.add("low-stock");

    tr.innerHTML = `
      <td>${s.partCode || "-"}</td>
      <td>${s.partName || "-"}</td>
      <td>${part.category || "-"}</td>
      <td>${part.sub || "-"}</td>
      <td>${part.machine || "-"}</td>
      <td>${part.spec || "-"}</td>
      <td>${s.rack || "-"}</td>
      <td>${s.row || "-"}</td>
      <td>${min}</td>
      <td>${stock}</td>
      <td>
        <span class="status-badge ${isLow ? "status-low" : "status-ok"}">
          ${isLow ? "LOW STOCK" : "NORMAL"}
        </span>
      </td>
      <td class="action-cell">
        <button class="icon-btn edit-btn"
                data-key="${s.key}"
                data-code="${s.partCode}"
                data-min="${min}">
          ✏️
        </button>
        <button class="icon-btn delete-btn"
                data-key="${s.key}"
                data-code="${s.partCode}">
          🗑️
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ===============================
   ACTION HANDLER
================================ */
document.addEventListener("click", async (e) => {

  const editBtn = e.target.closest(".edit-btn");
  const delBtn  = e.target.closest(".delete-btn");

  /* =========================
     EDIT MIN STOCK
  ========================== */
  if (editBtn) {
    editingStorageKey = editBtn.dataset.key;
    const code = editBtn.dataset.code;
    const min  = editBtn.dataset.min;

    // isi modal
    editPartCodeView.value = code;
    editMinStockInput.value = min;

    // buka modal
    editModal.show();
    return;
  }

  /* =========================
     DELETE STORAGE
  ========================== */
  if (delBtn) {
    const key = delBtn.dataset.key;
    const code = delBtn.dataset.code;

    if (confirm(`Delete storage data for ${code}?`)) {
      await remove(ref(db, `storage/${key}`));
    }
  }
});

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


