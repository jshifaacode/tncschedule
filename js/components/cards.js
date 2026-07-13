/**
 * cards.js
 * ----------------------------------------------------------------------
 * Renderer kartu kegiatan yang dipakai ulang di Dashboard, Kalender
 * (Card View), dan halaman Arsip.
 * ----------------------------------------------------------------------
 */

import { escapeHtml } from "../utils/helper.js";
import { formatShortDate, formatTime, truncate } from "../utils/formatter.js";
import { ACTIVITY_STATUSES, ACTIVITY_PRIORITIES } from "../utils/constants.js";

function findMeta(list, value) {
  return (
    list.find((item) => item.value === value) || { label: value, badge: "gray" }
  );
}

/**
 * Merender satu kartu kegiatan.
 * @param {object} activity - dokumen kegiatan dari Firestore
 * @returns {string} HTML
 */
export function activityCard(activity) {
  const status = findMeta(ACTIVITY_STATUSES, activity.status);
  const priority = findMeta(ACTIVITY_PRIORITIES, activity.priority);
  const isLate =
    activity.status !== "selesai" &&
    activity.status !== "dibatalkan" &&
    activity.date &&
    new Date(activity.date) < new Date(new Date().toDateString());

  return `
    <div class="card card-compact activity-card" data-activity-id="${activity.id}" role="button" tabindex="0">
      <div class="flex items-center justify-between gap-2" style="margin-bottom:8px;">
        <span class="badge badge-${status.badge}">${escapeHtml(status.label)}</span>
        <span class="badge badge-${priority.badge}">${escapeHtml(priority.label)}</span>
        ${isLate ? `<span class="badge badge-red">⚠ Terlambat</span>` : ""}
      </div>
      <h4 style="margin-bottom:4px;">${escapeHtml(activity.name || "Tanpa Nama")}</h4>
      <p class="text-sm text-muted" style="margin-bottom:8px;">${escapeHtml(truncate(activity.description || "", 80))}</p>
      <div class="flex items-center gap-2 text-xs text-faint">
        <span>📅 ${formatShortDate(activity.date)}</span>
        <span>🕐 ${activity.startTime || "-"}</span>
        <span>📍 ${escapeHtml(truncate(activity.location || "-", 24))}</span>
      </div>
      ${
        typeof activity.progress === "number"
          ? `<div class="progress" style="margin-top:10px;"><div class="progress-bar" style="width:${activity.progress}%;"></div></div>
             <div class="text-xs text-faint" style="margin-top:4px;">${activity.progress}% selesai</div>`
          : ""
      }
    </div>
  `;
}

/** Merender daftar upcoming activity ringkas (dipakai di widget Dashboard). */
export function upcomingActivityRow(activity) {
  const involvedIds = Array.isArray(activity.involvedStaffIds)
    ? activity.involvedStaffIds
    : [];
  const involvedNames = Array.isArray(activity.involvedStaffNames)
    ? activity.involvedStaffNames
    : [];

  // Prefer tampilkan nama jika tersedia, fallback ke ID.
  const staffLabels = involvedNames.length ? involvedNames : involvedIds;
  const extra = staffLabels.length
    ? `
        <div class="activity-row-staff">👥 ${escapeHtml(staffLabels.slice(0, 3).join(", "))}${staffLabels.length > 3 ? "…" : ""}</div>
      `
    : "";

  return `
    <div class="activity-row" data-activity-id="${activity.id}" role="button" tabindex="0">
      <div class="activity-row-icon">📅</div>
      <div class="activity-row-body">
        <div style="font-weight:600;">${escapeHtml(activity.name || "Tanpa Nama")}</div>
        <div class="activity-row-time">${formatShortDate(activity.date)} · ${activity.startTime || "-"} · ${escapeHtml(activity.location || "-")}</div>
        ${extra}
      </div>
    </div>
  `;
}

/** Merender baris feed aktivitas (recent activity / activity log ringkas). */
export function feedRow(logEntry) {
  const icons = {
    create: "🟢",
    update: "📝",
    delete: "🗑️",
    comment: "💬",
    upload: "📷",
  };
  return `
    <div class="activity-row">
      <div class="activity-row-icon">${icons[logEntry.action] || "🔔"}</div>
      <div class="activity-row-body">
        <div class="text-sm"><strong>${escapeHtml(logEntry.userName || "Seseorang")}</strong> ${escapeHtml(logEntry.description || "")}</div>
        <div class="activity-row-time">${formatTime(logEntry.createdAt)}</div>
      </div>
    </div>
  `;
}
