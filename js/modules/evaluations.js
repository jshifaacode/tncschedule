/**
 * evaluations.js
 * ----------------------------------------------------------------------
 * Evaluasi Harian pada subcollection activities/{id}/evaluations.
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
} from "../firebase/firestore.js";
import { pushNotification } from "./notifications.js";

/**
 * Menambahkan evaluasi harian pada sebuah kegiatan.
 * @param {string} activityId
 * @param {{uid:string,fullName:string,photoURL?:string}} author
 * @param {{title:string, content:string}} data
 */
export async function addEvaluation(activityId, author, data) {
  const path = subcollectionPath(
    COLLECTIONS.ACTIVITIES,
    activityId,
    SUBCOLLECTIONS.EVALUATIONS,
  );
  const id = await createDoc(path, {
    title: data.title,
    content: data.content,
    authorId: author.uid,
    authorName: author.fullName,
    authorPhoto: author.photoURL || "",
  });

  await writeActivityLog({
    userId: author.uid,
    userName: author.fullName,
    action: "evaluation",
    targetType: "activity",
    targetId: activityId,
    description: `menambahkan evaluasi "${data.title}"`,
  });

  try {
    const allStaff = await getCollectionOnce(COLLECTIONS.USERS, {
      where: [["accountStatus", "==", "active"]],
    });
    const recipientIds = allStaff.map((s) => s.uid).filter(Boolean);

    await pushNotification(recipientIds.length ? recipientIds : [author.uid], {
      type: "evaluation",
      title: "Evaluasi baru",
      message: `${author.fullName} menambahkan evaluasi: ${data.title}.`,
      link: "calendar.html",
      icon: "📝",
    });
  } catch (err) {
    console.warn("Gagal push notification evaluation:", err);
  }

  return id;
}

export function updateEvaluation(activityId, evalId, data) {
  const path = subcollectionPath(
    COLLECTIONS.ACTIVITIES,
    activityId,
    SUBCOLLECTIONS.EVALUATIONS,
  );
  return updateDocById(path, evalId, data);
}

export function deleteEvaluation(activityId, evalId) {
  const path = subcollectionPath(
    COLLECTIONS.ACTIVITIES,
    activityId,
    SUBCOLLECTIONS.EVALUATIONS,
  );
  return deleteDocById(path, evalId);
}

/** Realtime listener evaluasi, terbaru di atas (kronologis terbalik). */
export function listenEvaluations(activityId, callback) {
  const path = subcollectionPath(
    COLLECTIONS.ACTIVITIES,
    activityId,
    SUBCOLLECTIONS.EVALUATIONS,
  );
  return listenCollection(path, { orderBy: ["createdAt", "desc"] }, callback);
}
