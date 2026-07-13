/**
 * profile-page.js (page-level module, loaded only by profile.html)
 * ----------------------------------------------------------------------
 * Halaman profil pribadi: edit data diri, ganti foto profil, dan
 * ringkasan statistik pribadi.
 * ----------------------------------------------------------------------
 */

import { initApp } from "../app.js";
import { qs } from "../utils/helper.js";
import { getInitials } from "../utils/formatter.js";
import { COLLECTIONS, updateDocById, getCollectionOnce } from "../firebase/firestore.js";
import { uploadFile, validateFile, buildStoragePath, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "../firebase/storage.js";
import { showToast } from "../components/toast.js";
import { required } from "../utils/validator.js";

let currentUser = null;

function fillForm(profile) {
  qs("#fullName").value = profile?.fullName || "";
  qs("#phone").value = profile?.phone || "";
  qs("#jobdesk").value = profile?.jobdesk || "";
  qs("#division").value = profile?.division || "";

  qs("[data-profile-name]").textContent = profile?.fullName || "-";
  qs("[data-profile-jobdesk]").textContent = profile?.jobdesk || "-";

  const avatarWrap = qs("[data-profile-avatar]");
  if (profile?.photoURL) {
    avatarWrap.innerHTML = `<img src="${profile.photoURL}" class="avatar avatar-xl" alt="Foto profil">`;
  } else {
    avatarWrap.innerHTML = `<div class="avatar avatar-xl avatar-fallback" style="font-size:28px;">${getInitials(profile?.fullName)}</div>`;
  }
}

async function renderStats() {
  const [activities, logs, attendance] = await Promise.all([
    getCollectionOnce(COLLECTIONS.ACTIVITIES, { where: [["createdBy", "==", currentUser.uid]] }),
    getCollectionOnce(COLLECTIONS.ACTIVITY_LOGS, { where: [["userId", "==", currentUser.uid]] }),
    getCollectionOnce(COLLECTIONS.ATTENDANCE, { where: [["uid", "==", currentUser.uid]] }),
  ]);

  const comments = logs.filter((l) => l.action === "comment").length;
  const evaluations = logs.filter((l) => l.action === "evaluation").length;
  const hadir = attendance.filter((a) => a.status === "hadir").length;
  const izin = attendance.filter((a) => a.status === "izin").length;

  const target = qs("[data-profile-stats]");
  if (!target) return;
  target.innerHTML = [
    { label: "Kegiatan Dibuat", value: activities.length },
    { label: "Komentar", value: comments },
    { label: "Evaluasi", value: evaluations },
    { label: "Hadir", value: hadir },
    { label: "Izin", value: izin },
  ]
    .map((s) => `<div class="stat-card"><div class="stat-card-label">${s.label}</div><div class="stat-card-value">${s.value}</div></div>`)
    .join("");
}

function bindAvatarUpload() {
  const input = qs("#avatar-upload-input");
  input?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const check = validateFile(file, { allowedTypes: ALLOWED_IMAGE_TYPES, maxSize: MAX_IMAGE_SIZE_BYTES });
    if (!check.valid) return showToast(check.message, "error");

    try {
      const path = buildStoragePath("avatars", currentUser.uid, file.name);
      const { url } = await uploadFile(path, file);
      await updateDocById(COLLECTIONS.USERS, currentUser.uid, { photoURL: url });
      showToast("Foto profil berhasil diperbarui.", "success");
      qs("[data-profile-avatar]").innerHTML = `<img src="${url}" class="avatar avatar-xl" alt="Foto profil">`;
    } catch (err) {
      console.error(err);
      showToast("Gagal mengunggah foto.", "error");
    }
  });
}

function bindForm() {
  qs("#profile-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fullName = qs("#fullName").value.trim();
    const check = required(fullName, "Nama lengkap");
    if (!check.valid) return showToast(check.message, "error");

    try {
      await updateDocById(COLLECTIONS.USERS, currentUser.uid, {
        fullName,
        phone: qs("#phone").value.trim(),
        jobdesk: qs("#jobdesk").value.trim(),
        division: qs("#division").value.trim(),
      });
      showToast("Profil berhasil diperbarui.", "success");
      qs("[data-profile-name]").textContent = fullName;
      qs("[data-profile-jobdesk]").textContent = qs("#jobdesk").value.trim();
    } catch (err) {
      console.error(err);
      showToast("Gagal memperbarui profil.", "error");
    }
  });
}

async function bootstrap() {
  const { user, profile } = await initApp();
  currentUser = user;
  fillForm(profile);
  bindForm();
  bindAvatarUpload();
  renderStats();
}

bootstrap();
