/**
 * calendar-page.js (page-level module, loaded only by calendar.html)
 * ----------------------------------------------------------------------
 * Merakit Shared Calendar: Month/Week/Day/List View, filter, live search,
 * modal tambah/edit kegiatan, deteksi konflik jadwal, dan realtime sync.
 * ----------------------------------------------------------------------
 */

import { initApp } from "../app.js";
import { qs, qsa, escapeHtml, getQueryParam } from "../utils/helper.js";
import { formatShortDate } from "../utils/formatter.js";
import {
  generateMonthGrid,
  getMonthLabel,
  groupActivitiesByDate,
  indexActivitiesByDate,
  addMonths,
  isSameDay,
} from "./calendar.js";
import {
  listenActivitiesByMonth,
  listenAllActiveActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  duplicateActivity,
  findScheduleConflicts,
  filterActivities,
  getActivity,
} from "./activities.js";
import { listenAllStaff } from "./staff.js";
import { openModal } from "../components/modal.js";
import { confirmDelete } from "../components/dialog.js";
import { showToast } from "../components/toast.js";
import { skeletonCalendarGrid } from "../components/skeleton.js";
import { showLoader, hideLoader } from "../components/loader-overlay.js";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_STATUSES,
  ACTIVITY_PRIORITIES,
  ACTIVITY_COLORS,
  REPEAT_OPTIONS,
  REMINDER_OPTIONS,
} from "../utils/constants.js";
import {
  required,
  isEndTimeAfterStart,
  runValidators,
} from "../utils/validator.js";
import { debounce } from "../utils/helper.js";

let currentUser = null;
let currentProfile = null;
let staffList = [];
let currentView = "month";
let currentDate = new Date();
let activitiesCache = [];
let activeFilters = {};
let monthUnsub = null;

const unsubscribers = [];
window.addEventListener("beforeunload", () =>
  unsubscribers.forEach((fn) => fn?.()),
);

// ---------------------------------------------------------------------
// Rendering: toolbar & view switch
// ---------------------------------------------------------------------

function renderToolbar() {
  qs("[data-cal-title]").textContent = getMonthLabel(
    currentDate.getFullYear(),
    currentDate.getMonth(),
  );
}

function switchView(view) {
  currentView = view;
  qsa("[data-view-btn]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.viewBtn === view));
  });
  qsa("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.viewPanel !== view);
  });
  renderCurrentView();
}

function renderCurrentView() {
  const filtered = filterActivities(activitiesCache, activeFilters);
  if (currentView === "month") renderMonthView(filtered);
  else if (currentView === "list") renderListView(filtered);
  else if (currentView === "card") renderCardView(filtered);
  else if (currentView === "table") renderTableView(filtered);
}

// ---------------------------------------------------------------------
// Month View
// ---------------------------------------------------------------------

function renderMonthView(activities) {
  const target = qs("[data-month-grid]");
  if (!target) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const cells = generateMonthGrid(year, month);
  const indexed = indexActivitiesByDate(activities);
  const today = new Date();

  const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const headHtml = dayLabels
    .map((d) => `<div class="cal-month-headcell">${d}</div>`)
    .join("");

  const cellsHtml = cells
    .map((cell) => {
      const dayActivities = indexed.get(cell.dateKey) || [];
      const classes = ["cal-day-cell"];
      if (!cell.isCurrentMonth) classes.push("other-month");
      if (isSameDay(cell.date, today)) classes.push("is-today");

      const visibleEvents = dayActivities.slice(0, 3);
      const moreCount = dayActivities.length - visibleEvents.length;

      const eventsHtml = visibleEvents
        .map(
          (a) => `
          <div class="event-chip evt-${a.color || "blue"}" data-activity-id="${a.id}">
            <span class="event-dot" style="background:currentColor;"></span>${escapeHtml(a.name)}
          </div>`,
        )
        .join("");

      return `
        <div class="${classes.join(" ")}" data-date-key="${cell.dateKey}" role="button" tabindex="0">
          <span class="cal-day-number">${cell.date.getDate()}</span>
          <div class="cal-day-events">
            ${eventsHtml}
            ${moreCount > 0 ? `<span class="cal-day-more">+${moreCount} lainnya</span>` : ""}
          </div>
        </div>`;
    })
    .join("");

  target.innerHTML = `<div class="cal-month-grid">${headHtml}${cellsHtml}</div>`;

  qsa("[data-date-key]", target).forEach((cellEl) => {
    cellEl.addEventListener("click", () =>
      openDayQuickView(
        cellEl.dataset.dateKey,
        indexed.get(cellEl.dataset.dateKey) || [],
      ),
    );
  });
  qsa("[data-activity-id]", target).forEach((chip) => {
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      openActivityDetail(chip.dataset.activityId);
    });
  });
}

function openDayQuickView(dateKey, dayActivities) {
  if (!dayActivities.length) {
    openActivityFormModal({ date: dateKey });
    return;
  }
  const { close } = openModal({
    title: formatShortDate(new Date(dateKey)),
    size: "md",
    bodyHtml: `
      <div class="cal-list-group">
        ${dayActivities
          .map(
            (a) => `
          <div class="cal-list-item" data-activity-id="${a.id}">
            <div class="cal-list-item-color evt-${a.color || "blue"}"></div>
            <div class="cal-list-item-time">${a.startTime || "-"}</div>
            <div style="flex:1;">
              <div style="font-weight:600;">${escapeHtml(a.name)}</div>
              <div class="text-xs text-faint">${escapeHtml(a.location || "-")}${a.picName ? ` · 👤 ${escapeHtml(a.picName)}` : ""}</div>
              ${a.meetingLink ? `<div class="text-xs text-faint">🔗 <a href="${escapeHtml(a.meetingLink)}" target="_blank" rel="noopener noreferrer">Zoom/Link Meeting</a></div>` : ""}
            </div>
          </div>`,
          )
          .join("")}
      </div>

    `,
    footerHtml: `<button class="btn btn-primary" data-add-on-day>+ Tambah Kegiatan</button>`,

    onMount: (modalEl) => {
      qsa("[data-activity-id]", modalEl).forEach((item) => {
        item.addEventListener("click", () => {
          close();
          openActivityDetail(item.dataset.activityId);
        });
      });
      qs("[data-add-on-day]", modalEl).addEventListener("click", () => {
        close();
        openActivityFormModal({ date: dateKey });
      });
    },
  });
}

// ---------------------------------------------------------------------
// List / Card / Table Views
// ---------------------------------------------------------------------

function renderListView(activities) {
  const target = qs("[data-list-view]");
  if (!target) return;
  const groups = groupActivitiesByDate(activities);

  if (!groups.length) {
    target.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-title">Tidak ada kegiatan yang cocok.</div></div>`;
    return;
  }

  target.innerHTML = groups
    .map(
      (group) => `
      <div class="cal-list-group">
        <div class="cal-list-date-label">${formatShortDate(new Date(group.dateKey))}</div>
        ${group.items
          .map(
            (a) => `
          <div class="cal-list-item" data-activity-id="${a.id}">
            <div class="cal-list-item-color evt-${a.color || "blue"}"></div>
            <div class="cal-list-item-time">${a.startTime || "-"}</div>
            <div style="flex:1;">
              <div style="font-weight:600;">${escapeHtml(a.name)}</div>
              <div class="text-xs text-faint">${escapeHtml(a.location || "-")} · ${escapeHtml(a.picName || "-")}</div>
            </div>
            <span class="badge badge-${(ACTIVITY_STATUSES.find((s) => s.value === a.status) || {}).badge || "gray"}">${escapeHtml((ACTIVITY_STATUSES.find((s) => s.value === a.status) || {}).label || a.status)}</span>
          </div>`,
          )
          .join("")}
      </div>`,
    )
    .join("");

  qsa("[data-activity-id]", target).forEach((item) => {
    item.addEventListener("click", () =>
      openActivityDetail(item.dataset.activityId),
    );
  });
}

function renderCardView(activities) {
  const target = qs("[data-card-view]");
  if (!target) return;
  if (!activities.length) {
    target.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📇</div><div class="empty-state-title">Tidak ada kegiatan yang cocok.</div></div>`;
    return;
  }
  target.innerHTML = `<div class="page-grid">${activities
    .map((a) => `<div class="col-span-4">${activityCardHtml(a)}</div>`)
    .join("")}</div>`;

  qsa("[data-activity-id]", target).forEach((item) => {
    item.addEventListener("click", () =>
      openActivityDetail(item.dataset.activityId),
    );
  });
}

function activityCardHtml(a) {
  const status = ACTIVITY_STATUSES.find((s) => s.value === a.status) || {};
  const priority =
    ACTIVITY_PRIORITIES.find((p) => p.value === a.priority) || {};

  const picText = a.picName ? `👤 ${escapeHtml(a.picName)}` : "";
  const meetingText = a.meetingLink
    ? `🔗 <a href="${escapeHtml(a.meetingLink)}" target="_blank" rel="noopener noreferrer">Zoom/Link Meeting</a>`
    : "";

  return `
    <div class="card card-compact" data-activity-id="${a.id}" role="button" tabindex="0" style="cursor:pointer;">
      <div class="flex gap-2" style="margin-bottom:8px;">
        <span class="badge badge-${status.badge || "gray"}">${escapeHtml(status.label || a.status)}</span>
        <span class="badge badge-${priority.badge || "gray"}">${escapeHtml(priority.label || a.priority)}</span>
      </div>
      <h4>${escapeHtml(a.name)}</h4>
      <p class="text-xs text-faint" style="margin:6px 0;">📅 ${formatShortDate(new Date(a.date))} · 🕐 ${a.startTime || "-"}</p>
      <p class="text-xs text-faint">📍 ${escapeHtml(a.location || "-")}</p>
      ${picText ? `<p class="text-xs text-faint" style="margin-top:6px;">${picText}</p>` : ""}
      ${meetingText ? `<p class="text-xs text-faint" style="margin-top:6px;">${meetingText}</p>` : ""}
    </div>
  `;
}

function renderTableView(activities) {
  const target = qs("[data-table-view]");
  if (!target) return;
  if (!activities.length) {
    target.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Tidak ada kegiatan yang cocok.</div></div>`;
    return;
  }
  const rows = activities
    .map((a) => {
      const status = ACTIVITY_STATUSES.find((s) => s.value === a.status) || {};
      return `
      <tr data-activity-id="${a.id}" style="cursor:pointer;">
        <td>${escapeHtml(a.name)}</td>
        <td>${formatShortDate(new Date(a.date))}</td>
        <td>${a.startTime || "-"} - ${a.endTime || "-"}</td>
        <td>${escapeHtml(a.location || "-")}</td>
        <td>${escapeHtml(a.picName || "-")}</td>
        <td><span class="badge badge-${status.badge || "gray"}">${escapeHtml(status.label || a.status)}</span></td>
      </tr>`;
    })
    .join("");

  target.innerHTML = `
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Nama</th><th>Tanggal</th><th>Waktu</th><th>Lokasi</th><th>PIC</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  qsa("[data-activity-id]", target).forEach((row) => {
    row.addEventListener("click", () =>
      openActivityDetail(row.dataset.activityId),
    );
  });
}

// ---------------------------------------------------------------------
// Filters & Search
// ---------------------------------------------------------------------

function bindFilterBar() {
  qsa("[data-filter-chip]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.filterKey;
      const value = chip.dataset.filterValue;
      const isActive = chip.getAttribute("aria-pressed") === "true";

      qsa(`[data-filter-key="${key}"]`).forEach((el) =>
        el.setAttribute("aria-pressed", "false"),
      );

      if (!isActive) {
        chip.setAttribute("aria-pressed", "true");
        activeFilters[key] = value;
      } else {
        delete activeFilters[key];
      }
      renderCurrentView();
    });
  });

  const searchInput = qs("[data-cal-search]");
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((e) => {
        activeFilters.keyword = e.target.value;
        renderCurrentView();
      }, 250),
    );
  }
}

// ---------------------------------------------------------------------
// Activity Form Modal (Create / Edit)
// ---------------------------------------------------------------------

function activityFormHtml(activity = {}) {
  const staffOptions = staffList
    .map(
      (s) =>
        `<option value="${s.id}" ${activity.picId === s.id ? "selected" : ""}>${escapeHtml(s.fullName)}</option>`,
    )
    .join("");

  const staffCheckboxes = staffList
    .map(
      (s) => `
      <label class="checkbox-row">
        <input type="checkbox" name="involvedStaff" value="${s.id}" ${(activity.involvedStaffIds || []).includes(s.id) ? "checked" : ""}>
        ${escapeHtml(s.fullName)}
      </label>`,
    )
    .join("");

  const categoryOptions = ACTIVITY_CATEGORIES.map(
    (c) =>
      `<option value="${c}" ${activity.category === c ? "selected" : ""}>${c}</option>`,
  ).join("");

  const statusOptions = ACTIVITY_STATUSES.map(
    (s) =>
      `<option value="${s.value}" ${activity.status === s.value ? "selected" : ""}>${s.label}</option>`,
  ).join("");

  const priorityOptions = ACTIVITY_PRIORITIES.map(
    (p) =>
      `<option value="${p.value}" ${activity.priority === p.value ? "selected" : ""}>${p.label}</option>`,
  ).join("");

  const colorOptions = ACTIVITY_COLORS.map(
    (c) =>
      `<option value="${c.value}" ${activity.color === c.value ? "selected" : ""}>${c.label}</option>`,
  ).join("");

  const repeatOptions = REPEAT_OPTIONS.map(
    (r) =>
      `<option value="${r.value}" ${activity.repeat === r.value ? "selected" : ""}>${r.label}</option>`,
  ).join("");

  const reminderOptions = REMINDER_OPTIONS.map(
    (r) =>
      `<option value="${r.value}" ${activity.reminderMinutes === r.value ? "selected" : ""}>${r.label}</option>`,
  ).join("");

  return `
    <form id="activity-form" novalidate>
      <div id="conflict-warning" class="cal-conflict-warning hidden"></div>

      <div class="field" style="margin-bottom:12px;">
        <label class="field-label">Nama Kegiatan <span class="required">*</span></label>
        <input class="input" name="name" value="${escapeHtml(activity.name || "")}" required>
        <span class="field-error hidden" data-error-for="name"></span>
      </div>

      <div class="field" style="margin-bottom:12px;">
        <label class="field-label">Deskripsi</label>
        <textarea class="textarea" name="description">${escapeHtml(activity.description || "")}</textarea>
      </div>

      <div class="page-grid" style="margin-bottom:12px;">
        <div class="field col-span-6">
          <label class="field-label">Lokasi <span class="required">*</span></label>
          <input class="input" name="location" value="${escapeHtml(activity.location || "")}" required>
          <span class="field-error hidden" data-error-for="location"></span>
        </div>
        <div class="field col-span-6">
          <label class="field-label">Alamat Lengkap</label>
          <input class="input" name="address" value="${escapeHtml(activity.address || "")}">
        </div>
      </div>

      <div class="page-grid" style="margin-bottom:12px;">
        <div class="field col-span-4">
          <label class="field-label">Tanggal <span class="required">*</span></label>
          <input class="input" type="date" name="date" value="${activity.date || ""}" required>
          <span class="field-error hidden" data-error-for="date"></span>
        </div>
        <div class="field col-span-4">
          <label class="field-label">Jam Mulai <span class="required">*</span></label>
          <input class="input" type="time" name="startTime" value="${activity.startTime || ""}" required>
        </div>
        <div class="field col-span-4">
          <label class="field-label">Jam Selesai <span class="required">*</span></label>
          <input class="input" type="time" name="endTime" value="${activity.endTime || ""}" required>
          <span class="field-error hidden" data-error-for="endTime"></span>
        </div>
      </div>

      <div class="page-grid" style="margin-bottom:12px;">
        <div class="field col-span-6">
          <label class="field-label">PIC (Penanggung Jawab) <span class="required">*</span></label>
          <select class="select" name="picId" required>
            <option value="">Pilih staff...</option>
            ${staffOptions}
          </select>
          <div style="margin-top:8px;">
            <div class="text-xs text-faint" style="margin-bottom:6px;">Atau ketik PIC (jika bukan staff)</div>
            <input class="input" name="picCustomName" value="${escapeHtml(activity.picCustomName || "")}" placeholder="Ketik nama PIC...">
          </div>
        </div>

        <div class="field col-span-6">
          <label class="field-label">Kategori</label>
          <select class="select" name="category">
            <option value="">Pilih kategori...</option>
            ${categoryOptions}
          </select>
        </div>
      </div>


      <div class="field" style="margin-bottom:12px;">
        <label class="field-label">Staff Terlibat</label>
        <div style="max-height:140px;overflow-y:auto;border:2px solid var(--color-border-soft);border-radius:8px;padding:8px;">
          ${staffCheckboxes || '<p class="text-xs text-faint">Belum ada data staff.</p>'}
        </div>
      </div>

      <div class="page-grid" style="margin-bottom:12px;">
        <div class="field col-span-4">
          <label class="field-label">Status</label>
          <select class="select" name="status">${statusOptions}</select>
        </div>
        <div class="field col-span-4">
          <label class="field-label">Prioritas</label>
          <select class="select" name="priority">${priorityOptions}</select>
        </div>
        <div class="field col-span-4">
          <label class="field-label">Warna</label>
          <select class="select" name="color">${colorOptions}</select>
        </div>
      </div>

      <div class="page-grid" style="margin-bottom:12px;">
        <div class="field col-span-6">
          <label class="field-label">Pengulangan</label>
          <select class="select" name="repeat">${repeatOptions}</select>
        </div>
        <div class="field col-span-6">
          <label class="field-label">Pengingat</label>
          <select class="select" name="reminderMinutes">
            <option value="">Tidak ada</option>
            ${reminderOptions}
          </select>
        </div>
      </div>

      <div class="field" style="margin-bottom:12px;">
        <label class="field-label">Progress (%)</label>
        <input class="input" type="number" name="progress" min="0" max="100" step="10" value="${activity.progress ?? 0}">
      </div>

      <div class="page-grid" style="margin-bottom:12px;">
        <div class="field col-span-6">
          <label class="field-label">Link Meeting</label>
          <input class="input" name="meetingLink" value="${escapeHtml(activity.meetingLink || "")}" placeholder="https://meet.google.com/...">
        </div>
        <div class="field col-span-6">
          <label class="field-label">Nomor Kontak</label>
          <input class="input" name="contactNumber" value="${escapeHtml(activity.contactNumber || "")}">
        </div>
      </div>

      <div class="field">
        <label class="field-label">Catatan</label>
        <textarea class="textarea" name="notes">${escapeHtml(activity.notes || "")}</textarea>
      </div>
    </form>
  `;
}

function readActivityForm(formEl) {
  const fd = new FormData(formEl);
  const picId = fd.get("picId");
  const picCustomName = fd.get("picCustomName")?.trim() || "";

  return {
    name: fd.get("name")?.trim(),
    description: fd.get("description")?.trim() || "",
    location: fd.get("location")?.trim(),
    address: fd.get("address")?.trim() || "",
    date: fd.get("date"),
    startTime: fd.get("startTime"),
    endTime: fd.get("endTime"),

    // PIC (Penanggung Jawab)
    picId,
    picCustomName,
    picName:
      staffList.find((s) => s.id === picId)?.fullName || picCustomName || "",

    // Staff terlibat
    involvedStaffIds: fd.getAll("involvedStaff"),

    category: fd.get("category") || "",
    status: fd.get("status") || "belum_dimulai",
    priority: fd.get("priority") || "sedang",
    color: fd.get("color") || "blue",
    repeat: fd.get("repeat") || "none",
    reminderMinutes: fd.get("reminderMinutes")
      ? Number(fd.get("reminderMinutes"))
      : null,
    progress: Number(fd.get("progress")) || 0,

    // Link Meeting/Zoom
    meetingLink: fd.get("meetingLink")?.trim() || "",

    contactNumber: fd.get("contactNumber")?.trim() || "",
    notes: fd.get("notes")?.trim() || "",
    tags: [],
  };
}

function openActivityFormModal(prefill = {}, editingId = null) {
  const modal = openModal({
    title: editingId ? "Edit Kegiatan" : "Tambah Kegiatan",
    size: "lg",
    bodyHtml: activityFormHtml(prefill),
    footerHtml: `
      <button type="button" class="btn" data-cancel>Batal</button>
      <button type="button" class="btn btn-primary" data-save>${editingId ? "Simpan Perubahan" : "Tambah Kegiatan"}</button>
    `,
    onMount: (root) => {
      root
        .querySelector("[data-cancel]")
        .addEventListener("click", () => modal.close());

      root
        .querySelector("[data-save]")
        .addEventListener("click", () =>
          handleSaveActivity(root, modal.close, prefill, editingId),
        );
    },
  });
}

async function handleSaveActivity(modalRoot, close, previousData, editingId) {
  const formEl = qs("#activity-form", modalRoot);
  const data = readActivityForm(formEl);

  const check = runValidators([
    () => required(data.name, "Nama kegiatan"),
    () => required(data.location, "Lokasi"),
    () => required(data.date, "Tanggal"),

    () =>
      data.picName
        ? { valid: true }
        : { valid: false, message: "PIC harus diisi" },

    () => isEndTimeAfterStart(data.startTime, data.endTime),
  ]);

  if (!check.valid) {
    showToast(check.message, "error");
    return;
  }

  // pastikan meetingLink tersimpan konsisten (dipakai untuk render di UI)
  if (data.meetingLink) {
    data.meetingLink = data.meetingLink;
  }

  const conflicts = await findScheduleConflicts(data, editingId);
  const warningEl = qs("#conflict-warning", modalRoot);

  if (conflicts.length && !modalRoot.dataset.conflictAcknowledged) {
    warningEl.textContent = `⚠️ Terdapat ${conflicts.length} kegiatan lain pada waktu yang sama: ${conflicts.map((c) => c.name).join(", ")}. Klik simpan sekali lagi untuk tetap melanjutkan.`;
    warningEl.classList.remove("hidden");
    modalRoot.dataset.conflictAcknowledged = "true";
    return;
  }

  const actor = {
    uid: currentUser.uid,
    name: currentProfile?.fullName || currentUser.email,
  };

  try {
    if (editingId) {
      await updateActivity(editingId, data, actor, previousData);
      showToast("Kegiatan berhasil diperbarui.", "success");
    } else {
      await createActivity(data, actor);
      showToast("Kegiatan berhasil ditambahkan.", "success");
    }
    close();
  } catch (err) {
    console.error(err);
    showToast("Gagal menyimpan kegiatan. Coba lagi.", "error");
  }
}

// ---------------------------------------------------------------------
// Activity Detail Modal
// ---------------------------------------------------------------------

async function openActivityDetail(activityId) {
  const activity = await getActivity(activityId);
  if (!activity) {
    showToast("Kegiatan tidak ditemukan.", "error");
    return;
  }

  const status =
    ACTIVITY_STATUSES.find((s) => s.value === activity.status) || {};
  const priority =
    ACTIVITY_PRIORITIES.find((p) => p.value === activity.priority) || {};

  const { close, el: modalEl } = openModal({
    title: activity.name,
    size: "lg",
    bodyHtml: `
      <div class="flex gap-2" style="margin-bottom:12px;">
        <span class="badge badge-${status.badge || "gray"}">${escapeHtml(status.label || activity.status)}</span>
        <span class="badge badge-${priority.badge || "gray"}">${escapeHtml(priority.label || activity.priority)}</span>
      </div>
      <p class="text-sm" style="margin-bottom:16px;">${escapeHtml(activity.description || "Tidak ada deskripsi.")}</p>
        <div class="page-grid text-sm" style="margin-bottom:16px;">
        <div class="col-span-6"><strong>📅 Tanggal:</strong> ${formatShortDate(new Date(activity.date))}</div>
        <div class="col-span-6"><strong>🕐 Waktu:</strong> ${activity.startTime} - ${activity.endTime}</div>
        <div class="col-span-6"><strong>📍 Lokasi:</strong> ${escapeHtml(activity.location || "-")}</div>
        <div class="col-span-6"><strong>👤 PIC:</strong> ${escapeHtml(activity.picName || "-")}</div>
        <div class="col-span-6"><strong>🏷️ Kategori:</strong> ${escapeHtml(activity.category || "-")}</div>
        <div class="col-span-6"><strong>📞 Kontak:</strong> ${escapeHtml(activity.contactNumber || "-")}</div>
        ${activity.meetingLink ? `<div class="col-span-6"><strong>🔗 Link Meeting:</strong> <a href="${escapeHtml(activity.meetingLink)}" target="_blank" rel="noopener noreferrer" style="color: var(--color-link, #2563eb); text-decoration: underline;">${escapeHtml(activity.meetingLink)}</a></div>` : ""}

      </div>


      ${
        typeof activity.progress === "number"
          ? `<div style="margin-bottom:16px;">
              <div class="flex justify-between text-xs" style="margin-bottom:4px;"><span>Progress</span><span>${activity.progress}%</span></div>
              <div class="progress"><div class="progress-bar" style="width:${activity.progress}%;"></div></div>
            </div>`
          : ""
      }
      ${activity.notes ? `<p class="text-sm text-muted"><strong>Catatan:</strong> ${escapeHtml(activity.notes)}</p>` : ""}
      <div class="text-xs text-faint" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--color-border-soft);">
        Dibuat oleh ${escapeHtml(activity.createdByName || "-")} · Terakhir diperbarui oleh ${escapeHtml(activity.updatedByName || "-")}
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-danger" data-delete>Hapus</button>
      <button type="button" class="btn" data-duplicate>Duplikat</button>
      <button type="button" class="btn btn-primary" data-edit>Edit</button>
    `,
    onMount: (root) => {
      root.querySelector("[data-edit]").addEventListener("click", () => {
        close();
        openActivityFormModal(activity, activity.id);
      });
      root
        .querySelector("[data-duplicate]")
        .addEventListener("click", async () => {
          const actor = {
            uid: currentUser.uid,
            name: currentProfile?.fullName || currentUser.email,
          };
          await duplicateActivity(activity, actor);
          showToast("Kegiatan berhasil diduplikasi.", "success");
          close();
        });
      root
        .querySelector("[data-delete]")
        .addEventListener("click", async () => {
          try {
            // Pastikan modal delete resolve benar-benar ke cabang kode ini.
            const confirmed = await confirmDelete("kegiatan ini");
            if (!confirmed) return;

            const actor = {
              uid: currentUser.uid,
              name: currentProfile?.fullName || currentUser.email,
            };

            await deleteActivity(activity.id, actor, activity.name);
            showToast("Kegiatan berhasil dihapus.", "success");

            // Tutup modal dulu agar UI bisa langsung refresh/tunggu realtime.
            close();

            // Tunggu sebentar agar listener realtime sempat menerima update.
            setTimeout(() => {
              subscribeToMonth();
              // renderCurrentView akan dipanggil oleh listener realtime,
              // jadi cukup trigger subscribe tanpa render paksa.
            }, 200);

            // Tutup modal sudah dipanggil di atas; bagian ini tetap ada untuk backward-compat.
            // (Tidak mengubah fungsi, hanya menjaga urutan UI update.)
          } catch (err) {
            console.error("Delete activity failed:", err);
            showToast("Gagal menghapus kegiatan. Coba lagi.", "error");
          }
        });
    },
  });
}

// ---------------------------------------------------------------------
// Navigation & realtime subscription
// ---------------------------------------------------------------------

function subscribeToMonth() {
  monthUnsub?.();
  const target = qs("[data-month-grid]");
  if (target)
    target.innerHTML = `<div class="cal-month-grid">${skeletonCalendarGrid()}</div>`;

  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  monthUnsub = listenActivitiesByMonth(monthKey, (docs) => {
    activitiesCache = docs;
    renderCurrentView();
  });
}

function bindNav() {
  qs("[data-nav-prev]").addEventListener("click", () => {
    currentDate = addMonths(currentDate, -1);
    renderToolbar();
    subscribeToMonth();
  });
  qs("[data-nav-next]").addEventListener("click", () => {
    currentDate = addMonths(currentDate, 1);
    renderToolbar();
    subscribeToMonth();
  });
  qs("[data-nav-today]").addEventListener("click", () => {
    currentDate = new Date();
    renderToolbar();
    subscribeToMonth();
  });
  qsa("[data-view-btn]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.viewBtn));
  });
  qs("[data-add-activity-btn]")?.addEventListener("click", () =>
    openActivityFormModal({ date: new Date().toISOString().slice(0, 10) }),
  );
}

async function bootstrap() {
  showLoader({
    text: "Memuat Kalender...",
    subtext: "Mengambil data dari server",
  });
  const { user, profile } = await initApp();
  currentUser = user;
  currentProfile = profile;

  unsubscribers.push(
    listenAllStaff((docs) => {
      staffList = docs;
    }),
  );

  // Untuk List/Card/Table view kita dengarkan seluruh kegiatan aktif (bukan hanya bulan berjalan).
  unsubscribers.push(
    listenAllActiveActivities((docs) => {
      if (currentView !== "month") {
        activitiesCache = docs;
        renderCurrentView();
      }
    }),
  );

  renderToolbar();
  bindNav();
  bindFilterBar();
  subscribeToMonth();

  // Loader ditutup setelah data awal pertama kali dirender.
  // (subscribeToMonth memakai realtime listener, callback pertama akan memanggil renderCurrentView.)
  setTimeout(() => {
    hideLoader();
  }, 700);

  const activityIdFromNotif = getQueryParam("activityId");
  if (activityIdFromNotif) {
    // membuka preview detail kegiatan dari notifikasi
    // (openActivityDetail butuh data via getActivity)
    openActivityDetail(activityIdFromNotif);
  } else if (getQueryParam("action") === "new") {
    openActivityFormModal({ date: new Date().toISOString().slice(0, 10) });
  }
}

bootstrap();
