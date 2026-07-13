/**
 * attendance-page.js (page-level module, loaded only by attendance.html)
 * ----------------------------------------------------------------------
 * Merakit halaman Absensi: jam realtime + tombol absen masuk/keluar,
 * status non-hadir, daftar kehadiran hari ini, rekap dengan filter,
 * statistik donut chart, dan export.
 * ----------------------------------------------------------------------
 */

import { initApp } from "../app.js";
import { qs, qsa, escapeHtml } from "../utils/helper.js";
import {
  formatFullDate,
  toDateKey,
  formatTime,
} from "../utils/formatter.js";



import {
  checkIn,
  checkOut,
  submitStatus,
  listenTodayAttendance,
  getAttendanceRange,
  computeAttendanceStats,
} from "./attendance.js";

import { COLLECTIONS, getCollectionOnce } from "../firebase/firestore.js";

import { ATTENDANCE_STATUSES } from "../utils/constants.js";
import { showToast } from "../components/toast.js";
import { renderDonutChart } from "./charts.js";
import { exportToExcel, exportToCSV } from "./export.js";
import { renderTable } from "../components/table.js";

let currentUser = null;
let currentProfile = null;
let todayRecordForMe = null;

const unsubscribers = [];
window.addEventListener("beforeunload", () =>
  unsubscribers.forEach((fn) => fn?.()),
);

function startClock() {
  const clockEl = qs("[data-att-clock]");
  const dateEl = qs("[data-att-date]");
  function tick() {
    const now = new Date();
    if (clockEl) clockEl.textContent = now.toLocaleTimeString("id-ID");
    if (dateEl) dateEl.textContent = formatFullDate(now);
  }
  tick();
  setInterval(tick, 1000);
}

function updateClockActionState() {
  const checkInBtn = qs("[data-checkin-btn]");
  const checkOutBtn = qs("[data-checkout-btn]");
  if (!checkInBtn || !checkOutBtn) return;

  checkInBtn.disabled = Boolean(todayRecordForMe?.checkInTime);
  checkOutBtn.disabled =
    !todayRecordForMe?.checkInTime || Boolean(todayRecordForMe?.checkOutTime);

  checkInBtn.textContent = todayRecordForMe?.checkInTime
    ? `✅ Masuk: ${formatTime(new Date(todayRecordForMe.checkInTime))}`
    : "✅ Absen Masuk";
  checkOutBtn.textContent = todayRecordForMe?.checkOutTime
    ? `🚪 Keluar: ${formatTime(new Date(todayRecordForMe.checkOutTime))}`
    : "🚪 Absen Keluar";
}

function renderTodayList(records) {
  const target = qs("[data-att-today-list]");
  if (!target) return;

  if (!records.length) {
    target.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🗓️</div><div class="empty-state-title">Belum ada staff yang absen hari ini.</div></div>`;
    return;
  }

  target.innerHTML = records
    .map((r) => {
      const status =
        ATTENDANCE_STATUSES.find((s) => s.value === r.status) || {};
      return `
        <div class="att-today-row">
          <div class="avatar avatar-sm avatar-fallback">${(r.fullName || "?").slice(0, 2).toUpperCase()}</div>
          <div>
            <div class="att-today-row-name">${escapeHtml(r.fullName)}</div>
            <div class="att-today-row-meta">${escapeHtml(r.jobdesk || "-")}</div>
          </div>
          <span class="badge badge-${status.badge || "gray"}">${escapeHtml(status.label || r.status)}</span>
          <div class="att-today-row-times">
            ${r.checkInTime ? formatTime(new Date(r.checkInTime)) : "-"} → ${r.checkOutTime ? formatTime(new Date(r.checkOutTime)) : "-"}
          </div>
        </div>`;
    })
    .join("");
}

function renderTodayStats(records) {
  const counts = computeAttendanceStats(records);
  const target = qs("[data-att-today-stats]");
  if (target) {
    target.innerHTML = ATTENDANCE_STATUSES.map(
      (s) =>
        `<div class="stat-card"><div class="stat-card-label">${s.label}</div><div class="stat-card-value">${counts[s.value] || 0}</div></div>`,
    ).join("");
  }
}

function bindClockActions() {
  qs("[data-checkin-btn]")?.addEventListener("click", async () => {
    try {
      await checkIn({
        uid: currentUser.uid,
        fullName: currentProfile?.fullName || currentUser.email,
        jobdesk: currentProfile?.jobdesk,
        photoURL: currentProfile?.photoURL,
      });
      showToast("Absensi masuk berhasil disimpan.", "success");
    } catch (err) {
      console.error(err);
      showToast("Gagal menyimpan absensi.", "error");
    }
  });

  qs("[data-checkout-btn]")?.addEventListener("click", async () => {
    try {
      await checkOut({
        uid: currentUser.uid,
        fullName: currentProfile?.fullName || currentUser.email,
      });
      showToast("Absensi keluar berhasil disimpan.", "success");
    } catch (err) {
      console.error(err);
      showToast("Gagal menyimpan absensi.", "error");
    }
  });

  qsa("[data-status-option]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      qsa("[data-status-option]").forEach((b) =>
        b.setAttribute("aria-pressed", "false"),
      );
      btn.setAttribute("aria-pressed", "true");
      const status = btn.dataset.statusOption;
      if (status === "hadir") return; // hadir ditangani oleh tombol absen masuk

      const note =
        prompt(
          `Catatan untuk status "${btn.textContent.trim()}" (opsional):`,
        ) || "";
      try {
        await submitStatus(
          {
            uid: currentUser.uid,
            fullName: currentProfile?.fullName || currentUser.email,
            jobdesk: currentProfile?.jobdesk,
          },
          status,
          note,
        );
        showToast("Status kehadiran berhasil disimpan.", "success");
      } catch (err) {
        console.error(err);
        showToast("Gagal menyimpan status.", "error");
      }
    });
  });
}

// ---------------------------------------------------------------------
// Rekap
// ---------------------------------------------------------------------

async function loadRecap() {
  const startInput = qs("[data-recap-start]");
  const endInput = qs("[data-recap-end]");
  const allToggle = qs("[data-recap-all-toggle]");

  const isAll = Boolean(allToggle?.checked);

  if (startInput) startInput.disabled = isAll;
  if (endInput) endInput.disabled = isAll;


  // Mode All Tanggal: ambil semua dokumen attendance.
  if (isAll) {
    const records = await getCollectionOnce(COLLECTIONS.ATTENDANCE, {
      orderBy: ["date", "desc"],
    });
    renderRecapTable(records);
    renderRecapChart(records);
    return;
  }

  const start = startInput.value || toDateKey(new Date(new Date().setDate(1)));
  const end = endInput.value || toDateKey(new Date());

  const records = await getAttendanceRange(start, end);
  renderRecapTable(records);
  renderRecapChart(records);
}

function renderRecapTable(records) {
  const target = qs("[data-recap-table]");
  if (!target) return;
  const columns = [
    { key: "fullName", label: "Nama" },
    { key: "jobdesk", label: "Jobdesk" },
    {
      key: "date",
      label: "Tanggal",
      render: (r) => formatFullDate(new Date(r.date)),
    },

    {
      key: "status",
      label: "Status",
      render: (r) => {
        const s = ATTENDANCE_STATUSES.find((x) => x.value === r.status) || {};
        return `<span class="badge badge-${s.badge || "gray"}">${escapeHtml(s.label || r.status)}</span>`;
      },
    },
    {
      key: "checkInTime",
      label: "Jam Masuk",
      render: (r) => (r.checkInTime ? formatTime(new Date(r.checkInTime)) : "-"),
    },
    {
      key: "checkOutTime",
      label: "Jam Keluar",
      render: (r) => (r.checkOutTime ? formatTime(new Date(r.checkOutTime)) : "-"),
    },
  ];

  target.innerHTML = renderTable(
    columns,
    records,
    { emptyMessage: "Tidak ada data absensi pada rentang ini." },
  );

}

function renderRecapChart(records) {
  const counts = computeAttendanceStats(records);
  renderDonutChart(
    "recap-donut-chart",
    Object.fromEntries(
      ATTENDANCE_STATUSES.map((s) => [s.label, counts[s.value] || 0]),
    ),
    Object.fromEntries(ATTENDANCE_STATUSES.map((s) => [s.label, s.badge])),
  );

  const legend = qs("[data-recap-legend]");
  if (legend) {
    legend.innerHTML = ATTENDANCE_STATUSES.map(
      (s) =>
        `<div class="att-legend-item"><span class="att-legend-dot badge-${s.badge}" style="background:currentColor;"></span> ${s.label}: <strong>${counts[s.value] || 0}</strong></div>`,
    ).join("");
  }

  window.__recapExportData = records.map((r) => ({
    Nama: r.fullName,
    Jobdesk: r.jobdesk || "-",
    Tanggal: r.date,
    Status: r.status,
    "Jam Masuk": r.checkInTime ? formatTime(new Date(r.checkInTime)) : "-",
    "Jam Keluar": r.checkOutTime ? formatTime(new Date(r.checkOutTime)) : "-",
    Catatan: r.note || "-",
  }));
}

function bindRecapControls() {
  qs("[data-recap-filter-btn]")?.addEventListener("click", loadRecap);
  qs("[data-export-excel]")?.addEventListener("click", () => {
    if (!window.__recapExportData?.length)
      return showToast("Tidak ada data untuk diekspor.", "error");
    exportToExcel(
      window.__recapExportData,
      `rekap-absensi-${toDateKey(new Date())}.xlsx`,
    );
  });
  qs("[data-export-csv]")?.addEventListener("click", () => {
    if (!window.__recapExportData?.length)
      return showToast("Tidak ada data untuk diekspor.", "error");
    exportToCSV(
      window.__recapExportData,
      `rekap-absensi-${toDateKey(new Date())}.csv`,
    );
  });
}

async function bootstrap() {
  const { user, profile } = await initApp();
  currentUser = user;
  currentProfile = profile;

  startClock();
  bindClockActions();
  bindRecapControls();

  unsubscribers.push(
    listenTodayAttendance((records) => {
      renderTodayList(records);
      renderTodayStats(records);
      todayRecordForMe = records.find((r) => r.uid === user.uid) || null;
      updateClockActionState();
    }),
  );

  // Default rentang rekap: bulan berjalan.
  const startInput = qs("[data-recap-start]");
  const endInput = qs("[data-recap-end]");
  if (startInput) startInput.value = toDateKey(new Date(new Date().setDate(1)));
  if (endInput) endInput.value = toDateKey(new Date());
  loadRecap();
}

bootstrap();
