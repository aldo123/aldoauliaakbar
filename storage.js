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
    const isLow = stock < min;

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
        <button class="icon-btn edit-btn">✏️</button>
        <button class="icon-btn delete-btn">🗑️</button>
      </td>
    `;

    // ✅ EDIT
    tr.querySelector(".edit-btn").onclick = () => {
      editingStorageKey = s.key;
      editPartCodeView.value = s.partCode;
      editMinStockInput.value = min;
      editModal.show();
    };

    // ✅ DELETE (HANYA SATU)
    tr.querySelector(".delete-btn").onclick = async () => {
      if (!confirm(`Delete storage data for ${s.partCode}?`)) return;
      await remove(ref(db, `storage/${s.key}`));
    };

    tbody.appendChild(tr);
  });
}

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


