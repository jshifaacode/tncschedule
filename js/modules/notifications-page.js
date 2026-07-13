/**
 * notifications-page.js (page-level module, loaded only by notifications.html)
 * ----------------------------------------------------------------------
 * Notification Center: daftar notifikasi realtime milik user, dengan
 * aksi tandai dibaca dan hapus.
 * ----------------------------------------------------------------------
 */

import { initApp } from "../app.js";
import { qs, qsa, escapeHtml } from "../utils/helper.js";
import { formatRelativeTime } from "../utils/formatter.js";
import {
  listenMyNotifications,
  markAsRead,
  deleteNotification,
} from "./notifications.js";
import { skeletonList } from "../components/skeleton.js";

function render(notifications) {
  const target = qs("[data-notif-list]");
  if (!target) return;

  if (!notifications.length) {
    target.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔔</div>
        <div class="empty-state-title">Belum ada notifikasi.</div>
      </div>`;
    return;
  }

  target.innerHTML = notifications
    .map(
      (n) => `
      <div class="activity-row" data-notif-id="${n.id}" style="${n.isRead ? "" : "background:var(--color-surface-alt);"} border-radius:8px; padding-inline:8px;">
        <div class="activity-row-icon">${n.icon || "🔔"}</div>
        <div class="activity-row-body">
          <div style="font-weight:600;">${escapeHtml(n.title)}</div>
          <div class="text-sm text-muted">${escapeHtml(n.message)}</div>
          <div class="activity-row-time">${formatRelativeTime(n.createdAt)}</div>
        </div>
        <div class="flex gap-1">
          ${!n.isRead ? `<button class="btn btn-icon btn-ghost btn-sm" data-mark-read="${n.id}" aria-label="Tandai dibaca">✓</button>` : ""}
          <a class="btn btn-icon btn-ghost btn-sm" href="${n.link || "calendar.html"}" target="_self" aria-label="Lihat di kalender" data-notif-open="${n.id}">↗</a>
          <button class="btn btn-icon btn-ghost btn-sm" data-delete-notif="${n.id}" aria-label="Hapus">✕</button>
        </div>
      </div>`,
    )
    .join("");

  qsa("[data-mark-read]", target).forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      markAsRead(btn.dataset.markRead);
    });
  });
  qsa("[data-delete-notif]", target).forEach((btn) => {
    btn.addEventListener("click", () =>
      deleteNotification(btn.dataset.deleteNotif),
    );
  });
}

async function bootstrap() {
  const { user } = await initApp();
  const target = qs("[data-notif-list]");
  if (target) target.innerHTML = skeletonList(5);

  // Pastikan realtime listener berjalan bahkan jika createdAt belum terisi langsung.
  listenMyNotifications(user.uid, render);
}

bootstrap();
