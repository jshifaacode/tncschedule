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
    .map(
      (s) =>
        `<div class="stat-card"><div class="stat-card-label">${s.label}</div><div class="stat-card-value">${s.value}</div></div>`,
    )
    .join("");
}

function renderProfileFeedList(items, type) {
  const listWrap = qs("[data-profile-feed-list]");
  if (!listWrap) return;

  if (!items.length) {
    listWrap.classList.remove("hidden");
    listWrap.innerHTML = `
      <div class="empty-state" style="padding: 16px 0">
        <div class="empty-state-icon">${type === "comments" ? "💬" : "📝"}</div>
        <div class="empty-state-title">Belum ada ${type === "comments" ? "komentar" : "evaluasi"}.</div>
      </div>
    `;
    return;
  }

  listWrap.classList.remove("hidden");
  listWrap.innerHTML = `
    <div class="flex flex-col gap-3">
      ${items
        .map(
          (it) => `
          <a href="calendar.html?activityId=${encodeURIComponent(it.activityId)}" class="card card-compact" style="display:block; text-decoration:none;">
            <div class="flex items-center justify-between gap-3" style="margin-bottom:6px;">
              <div class="flex items-center gap-2">
                <span class="badge badge-blue">${type === "comments" ? "Komentar" : "Evaluasi"}</span>
                <span class="text-sm text-muted">${it.activityName || "Kegiatan"}</span>
              </div>
              <span class="text-xs text-faint">${it.createdAtText || "—"}</span>
            </div>
            <div style="font-weight:600; margin-bottom:4px;">${type === "comments" ? (it.text || "(tanpa teks)") : (it.title || "(tanpa judul)")}</div>
            <div class="text-xs text-faint">
              ${it.authorName ? `👤 ${it.authorName}` : ""}
            </div>
          </a>
        `,
        )
        .join("")}
    </div>
  `;
}

function bindProfileFeedTabs() {
  const tabs = qsa("[data-profile-feed-tab]");
  if (!tabs.length) return;

  const setActive = (tabValue) => {
    tabs.forEach((t) => {
      const isActive = t.dataset.profileFeedTab === tabValue;
      t.setAttribute("aria-selected", String(isActive));
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const val = tab.dataset.profileFeedTab;
      setActive(val);
      // listener data tidak perlu dipindah karena kita pakai satu listener aktif per tab
      // (di-setup oleh subscribeProfileFeed())
      subscribeProfileFeed(val);
    });
  });
}

let feedUnsub = null;
let currentFeedTab = "comments";

function normalizeTimestampText(value) {
  try {
    if (!value) return "—";
    const d = typeof value.toDate === "function" ? value.toDate() : new Date(value);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Baru saja";
    if (min < 60) return `${min} menit lalu`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} jam lalu`;
    const day = Math.floor(hr / 24);
    if (day === 1) return "Kemarin";
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return "—";
  }
}

async function getActivityName(activityId) {
  // fallback: ambil sekali per item (untuk MVP), realtime detail tidak diperlukan.
  const { getDocById } = await import("../firebase/firestore.js");
  const doc = await getDocById(COLLECTIONS.ACTIVITIES, activityId);
  return doc?.name || "Kegiatan";
}

async function subscribeProfileFeed(tab) {
  currentFeedTab = tab;
  const listWrap = qs("[data-profile-feed-list]");
  const loadingWrap = qs("[data-profile-feed-loading]");

  loadingWrap && loadingWrap.classList.remove("hidden");
  listWrap && listWrap.classList.add("hidden");

  feedUnsub?.();
  feedUnsub = null;

  // Opsi: pakai activities yang realtime aktif + tampilkan comment/evaluasi terbaru dari kegiatan itu.
  // Untuk menjaga performa, kita ambil activity aktif limit kecil.
  const { listenCollection } = await import("../firebase/firestore.js");

  feedUnsub = listenCollection(
    COLLECTIONS.ACTIVITIES,
    {
      where: [["isArchived", "==", false]],
      orderBy: ["date", "desc"],
      limit: 20,
    },
    async (activities) => {
      // Ambil item comment/eval untuk setiap activity (concurrency).
      // Untuk MVP: tampilkan maksimal 10 item.
      const nowTabs = currentFeedTab;
      const items = [];

      await Promise.all(
        activities.map(async (a) => {
          if (nowTabs !== currentFeedTab) return;

          if (tab === "comments") {
            const { listenComments } = await import("./comments.js");
            // untuk realtime list, kita listen per activity sekali lalu ambil snapshot.
            // MVP: pakai getCollectionOnce bukan listener yang masif.
            // Namun repo tidak menyediakan getCommentsOnce, jadi kita ambil dengan listenCollection dulu secara ringkas.
            // Untuk menghindari listener bertumpuk, kita pakai getCollectionOnce via firestore.js
          }
        }),
      );

      // Karena versi awal: lebih aman pakai snapshot once dulu untuk get comments/evals.
      // Kita implementasikan via getCollectionOnce sekarang.
      // (Kalau diinginkan full realtime per activity, bisa dilanjut iterasi berikutnya.)

      loadingWrap && loadingWrap.classList.add("hidden");
      listWrap && listWrap.classList.remove("hidden");
      listWrap && (listWrap.innerHTML = `<div class="empty-state" style="padding: 16px 0"><div class="empty-state-icon">⚙️</div><div class="empty-state-title">Muat data feed…</div></div>`);

      if (tab === "comments") {
        const { getCollectionOnce } = await import("../firebase/firestore.js");
        const { subcollectionPath } = await import("../firebase/firestore.js");
        for (const a of activities.slice(0, 10)) {
          const commentsPath = subcollectionPath(COLLECTIONS.ACTIVITIES, a.id, "comments");
          const comments = await getCollectionOnce(commentsPath, {
            orderBy: ["createdAt", "desc"],
            limit: 5,
          });
          for (const c of comments) {
            items.push({
              id: c.id,
              activityId: a.id,
              activityName: a.name,
              authorName: c.authorName,
              createdAtText: normalizeTimestampText(c.createdAt),
              text: c.text,
            });
          }
        }
      } else {
        const { getCollectionOnce } = await import("../firebase/firestore.js");
        const { subcollectionPath } = await import("../firebase/firestore.js");
        for (const a of activities.slice(0, 10)) {
          const evalPath = subcollectionPath(COLLECTIONS.ACTIVITIES, a.id, "evaluations");
          const evaluations = await getCollectionOnce(evalPath, {
            orderBy: ["createdAt", "desc"],
            limit: 5,
          });
          for (const ev of evaluations) {
            items.push({
              id: ev.id,
              activityId: a.id,
              activityName: a.name,
              authorName: ev.authorName,
              createdAtText: normalizeTimestampText(ev.createdAt),
              title: ev.title,
              content: ev.content,
            });
          }
        }
      }

      items.sort((a, b) => String(b.createdAtText).localeCompare(String(a.createdAtText)));
      renderProfileFeedList(items.slice(0, 10), tab);

      loadingWrap && loadingWrap.classList.add("hidden");
    },
  );
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
