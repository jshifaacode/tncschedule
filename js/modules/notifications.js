/**
 * notifications.js
 * ----------------------------------------------------------------------
 * Notification Center realtime. Notifikasi dibuat oleh berbagai modul
 * (activities.js, comments.js, attendance.js) melalui pushNotification()
 * setiap kali ada peristiwa relevan, lalu ditampilkan realtime di sini.
 * ----------------------------------------------------------------------
 */

import {
  COLLECTIONS,
  createDoc,
  updateDocById,
  deleteDocById,
  listenCollection,
} from "../firebase/firestore.js";

/**
 * Mengirim notifikasi ke satu atau beberapa staff.
 * @param {string[]} recipientIds
 * @param {{type:string, title:string, message:string, link?:string, icon?:string}} data
 */
export async function pushNotification(recipientIds, data) {
  const jobs = recipientIds.map((uid) =>
    createDoc(COLLECTIONS.NOTIFICATIONS, {
      recipientId: uid,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link || "",
      icon: data.icon || "🔔",
      isRead: false,
    }),
  );
  await Promise.all(jobs);
}

/** Realtime listener notifikasi milik user yang sedang login, terbaru di atas. */
export function listenMyNotifications(uid, callback) {
  // Hindari orderBy(createdAt) karena bisa melempar error "requires an index"
  // sehingga listener kembali kosong setelah 1 detik.
  // Tanpa orderBy, query tetap realtime dan tidak tergantung composite index.
  return listenCollection(
    COLLECTIONS.NOTIFICATIONS,
    {
      where: [["recipientId", "==", uid]],
      limit: 100,
    },
    callback,
  );
}

export function markAsRead(notifId) {
  return updateDocById(COLLECTIONS.NOTIFICATIONS, notifId, { isRead: true });
}

export function deleteNotification(notifId) {
  return deleteDocById(COLLECTIONS.NOTIFICATIONS, notifId);
}

/** Meminta izin browser notification (Notification API), dipanggil dari halaman Pengaturan. */
export async function requestBrowserNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

/** Menampilkan browser notification bila izin sudah diberikan. */
export function showBrowserNotification(title, options = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;
  new Notification(title, options);
}
