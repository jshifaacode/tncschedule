/**
 * attendance.js
 * ----------------------------------------------------------------------
 * Logika bisnis Sistem Absensi Staff: absen masuk/keluar, pengajuan
 * status (izin/sakit/cuti/dst), rekap, dan statistik.
 *
 * Struktur dokumen di koleksi `attendance`:
 *   { uid, fullName, jobdesk, photoURL, date: "YYYY-MM-DD", dayName,
 *     checkInTime, checkOutTime, status, note, location,
 *     createdBy, createdAt, updatedAt }
 *
 * Satu dokumen absensi per staff per hari — ID dokumen dibentuk sebagai
 * `${uid}_${date}` agar mudah dicari & mencegah duplikasi entri harian.
 * ----------------------------------------------------------------------
 */

import { db } from "../firebase/firebase-config.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  COLLECTIONS,
  listenCollection,
  getCollectionOnce,
  writeActivityLog,
} from "../firebase/firestore.js";
import { pushNotification } from "./notifications.js";
import { toDateKey, DAY_NAMES } from "../utils/formatter.js";

function attendanceDocId(uid, dateKey) {
  return `${uid}_${dateKey}`;
}

/**
 * Absen masuk. Membuat/menimpa dokumen absensi hari ini dengan jam masuk.
 * @param {{uid:string,fullName:string,jobdesk:string,photoURL?:string}} user
 * @param {{location?:string}} [options]
 */
export async function checkIn(user, options = {}) {
  const now = new Date();
  const dateKey = toDateKey(now);
  const ref = doc(
    db,
    COLLECTIONS.ATTENDANCE,
    attendanceDocId(user.uid, dateKey),
  );

  await setDoc(
    ref,
    {
      uid: user.uid,
      fullName: user.fullName,
      jobdesk: user.jobdesk || "",
      photoURL: user.photoURL || "",
      date: dateKey,
      dayName: DAY_NAMES[now.getDay()],
      checkInTime: now.toISOString(),
      status: "hadir",
      location: options.location || "",
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await writeActivityLog({
    userId: user.uid,
    userName: user.fullName,
    action: "attendance",
    targetType: "attendance",
    targetId: attendanceDocId(user.uid, dateKey),
    description: "melakukan absen masuk",
  });

  try {
    const allStaff = await getCollectionOnce(COLLECTIONS.USERS, {
      where: [["accountStatus", "==", "active"]],
    });
    const recipientIds = allStaff.map((s) => s.uid).filter(Boolean);

    await pushNotification(recipientIds.length ? recipientIds : [user.uid], {
      type: "attendance",
      title: "Absensi masuk",
      message: `${user.fullName} melakukan absen masuk (${dateKey}).`,
      link: "attendance.html",
      icon: "✅",
    });
  } catch (err) {
    console.warn("Gagal push notification attendance:", err);
  }
}

/** Absen keluar. Menambahkan jam keluar ke dokumen absensi hari ini. */
export async function checkOut(user) {
  const now = new Date();
  const dateKey = toDateKey(now);
  const ref = doc(
    db,
    COLLECTIONS.ATTENDANCE,
    attendanceDocId(user.uid, dateKey),
  );

  await setDoc(
    ref,
    { checkOutTime: now.toISOString(), updatedAt: serverTimestamp() },
    { merge: true },
  );

  await writeActivityLog({
    userId: user.uid,
    userName: user.fullName,
    action: "attendance",
    targetType: "attendance",
    targetId: attendanceDocId(user.uid, dateKey),
    description: "melakukan absen keluar",
  });
}

/**
 * Mengajukan status kehadiran non-hadir (Izin/Sakit/Cuti/Dinas Luar/WFH)
 * disertai catatan.
 * @param {{uid:string,fullName:string,jobdesk:string,photoURL?:string}} user
 * @param {string} status
 * @param {string} note
 * @param {string} [dateKey] - default hari ini
 */
export async function submitStatus(user, status, note, dateKey) {
  const key = dateKey || toDateKey(new Date());
  const ref = doc(db, COLLECTIONS.ATTENDANCE, attendanceDocId(user.uid, key));

  await setDoc(
    ref,
    {
      uid: user.uid,
      fullName: user.fullName,
      jobdesk: user.jobdesk || "",
      photoURL: user.photoURL || "",
      date: key,
      dayName: DAY_NAMES[new Date(key).getDay()],
      status,
      note: note || "",
      createdBy: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await writeActivityLog({
    userId: user.uid,
    userName: user.fullName,
    action: "attendance",
    targetType: "attendance",
    targetId: attendanceDocId(user.uid, key),
    description: `mengajukan status "${status}"`,
  });
}

/** Realtime listener absensi hari ini (untuk widget Dashboard & halaman Absensi). */
export function listenTodayAttendance(callback) {
  const dateKey = toDateKey(new Date());
  return listenCollection(
    COLLECTIONS.ATTENDANCE,
    { where: [["date", "==", dateKey]] },
    callback,
  );
}

/** Mengambil rekap absensi dalam rentang tanggal (sekali, untuk halaman Rekap & Export). */
export function getAttendanceRange(startDateKey, endDateKey) {
  return getCollectionOnce(COLLECTIONS.ATTENDANCE, {
    where: [
      ["date", ">=", startDateKey],
      ["date", "<=", endDateKey],
    ],
    orderBy: ["date", "desc"],
  });
}

/** Menghitung statistik ringkas dari sebuah array data absensi (untuk chart & stat card). */
export function computeAttendanceStats(records) {
  const stats = {
    hadir: 0,
    izin: 0,
    sakit: 0,
    dinas_luar: 0,
    wfh: 0,
    cuti: 0,
    tanpa_keterangan: 0,
  };
  for (const r of records) {
    if (stats[r.status] !== undefined) stats[r.status]++;
  }
  return stats;
}
