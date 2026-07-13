/**
 * staff.js
 * ----------------------------------------------------------------------
 * Logika untuk menu "Data Staff": direktori seluruh staff internal
 * yang otomatis terisi dari koleksi `users` saat registrasi.
 * ----------------------------------------------------------------------
 */

import { COLLECTIONS, listenCollection, getDocById } from "../firebase/firestore.js";

/** Realtime listener seluruh staff, diurutkan berdasarkan nama. */
export function listenAllStaff(callback) {
  return listenCollection(COLLECTIONS.USERS, { orderBy: ["fullName", "asc"] }, callback);
}

/** Mengambil satu profil staff (untuk halaman detail staff). */
export function getStaffProfile(uid) {
  return getDocById(COLLECTIONS.USERS, uid);
}

/** Live search sederhana di sisi klien pada daftar staff yang sudah dimuat. */
export function searchStaff(staffList, keyword) {
  if (!keyword) return staffList;
  const kw = keyword.toLowerCase();
  return staffList.filter((s) =>
    `${s.fullName} ${s.jobdesk} ${s.email} ${s.division || ""}`.toLowerCase().includes(kw)
  );
}

/**
 * Menghitung statistik ringkas seorang staff (jumlah kegiatan dibuat,
 * komentar, evaluasi) berdasarkan data yang sudah ada di memori.
 * Dipanggil dari halaman detail staff setelah data activities & logs dimuat.
 */
export function computeStaffStats(uid, activities, activityLogs) {
  return {
    activitiesCreated: activities.filter((a) => a.createdBy === uid).length,
    comments: activityLogs.filter((l) => l.userId === uid && l.action === "comment").length,
    evaluations: activityLogs.filter((l) => l.userId === uid && l.action === "evaluation").length,
  };
}
