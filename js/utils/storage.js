/**
 * storage.js (utils)
 * ----------------------------------------------------------------------
 * Wrapper localStorage untuk preferensi UI ringan yang TIDAK perlu
 * tersimpan di Firestore (tema, status sidebar collapsed, tata letak
 * dashboard). Data akun/kegiatan/absensi tetap di Firestore.
 * ----------------------------------------------------------------------
 */

const PREFIX = "tncschedule:";

export function getPref(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setPref(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn("Gagal menyimpan preferensi lokal:", err);
  }
}

export function removePref(key) {
  localStorage.removeItem(PREFIX + key);
}
