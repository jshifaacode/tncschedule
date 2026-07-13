/**
 * toast.js
 * ----------------------------------------------------------------------
 * Sistem toast notification global. Dipakai di seluruh halaman:
 *   import { showToast } from "../components/toast.js";
 *   showToast("Kegiatan berhasil ditambahkan.", "success");
 * ----------------------------------------------------------------------
 */

import { el, qs } from "../utils/helper.js";

function ensureRegion() {
  let region = qs("#toast-region");
  if (!region) {
    region = el("div", {
      id: "toast-region",
      class: "toast-region",
      role: "status",
      "aria-live": "polite",
    });
    document.body.appendChild(region);
  }
  return region;
}

const ICONS = {
  success: "✅",
  error: "⚠️",
  info: "🔔",
};

/**
 * Menampilkan toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - ms sebelum otomatis hilang
 */
export function showToast(message, type = "info", duration = 3500) {
  const region = ensureRegion();
  const toast = el(
    "div",
    { class: `toast toast-${type}` },
    [`${ICONS[type] || ""} ${message}`]
  );
  region.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    toast.style.transition = "opacity 200ms ease, transform 200ms ease";
    setTimeout(() => toast.remove(), 200);
  }, duration);
}
