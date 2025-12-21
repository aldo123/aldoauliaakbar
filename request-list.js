// ===============================
// REQUEST LIST JS — FINAL + EDIT & DELETE
// ===============================

import { db, ref, onValue, get, update, remove } from "./firebase-config.js";
import { push } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";


const excelNumber = v => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  return Number(String(v).replace(/[^\d.-]/g, "")) || 0;
};
/* ===============================
   UTIL
================================ */
const num = v => Number(String(v || 0).replace(/[^\d.-]/g, "")) || 0;
const money = v => "Rp " + num(v).toLocaleString("id-ID");

/* ===============================
   DOM
================================ */
const tbody = document.getElementById("requestBody");
const searchInput = document.getElementById("searchRequest");
const btnAdd = document.getElementById("btnAddRequest");
const btnExport = document.getElementById("btnExportRequest");
const btnImport = document.getElementById("btnImportRequest");
const importFile = document.getElementById("importFile");

const filterVendor  = document.getElementById("filterVendor");
const filterProject = document.getElementById("filterProject");
const filterPIC     = document.getElementById("filterPIC");
const filterCost    = document.getElementById("filterCost");
const filterStatus  = document.getElementById("filterStatus");

/* ===============================
   MODAL
================================ */
const modalEl = document.getElementById("requestModal");
const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

/* ===============================
   FORM
================================ */
const F = id => document.getElementById(id);
const f = {
  oaPr: F("f_oaPr"),
  prNo: F("f_prNo"),
  po: F("f_po"),
  io: F("f_io"),
  costCenter: F("f_costCenter"),
  description: F("f_description"),
  qty: F("f_qty"),
  uom: F("f_uom"),
  price: F("f_price"),
  totalCost: F("f_totalCost"),
  vendorName: F("f_vendorName"),
  projectBy: F("f_projectBy"),
  psc: F("f_psc"),
  pic: F("f_pic"),
  information: F("f_information"),
  oriDue: F("f_oriDue"),
  revDue: F("f_revDue"),
  status: F("f_status"),
  note: F("f_note")
};

let cache = [];
let editKey = null;

/* ===============================
   LOAD FIREBASE
================================ */
onValue(ref(db, "request-list"), snap => {
  cache = [];
  if (snap.exists()) {
    Object.entries(snap.val()).forEach(([key, v]) => {
      cache.push({ key, ...v });
    });
  }
  populateFilters();   // 🔥 WAJIB
  render();
});


function computeStatus(r) {

  // 1️⃣ DONE jika PR & PO ada
  const prOk = String(r.prNo || "").trim() !== "";
  const poOk = String(r.po || "").trim() !== "";
  if (prOk && poOk) return "Done";

  // 2️⃣ CANCELLED manual
  if (String(r.status).toLowerCase() === "cancelled") {
    return "Cancelled";
  }

  // 3️⃣ DELAY berdasarkan OA-PR# + 10 hari
  const prDate = getDateFromOaPr(r.oaPr);
  if (prDate) {
    const limit = new Date(prDate);
    limit.setDate(limit.getDate() + 10);

    if (new Date() > limit) {
      return "Delay";
    }
  }

  // 4️⃣ DEFAULT
  return "Ongoing";
}


function getDateFromOaPr(oaPr) {
  // contoh: PR20250110011
  const match = String(oaPr || "").match(/PR(\d{8})/);
  if (!match) return null;

  const y = match[1].slice(0, 4);
  const m = match[1].slice(4, 6);
  const d = match[1].slice(6, 8);

  return new Date(`${y}-${m}-${d}`);
}
/* ===============================
   RENDER
================================ */
function render() {
  tbody.innerHTML = "";

  const kw = searchInput.value.toLowerCase().trim();
  const vVendor  = filterVendor.value;
  const vProject = filterProject.value;
  const vPIC     = filterPIC.value;
  const vCost    = filterCost.value;
  const vStatus  = filterStatus.value.trim();

  const s = v => String(v || "").toLowerCase();

  cache.forEach(r => {
    const displayStatus = computeStatus(r);
    const displayStatusLower = displayStatus.toLowerCase();

    // 🔍 SEARCH
    if (
      kw &&
      !(
        s(r.oaPr).includes(kw) ||
        s(r.prNo).includes(kw) ||
        s(r.po).includes(kw) ||
        s(r.io).includes(kw)
      )
    ) return;

    // 🎯 FILTER
    if (vVendor  && r.vendorName !== vVendor) return;
    if (vProject && r.projectBy  !== vProject) return;
    if (vPIC     && r.pic      !== vPIC) return;
    if (vCost    && r.costCenter !== vCost) return;
    if (vStatus && displayStatusLower !== vStatus.toLowerCase()) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.oaPr}</td>
      <td>${r.prNo || "-"}</td>
      <td>${r.po || "-"}</td>
      <td>${r.io || "-"}</td>
      <td>${r.costCenter || "-"}</td>
      <td>${r.description || "-"}</td>
      <td>${r.qty || 0}</td>
      <td>${r.uom || "-"}</td>
      <td>${money(r.price)}</td>
      <td>${money(r.totalCost)}</td>
      <td>${r.vendorName || "-"}</td>
      <td>${r.projectBy || "-"}</td>
      <td>${r.psc || "-"}</td>
      <td>${r.pic || "-"}</td>
      <td>${r.information || "-"}</td>
      <td>${r.originalDueDate || "-"}</td>
      <td>${r.revisedDueDate || "-"}</td>
      <td><span class="status status-${displayStatusLower}">${displayStatus}</span></td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-outline-warning edit-btn" data-key="${r.key}">✏️</button>
        <button class="btn btn-sm btn-outline-danger delete-btn" data-key="${r.key}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  bindRowActions();
}


[
  filterVendor,
  filterProject,
  filterPIC,
  filterCost,
  filterStatus
].forEach(el => el?.addEventListener("change", render));


searchInput.addEventListener("input", render);

/* ===============================
   ADD
================================ */
btnAdd.addEventListener("click", () => {
  editKey = null;
  modal.show();
  Object.values(f).forEach(i => i && (i.value = ""));
  f.oaPr.disabled = false;
});

/* ===============================
   AUTO TOTAL
================================ */
["qty", "price"].forEach(k => {
  f[k].addEventListener("input", () => {
    f.totalCost.value = num(f.qty.value) * num(f.price.value);
  });
});

/* ===============================
   SAVE (ADD / EDIT)
================================ */
document.getElementById("btnSaveRequest").addEventListener("click", async () => {

  const oaPr = f.oaPr.value.trim();
  if (!oaPr) {
    alert("❌ OA-PR# wajib diisi");
    return;
  }

  // 🔥 VALIDASI DUPLIKAT OA-PR#
  const duplicate = cache.find(r =>
    r.oaPr === oaPr && r.key !== editKey
  );

  if (duplicate) {
    alert(`❌ OA-PR# "${oaPr}" sudah digunakan oleh request lain`);
    return;
  }

  const payload = {
    oaPr,
    prNo: f.prNo.value,
    po: f.po.value,
    io: f.io.value,
    costCenter: f.costCenter.value,
    description: f.description.value,
    qty: Number(f.qty.value || 0),
    uom: f.uom.value,
    price: Number(f.price.value || 0),
    totalCost: Number(f.totalCost.value || 0),
    vendorName: f.vendorName.value,
    projectBy: f.projectBy.value,
    psc: f.psc.value,
    pic: f.pic.value,
    information: f.information.value,
    originalDueDate: f.oriDue.value,
    revisedDueDate: f.revDue.value,
    status:
    f.prNo.value.trim() && f.po.value.trim()
        ? "Done"
        : (f.status.value || "Ongoing"),
    updatedAt: new Date().toISOString()
  };

  if (editKey) {
    // 🔁 UPDATE
    await update(ref(db, `request-list/${editKey}`), payload);
    //alert("✅ Request updated");
  } else {
    // ➕ ADD
    await push(ref(db, "request-list"), {
      ...payload,
      createdAt: new Date().toISOString()
    });
    //alert("✅ Request added");
  }

  modal.hide();
});


/* ===============================
   ROW ACTIONS
================================ */
function bindRowActions() {

  // ✏️ EDIT
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.onclick = () => {
      const r = cache.find(x => x.key === btn.dataset.key);
      if (!r) return;

      editKey = r.key;
      Object.keys(f).forEach(k => {
        if (!f[k]) return;

        // khusus input date
        if (f[k].type === "date") {
            f[k].value = r[k] ? r[k] : "";
            return;
        }

        f[k].value = r[k] ?? "";
        });

      modal.show();
    };
  });

  // 🗑️ DELETE
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("Hapus request ini?")) return;
      await remove(ref(db, `request-list/${btn.dataset.key}`));
      //alert("🗑️ Request deleted");
    };
  });
}


/* ===============================
   EXPORT EXCEL
================================ */
btnExport?.addEventListener("click", () => {
  if (!cache.length) {
    alert("❌ No data to export");
    return;
  }

  const rows = cache.map((r, i) => ({
    "OA-PR#": r.oaPr || "",
    "PR No": r.prNo || "",
    "PO": r.po || "",
    "IO": r.io || "",
    "Cost Center": r.costCenter || "",
    "Description": r.description || "",
    "Qty": r.qty || 0,
    "UOM": r.uom || "",
    "Price": r.price || 0,
    "Total Cost": r.totalCost || 0,
    "Vendor": r.vendorName || "",
    "Project By": r.projectBy || "",
    "PSC": r.psc || "",
    "PIC": r.pic || "",
    "Information": r.information || "",
    "Original Due Date": r.originalDueDate || "",
    "Revised Due Date": r.revisedDueDate || "",
    "Status": r.status || "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Request List");

  XLSX.writeFile(wb, "request_list.xlsx");
});


/* ===============================
   IMPORT EXCEL — FULL SYNC
   Excel = MASTER
================================ */
btnImport?.addEventListener("click", () => {
  importFile?.click();
});

importFile?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async (evt) => {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
        const snap = await get(ref(db, "request-list"));
        if (snap.exists()) {
            const promises = [];
            Object.keys(snap.val()).forEach(key => {
            promises.push(remove(ref(db, `request-list/${key}`)));
            });
            await Promise.all(promises);
        }

        alert("⚠ Excel kosong → Semua data Request List dihapus");
        importFile.value = "";
        return;
        }

    // 🔥 Load Firebase
    const snap = await get(ref(db, "request-list"));
    const fbMap = new Map();

    if (snap.exists()) {
      Object.entries(snap.val()).forEach(([key, v]) => {
        if (v.oaPr) {
          fbMap.set(String(v.oaPr).trim(), { key, ...v });
        }
      });
    }

    const excelKeys = new Set();

    let added = 0;
    let updated = 0;
    let deleted = 0;

    // 🔁 ADD & UPDATE
    for (const r of rows) {
      const oaPr = String(r["OA-PR#"] || "").trim();
      if (!oaPr) continue;

      excelKeys.add(oaPr);

      const payload = {
        oaPr,
        prNo: r["PR No"] || "",
        po: r["PO"] || "",
        io: r["IO"] || "",
        costCenter: r["Cost Center"] || "",
        description: r["Description"] || "",
        qty: excelNumber(r["Qty"]),
        uom: r["UOM"] || "",
        price: excelNumber(r["Price"]),
        totalCost: excelNumber(r["Total Cost"]),
        vendorName: r["Vendor"] || "",
        projectBy: r["Project By"] || "",
        psc: r["PSC"] || "",
        pic: r["PIC"] || "",
        information: r["Information"] || "",
        originalDueDate: excelDate(r["Original Due Date"]),
        revisedDueDate: excelDate(r["Revised Due Date"]),
        status:
        String(r["PR No"] || "").trim() &&
        String(r["PO"] || "").trim()
            ? "Done"
            : (r["Status"] || "Ongoing"),
        updatedAt: new Date().toISOString()
      };

      if (fbMap.has(oaPr)) {
        await update(
          ref(db, `request-list/${fbMap.get(oaPr).key}`),
          payload
        );
        updated++;
      } else {
        await push(ref(db, "request-list"), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        added++;
      }
    }

    // ❌ DELETE — NOT IN EXCEL
    for (const [oaPr, fb] of fbMap.entries()) {
      if (!excelKeys.has(oaPr)) {
        await remove(ref(db, `request-list/${fb.key}`));
        deleted++;
      }
    }

    alert(
      `✅ FULL SYNC SUCCESS\n\n` +
      `➕ Added   : ${added}\n` +
      `🔁 Updated : ${updated}\n` +
      `❌ Deleted : ${deleted}`
    );

    importFile.value = "";
  };

  reader.readAsArrayBuffer(file);
});


function populateFilters() {
  const vendors  = new Set();
  const projects = new Set();
  const pics     = new Set();
  const costs    = new Set();

  cache.forEach(r => {
    if (r.vendorName) vendors.add(r.vendorName);
    if (r.projectBy)  projects.add(r.projectBy);
    if (r.pic)      pics.add(r.pic);
    if (r.costCenter) costs.add(r.costCenter);
  });

  fillSelect(filterVendor, vendors);
  fillSelect(filterProject, projects);
  fillSelect(filterPIC, pics);
  fillSelect(filterCost, costs);
}

function fillSelect(select, set) {
  if (!select) return;

  const current = select.value;
  select.innerHTML = `<option value="">All</option>`;

  [...set].sort().forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });

  select.value = current;
}

const btnCancel = document.getElementById("btnCancelRequest");

btnCancel.addEventListener("click", () => {
  // 1️⃣ Lepas fokus DULU
  document.activeElement?.blur();

  // 2️⃣ Baru tutup modal
  modal.hide();

  // 3️⃣ Balikin fokus ke tombol Add (UX bagus)
  setTimeout(() => {
    btnAdd.focus();
  }, 50);
});

const excelDate = v => {
  if (!v) return "";
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "string") {
    const d = new Date(v);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  return "";
};