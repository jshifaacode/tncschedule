/**
 * formatter.js
 * ----------------------------------------------------------------------
 * Fungsi murni untuk memformat tanggal, waktu, ukuran file, dan teks.
 * Tidak bergantung pada Firebase atau DOM.
 * ----------------------------------------------------------------------
 */

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * Mengubah Firestore Timestamp atau Date menjadi objek Date JS.
 * @param {any} value
 * @returns {Date|null}
 */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  return new Date(value);
}

/** Format: "Rabu, 8 Juli 2026" */
export function formatFullDate(value) {
  const date = toDate(value);
  if (!date) return "-";
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/** Format: "8 Jul 2026" */
export function formatShortDate(value) {
  const date = toDate(value);
  if (!date) return "-";
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
}

/** Format: "14:05" */
export function formatTime(value) {
  const date = toDate(value);
  if (!date) return "-";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/** Format relatif: "Baru saja", "5 menit lalu", "2 jam lalu", "Kemarin", tanggal lengkap jika lebih lama. */
export function formatRelativeTime(value) {
  const date = toDate(value);
  if (!date) return "-";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "Kemarin";
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return formatShortDate(date);
}

/** Format ukuran file: 1024 -> "1 KB" */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Mengambil inisial dari nama lengkap untuk avatar fallback. Contoh: "Jayshifa Banyuwana" -> "JB" */
export function getInitials(fullName) {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Format key tanggal untuk grouping/query, contoh: Date -> "2026-07-08" */
export function toDateKey(value) {
  const date = toDate(value);
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Kapitalisasi awal setiap kata. */
export function toTitleCase(str) {
  return String(str)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Memotong teks panjang dengan ellipsis. */
export function truncate(str, maxLength = 60) {
  if (!str) return "";
  return str.length > maxLength ? `${str.slice(0, maxLength).trim()}…` : str;
}

export { DAY_NAMES, MONTH_NAMES };
