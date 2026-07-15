/**
 * settings-page.js (page-level module, loaded only by settings.html)
 * ----------------------------------------------------------------------
 * Halaman Pengaturan: ubah password, ubah email, pilihan tema,
 * preferensi notifikasi.
 * ----------------------------------------------------------------------
 */

import { initApp } from "../app.js";
import { qs, qsa } from "../utils/helper.js";
import {
  changePassword,
  changeEmail,
  saveUserSettings,
  getUserSettings,
  deleteAccount,
} from "./settings.js";

import { requestBrowserNotificationPermission } from "./notifications.js";
import { showToast } from "../components/toast.js";
import { confirmDialog, openModal } from "../components/modal.js";

import {
  minLength,
  passwordsMatch,
  required,
  isValidEmail,
  runValidators,
} from "../utils/validator.js";
import { getPref, setPref } from "../utils/storage.js";
import { mapAuthError } from "../firebase/auth.js";

let currentUser = null;

function bindThemeSwitch() {
  const buttons = qsa("[data-theme-option]");
  const current = getPref("theme", "light");
  buttons.forEach((btn) =>
    btn.setAttribute(
      "aria-pressed",
      String(btn.dataset.themeOption === current),
    ),
  );

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.themeOption;
      document.documentElement.setAttribute("data-theme", theme);
      setPref("theme", theme);
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    });
  });
}

function bindPasswordForm() {
  qs("#password-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = qs("#currentPassword").value;
    const newPassword = qs("#newPassword").value;
    const confirmPassword = qs("#confirmNewPassword").value;

    const check = runValidators([
      () => required(currentPassword, "Kata sandi saat ini"),
      () => minLength(newPassword, 6, "Kata sandi baru"),
      () => passwordsMatch(newPassword, confirmPassword),
    ]);
    if (!check.valid) return showToast(check.message, "error");

    try {
      await changePassword(currentPassword, newPassword);
      showToast("Kata sandi berhasil diperbarui.", "success");
      e.target.reset();
    } catch (err) {
      showToast(mapAuthError(err.code), "error");
    }
  });
}

function bindEmailForm() {
  qs("#email-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = qs("#emailCurrentPassword").value;
    const newEmail = qs("#newEmail").value.trim();

    const check = runValidators([
      () => required(currentPassword, "Kata sandi"),
      () => required(newEmail, "Email baru"),
      () => isValidEmail(newEmail),
    ]);
    if (!check.valid) return showToast(check.message, "error");

    try {
      await changeEmail(currentPassword, newEmail);
      showToast("Email berhasil diperbarui.", "success");
      e.target.reset();
    } catch (err) {
      showToast(mapAuthError(err.code), "error");
    }
  });
}

function bindNotificationPrefs() {
  const toggle = qs("#browser-notif-toggle");
  toggle?.addEventListener("change", async () => {
    if (toggle.checked) {
      const permission = await requestBrowserNotificationPermission();
      if (permission !== "granted") {
        toggle.checked = false;
        showToast("Izin notifikasi browser ditolak.", "error");
        return;
      }
    }
    await saveUserSettings(currentUser.uid, {
      browserNotifications: toggle.checked,
    });
    showToast("Preferensi notifikasi disimpan.", "success");
  });
}

function bindDeleteAccount() {
  const btn = qs("[data-delete-account-btn]");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const ok = await confirmDialog({
      icon: "🗑️",
      title: "Hapus akun?",
      message:
        "Tindakan ini akan menghapus akun dan akses login Anda. Lanjutkan hanya jika yakin.",
      confirmLabel: "Ya, Hapus Akun",
      danger: true,
    });

    if (!ok) return;

    const modal = openModal({
      title: "Konfirmasi penghapusan akun",
      size: "md",
      bodyHtml: `
        <form id="delete-account-form" class="flex flex-col gap-4">
          <div class="field">
            <label class="field-label">Password untuk konfirmasi</label>
            <input
              class="input"
              type="password"
              id="deleteAccountPassword"
              autocomplete="current-password"
              required
            />
          </div>
          <p class="text-muted" style="margin:0;">
            Anda perlu memasukkan password agar re-autentikasi berhasil.
          </p>
        </form>
      `,
      footerHtml: `
        <button type="button" class="btn" data-modal-close>Batal</button>
        <button type="button" class="btn btn-danger" id="delete-account-confirm">Hapus</button>
      `,
    });

    try {
      qs("#delete-account-confirm")?.addEventListener("click", async () => {
        const password = qs("#deleteAccountPassword").value;
        if (!password) {
          showToast("Password wajib diisi.", "error");
          return;
        }

        try {
          const pw = password;
          await deleteAccount(pw);
          showToast("Akun berhasil dihapus.", "success");
          modal.close();
          window.location.href = "login.html";
        } catch (err) {
          showToast(mapAuthError(err.code), "error");
        }
      });
    } catch (e) {
      console.error(e);
      modal.close();
      showToast("Terjadi kesalahan.", "error");
    }
  });
}

async function bootstrap() {
  const { user } = await initApp();
  currentUser = user;

  bindThemeSwitch();
  bindPasswordForm();
  bindEmailForm();
  bindNotificationPrefs();
  bindDeleteAccount();

  const settings = await getUserSettings(user.uid);
  const toggle = qs("#browser-notif-toggle");
  if (toggle && settings?.browserNotifications) toggle.checked = true;
}

bootstrap();
