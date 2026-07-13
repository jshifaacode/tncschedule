/**
 * dialog.js
 * ----------------------------------------------------------------------
 * Alias semantik untuk confirmDialog dari modal.js, sehingga modul lain
 * dapat menulis `import { confirmDelete } from "../components/dialog.js"`
 * yang lebih deskriptif untuk kasus penghapusan data.
 * ----------------------------------------------------------------------
 */

import { confirmDialog } from "./modal.js";

/**
 * Dialog konfirmasi khusus untuk aksi hapus.
 * @param {string} itemLabel - contoh: "kegiatan ini", "komentar ini"
 */
export function confirmDelete(itemLabel = "data ini") {
  return confirmDialog({
    icon: "🗑️",
    title: `Hapus ${itemLabel}?`,
    message: `Apakah Anda yakin ingin menghapus ${itemLabel}? Tindakan ini tidak dapat dibatalkan.`,
    confirmLabel: "Ya, Hapus",
    danger: true,
  });
}

export { confirmDialog };
