

import {
  COLLECTIONS,
  createDoc,
  updateDocById,
  deleteDocById,
  listenCollection,
} from "../firebase/firestore.js";


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


export function listenMyNotifications(uid, callback) {

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


export async function requestBrowserNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}


export function showBrowserNotification(title, options = {}) {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;
  new Notification(title, options);
}
