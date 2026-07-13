/**
 * comments.js
 * ----------------------------------------------------------------------
 * Komentar & diskusi realtime pada subcollection activities/{id}/comments.
 * Mendukung reply (thread sederhana melalui field parentId) dan edit.
 * ----------------------------------------------------------------------
 */

import {
  COLLECTIONS,
  SUBCOLLECTIONS,
  subcollectionPath,
  createDoc,
  updateDocById,
  deleteDocById,
  listenCollection,
  writeActivityLog,
  getCollectionOnce,
  COLLECTIONS as DB_COLLECTIONS,
} from "../firebase/firestore.js";
import { pushNotification } from "./notifications.js";

/**
 * Mengirim komentar baru (atau balasan jika parentId diberikan).
 * @param {string} activityId
 * @param {{uid:string,fullName:string,jobdesk:string,photoURL?:string}} author
 * @param {string} text
 * @param {string|null} parentId
 */
export async function postComment(activityId, author, text, parentId = null) {
  const path = subcollectionPath(
    COLLECTIONS.ACTIVITIES,
    activityId,
    SUBCOLLECTIONS.COMMENTS,
  );
  const id = await createDoc(path, {
    authorId: author.uid,
    authorName: author.fullName,
    authorJobdesk: author.jobdesk || "",
    authorPhoto: author.photoURL || "",
    text,
    parentId,
    edited: false,
  });

  await writeActivityLog({
    userId: author.uid,
    userName: author.fullName,
    action: "comment",
    targetType: "activity",
    targetId: activityId,
    description: "memberikan komentar",
  });

  // Notifikasi ke semua staff.
  try {
    const allStaff = await getCollectionOnce(DB_COLLECTIONS.USERS, {
      where: [["accountStatus", "==", "active"]],
    });
    const recipientIds = allStaff.map((s) => s.uid).filter(Boolean);

    await pushNotification(recipientIds.length ? recipientIds : [author.uid], {
      type: "comment",
      title: "Ada komentar baru",
      message: `${author.fullName} menambahkan komentar pada activity.`,
      link: "calendar.html",
      icon: "💬",
    });
  } catch (err) {
    console.warn("Gagal push notification comment:", err);
  }

  return id;
}

/** Mengedit komentar, menandai edited=true agar UI menampilkan label "Diedit". */
export function editComment(activityId, commentId, newText) {
  const path = subcollectionPath(
    COLLECTIONS.ACTIVITIES,
    activityId,
    SUBCOLLECTIONS.COMMENTS,
  );
  return updateDocById(path, commentId, { text: newText, edited: true });
}

/** Menghapus komentar. */
export function deleteComment(activityId, commentId) {
  const path = subcollectionPath(
    COLLECTIONS.ACTIVITIES,
    activityId,
    SUBCOLLECTIONS.COMMENTS,
  );
  return deleteDocById(path, commentId);
}

/** Realtime listener seluruh komentar pada sebuah kegiatan, urut dari yang terlama. */
export function listenComments(activityId, callback) {
  const path = subcollectionPath(
    COLLECTIONS.ACTIVITIES,
    activityId,
    SUBCOLLECTIONS.COMMENTS,
  );
  return listenCollection(path, { orderBy: ["createdAt", "asc"] }, callback);
}

/** Menyusun komentar datar menjadi struktur thread (parent -> replies[]). */
export function buildCommentThread(comments) {
  const roots = comments.filter((c) => !c.parentId);
  const repliesByParent = comments.reduce((map, c) => {
    if (c.parentId) {
      if (!map[c.parentId]) map[c.parentId] = [];
      map[c.parentId].push(c);
    }
    return map;
  }, {});
  return roots.map((root) => ({
    ...root,
    replies: repliesByParent[root.id] || [],
  }));
}
