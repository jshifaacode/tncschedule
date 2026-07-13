/**
 * activities.js
 * ----------------------------------------------------------------------
 * Logika bisnis untuk Manajemen Kegiatan (fitur inti aplikasi).
 * Modul ini membungkus firestore.js dengan aturan khusus domain:
 * struktur dokumen kegiatan, deteksi konflik jadwal, activity log,
 * dan realtime subscription untuk Shared Calendar.
 * ----------------------------------------------------------------------
 */

import {
  COLLECTIONS,
  createDoc,
  updateDocById,
  deleteDocById,
  getDocById,
  listenCollection,
  getCollectionOnce,
  writeActivityLog,
} from "../firebase/firestore.js";
import { pushNotification } from "./notifications.js";

import { isTimeOverlap } from "../utils/helper.js";

/**
 * @typedef {object} ActivityInput
 * @property {string} name
 * @property {string} description
 * @property {string} location
 * @property {string} address
 * @property {string} date - format "YYYY-MM-DD"
 * @property {string} startTime - format "HH:MM"
 * @property {string} endTime - format "HH:MM"
 * @property {string} picId
 * @property {string} picName
 * @property {string[]} involvedStaffIds
 * @property {string} category
 * @property {string} status
 * @property {string} priority
 * @property {number} progress
 * @property {string} color
 * @property {string} repeat
 * @property {number|null} reminderMinutes
 * @property {string} meetingLink
 * @property {string} contactNumber
 * @property {string} notes
 * @property {string[]} tags
 */

/**
 * Membuat kegiatan baru. Menulis Activity Log secara otomatis.
 * @param {ActivityInput} data
 * @param {{uid:string, name:string}} actor
 */
export async function createActivity(data, actor) {
  const id = await createDoc(COLLECTIONS.ACTIVITIES, {
    ...data,
    isArchived: false,
    isFavorite: false,
    createdBy: actor.uid,
    createdByName: actor.name,
    updatedByName: actor.name,
  });

  await writeActivityLog({
    userId: actor.uid,
    userName: actor.name,
    action: "create",
    targetType: "activity",
    targetId: id,
    targetName: data.name,
    description: `menambahkan kegiatan "${data.name}"`,
  });

  // Notifikasi ke semua staff (sesuai requirement).
  try {
    // Requirement: Notifikasi ke semua staff.
    const allStaff = await getCollectionOnce(COLLECTIONS.USERS, {
      where: [["accountStatus", "==", "active"]],
    });
    const recipientIds = allStaff.map((s) => s.uid).filter(Boolean);

    // Fallback bila field accountStatus tidak diisi.
    const safeRecipientIds = recipientIds.length
      ? recipientIds
      : allStaff.map((s) => s.uid).filter(Boolean);

    await pushNotification(safeRecipientIds, {
      type: "activity",
      title: "Kegiatan baru dibuat",
      message: `"${data.name}" telah dibuat oleh ${actor.name}.`,
      // arahkan ke preview kegiatan di kalender
      link: `calendar.html?activityId=${encodeURIComponent(id)}`,
      icon: "📌",
    });
  } catch (err) {
    console.warn("Gagal push notification activity:", err);
  }

  return id;
}

/**
 * Memperbarui kegiatan. Menyimpan nilai before/after untuk Audit Trail
 * pada field-field penting (lokasi & status), sesuai spesifikasi.
 * @param {string} id
 * @param {Partial<ActivityInput>} data
 * @param {{uid:string, name:string}} actor
 * @param {object} [previousData] - dokumen sebelum perubahan, untuk audit trail
 */
export async function updateActivity(id, data, actor, previousData) {
  await updateDocById(COLLECTIONS.ACTIVITIES, id, {
    ...data,
    updatedByName: actor.name,
  });

  const auditFields = ["location", "status", "date", "priority"];
  const changes = [];
  if (previousData) {
    for (const field of auditFields) {
      if (field in data && data[field] !== previousData[field]) {
        changes.push({
          field,
          before: previousData[field],
          after: data[field],
        });
      }
    }
  }

  await writeActivityLog({
    userId: actor.uid,
    userName: actor.name,
    action: "update",
    targetType: "activity",
    targetId: id,
    targetName: data.name || previousData?.name,
    description: `mengubah kegiatan "${data.name || previousData?.name}"`,
    changes,
  });
}

/** Menghapus kegiatan. @param {string} id @param {{uid:string,name:string}} actor @param {string} activityName */
export async function deleteActivity(id, actor, activityName) {
  await deleteDocById(COLLECTIONS.ACTIVITIES, id);
  await writeActivityLog({
    userId: actor.uid,
    userName: actor.name,
    action: "delete",
    targetType: "activity",
    targetId: id,
    targetName: activityName,
    description: `menghapus kegiatan "${activityName}"`,
  });
}

/** Menyalin (duplicate) kegiatan menjadi draft baru dengan nama "(Salinan)". */
export async function duplicateActivity(original, actor) {
  const { id: _omit, createdAt, updatedAt, ...rest } = original;
  return createActivity(
    {
      ...rest,
      name: `${original.name} (Salinan)`,
      status: "belum_dimulai",
      progress: 0,
    },
    actor,
  );
}

/** Mengarsipkan / memulihkan kegiatan. */
export function setActivityArchived(id, isArchived) {
  return updateDocById(COLLECTIONS.ACTIVITIES, id, { isArchived });
}

/** Toggle favorit kegiatan. */
export function setActivityFavorite(id, isFavorite) {
  return updateDocById(COLLECTIONS.ACTIVITIES, id, { isFavorite });
}

/** Mengambil satu kegiatan. */
export function getActivity(id) {
  return getDocById(COLLECTIONS.ACTIVITIES, id);
}

/**
 * Realtime listener untuk seluruh kegiatan pada rentang bulan tertentu
 * (dipakai oleh Shared Calendar month view).
 * @param {string} monthKey - format "YYYY-MM"
 * @param {(activities: object[]) => void} callback
 * @returns {() => void} unsubscribe
 */
export function listenActivitiesByMonth(monthKey, callback) {
  return listenCollection(
    COLLECTIONS.ACTIVITIES,
    {
      where: [
        ["date", ">=", `${monthKey}-01`],
        ["date", "<=", `${monthKey}-31`],
        ["isArchived", "==", false],
      ],
      orderBy: ["date", "asc"],
    },
    callback,
  );
}

/** Realtime listener untuk semua kegiatan aktif (tidak diarsip), dipakai List/Table view & pencarian global. */
export function listenAllActiveActivities(callback, options = {}) {
  return listenCollection(
    COLLECTIONS.ACTIVITIES,
    {
      where: [["isArchived", "==", false]],
      orderBy: ["date", options.order || "asc"],
      limit: options.limit,
    },
    callback,
  );
}

/** Realtime listener untuk kegiatan pada satu tanggal spesifik (dipakai Day view & Dashboard "Aktivitas Hari Ini"). */
export function listenActivitiesByDate(dateKey, callback) {
  return listenCollection(
    COLLECTIONS.ACTIVITIES,
    {
      where: [
        ["date", "==", dateKey],
        ["isArchived", "==", false],
      ],
      orderBy: ["startTime", "asc"],
    },
    callback,
  );
}

/** Mengambil kegiatan yang diarsipkan (sekali, untuk halaman Arsip). */
export function getArchivedActivities() {
  return getCollectionOnce(COLLECTIONS.ACTIVITIES, {
    where: [["isArchived", "==", true]],
    orderBy: ["date", "desc"],
  });
}

/**
 * Mengecek apakah kegiatan baru bertabrakan waktu dengan kegiatan lain
 * yang sudah ada pada tanggal yang sama (sesuai requirement "Konflik Jadwal").
 * @param {ActivityInput} newActivity
 * @param {string} [excludeId] - ID kegiatan yang sedang diedit (dikecualikan dari pengecekan)
 * @returns {Promise<object[]>} daftar kegiatan yang konflik
 */
export async function findScheduleConflicts(newActivity, excludeId) {
  const sameDay = await getCollectionOnce(COLLECTIONS.ACTIVITIES, {
    where: [
      ["date", "==", newActivity.date],
      ["isArchived", "==", false],
    ],
  });

  return sameDay.filter((existing) => {
    if (existing.id === excludeId) return false;
    return isTimeOverlap(
      newActivity.startTime,
      newActivity.endTime,
      existing.startTime,
      existing.endTime,
    );
  });
}

/** Menerapkan filter client-side pada array kegiatan (kategori, status, prioritas, PIC, lokasi, staff). */
export function filterActivities(activities, filters) {
  return activities.filter((a) => {
    if (filters.category && a.category !== filters.category) return false;
    if (filters.status && a.status !== filters.status) return false;
    if (filters.priority && a.priority !== filters.priority) return false;
    if (filters.picId && a.picId !== filters.picId) return false;
    if (
      filters.location &&
      !a.location?.toLowerCase().includes(filters.location.toLowerCase())
    )
      return false;
    if (
      filters.staffId &&
      !(a.involvedStaffIds || []).includes(filters.staffId)
    )
      return false;
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      const haystack =
        `${a.name} ${a.location} ${a.description} ${a.picName || ""}`.toLowerCase();
      if (!haystack.includes(kw)) return false;
    }
    return true;
  });
}

/** Mengurutkan array kegiatan berdasarkan kriteria (dipakai List/Table view). */
export function sortActivities(activities, sortBy) {
  const sorted = [...activities];
  const priorityRank = { sangat_penting: 4, tinggi: 3, sedang: 2, rendah: 1 };

  switch (sortBy) {
    case "newest":
      return sorted.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
      );
    case "oldest":
      return sorted.sort(
        (a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0),
      );
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "priority":
      return sorted.sort(
        (a, b) =>
          (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0),
      );
    case "deadline":
      return sorted.sort((a, b) => a.date.localeCompare(b.date));
    case "progress":
      return sorted.sort((a, b) => (b.progress || 0) - (a.progress || 0));
    default:
      return sorted;
  }
}
