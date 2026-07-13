/**
 * staff-detail-page.js (page-level module, loaded only by staff-detail.html)
 * ----------------------------------------------------------------------
 * Halaman detail satu staff: profil lengkap + statistik kontribusi.
 * ----------------------------------------------------------------------
 */

import { initApp } from "../app.js";
import { qs, getQueryParam } from "../utils/helper.js";
import { formatShortDate, getInitials } from "../utils/formatter.js";
import { getStaffProfile } from "./staff.js";
import { COLLECTIONS, getCollectionOnce } from "../firebase/firestore.js";

async function bootstrap() {
  await initApp();
  const staffId = getQueryParam("id");
  if (!staffId) {
    window.location.href = "staff.html";
    return;
  }

  const profile = await getStaffProfile(staffId);
  if (!profile) {
    qs("[data-staff-detail-content]").innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🚫</div>
        <div class="empty-state-title">Staff tidak ditemukan.</div>
        <a href="staff.html" class="btn">Kembali ke Data Staff</a>
      </div>`;
    return;
  }

  qs("[data-staff-name]").textContent = profile.fullName;
  qs("[data-staff-jobdesk]").textContent = profile.jobdesk || "-";
  qs("[data-staff-email]").textContent = profile.email || "-";
  qs("[data-staff-phone]").textContent = profile.phone || "-";
  qs("[data-staff-joined]").textContent = profile.joinedAt ? formatShortDate(profile.joinedAt) : "-";

  const avatarWrap = qs("[data-staff-avatar]");
  avatarWrap.innerHTML = profile.photoURL
    ? `<img src="${profile.photoURL}" class="avatar avatar-xl" alt="">`
    : `<div class="avatar avatar-xl avatar-fallback" style="font-size:28px;">${getInitials(profile.fullName)}</div>`;

  const [activities, logs, attendance] = await Promise.all([
    getCollectionOnce(COLLECTIONS.ACTIVITIES, { where: [["createdBy", "==", staffId]] }),
    getCollectionOnce(COLLECTIONS.ACTIVITY_LOGS, { where: [["userId", "==", staffId]] }),
    getCollectionOnce(COLLECTIONS.ATTENDANCE, { where: [["uid", "==", staffId]] }),
  ]);

  const stats = [
    { label: "Kegiatan Dibuat", value: activities.length },
    { label: "Komentar", value: logs.filter((l) => l.action === "comment").length },
    { label: "Evaluasi", value: logs.filter((l) => l.action === "evaluation").length },
    { label: "Total Hadir", value: attendance.filter((a) => a.status === "hadir").length },
  ];
  qs("[data-staff-stats]").innerHTML = stats
    .map((s) => `<div class="stat-card"><div class="stat-card-label">${s.label}</div><div class="stat-card-value">${s.value}</div></div>`)
    .join("");
}

bootstrap();
