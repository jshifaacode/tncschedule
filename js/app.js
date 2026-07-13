/**
 * app.js
 * ----------------------------------------------------------------------
 * Bootstrap yang dijalankan di SETIAP halaman terautentikasi
 * (dashboard, calendar, attendance, staff, profile, settings, notifications).
 * Tanggung jawab:
 *  1. Memastikan pengguna sudah login (requireAuth) — redirect jika belum.
 *  2. Menerapkan tema (light/dark) sebelum konten terlihat.
 *  3. Merender Sidebar (desktop) dan Bottom Navigation (mobile).
 *  4. Menyediakan info user yang sedang login ke seluruh modul halaman
 *     melalui event "tnc:auth-ready".
 * ----------------------------------------------------------------------
 */

import { requireAuth, logout } from "./firebase/auth.js";
import { getDocById } from "./firebase/firestore.js";
import { COLLECTIONS } from "./firebase/firestore.js";
import { renderSidebar } from "./components/sidebar.js";
import { renderBottomNav } from "./components/bottom-navbar.js";
import { showToast } from "./components/toast.js";
import { getPref, setPref } from "./utils/storage.js";
import { qs, qsa } from "./utils/helper.js";
import { getInitials } from "./utils/formatter.js";

/** Menerapkan tema tersimpan sesegera mungkin untuk menghindari flash of unstyled theme. */
function applyStoredTheme() {
  const theme = getPref("theme", "light");
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.add("theme-ready");
}

/** Memasang toggle tema di header (dipanggil setelah header ter-render). */
export function bindThemeToggle(selector = "[data-theme-toggle]") {
  qsa(selector).forEach((btn) => {
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      setPref("theme", next);
    });
  });
}

/** Memasang tombol logout di mana pun ia berada (header/sidebar/profile). */
function bindLogoutButtons() {
  qsa("[data-logout-btn]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await logout();
        window.location.href = "login.html";
      } catch (err) {
        showToast("Gagal logout. Coba lagi.", "error");
        console.error(err);
      }
    });
  });
}

/** Merender info user (nama, foto, jobdesk) ke elemen header bila tersedia. */
function renderUserWidget(userProfile) {
  const nameEl = qs("[data-user-name]");
  const jobdeskEl = qs("[data-user-jobdesk]");
  const avatarEl = qs("[data-user-avatar]");

  if (nameEl) nameEl.textContent = userProfile?.fullName || "Staff TNC";
  if (jobdeskEl) jobdeskEl.textContent = userProfile?.jobdesk || "-";
  if (avatarEl) {
    if (userProfile?.photoURL) {
      avatarEl.innerHTML = `<img src="${userProfile.photoURL}" alt="${userProfile.fullName}" class="avatar avatar-sm">`;
    } else {
      avatarEl.innerHTML = `<div class="avatar avatar-sm avatar-fallback">${getInitials(userProfile?.fullName)}</div>`;
    }
  }
}

/**
 * Inisialisasi utama halaman terautentikasi.
 * Panggil ini di paling atas file modul halaman, contoh (dashboard.js):
 *
 *   import { initApp } from "./app.js";
 *   const { user, profile } = await initApp();
 *   // ...lanjutkan logika khusus dashboard
 *
 * @returns {Promise<{user: import("firebase/auth").User, profile: object|null}>}
 */
export async function initApp() {
  applyStoredTheme();

  const user = await requireAuth();

  renderSidebar("#sidebar-root");
  renderBottomNav("#bottomnav-root");
  bindThemeToggle();
  bindLogoutButtons();

  let profile = null;
  try {
    profile = await getDocById(COLLECTIONS.USERS, user.uid);
  } catch (err) {
    console.error("Gagal memuat profil pengguna:", err);
  }

  renderUserWidget(profile);

  document.dispatchEvent(new CustomEvent("tnc:auth-ready", { detail: { user, profile } }));

  return { user, profile };
}
