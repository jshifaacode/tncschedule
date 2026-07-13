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

export function editComment(activityId, commentId, newText) {
  const path = subcollectionPath(
    COLLECTIONS.ACTIVITIES,
    activityId,
    SUBCOLLECTIONS.COMMENTS,
  );
  return updateDocById(path, commentId, { text: newText, edited: true });
}

export function deleteComment(activityId, commentId) {
  const path = subcollectionPath(
    COLLECTIONS.ACTIVITIES,
    activityId,
    SUBCOLLECTIONS.COMMENTS,
  );
  return deleteDocById(path, commentId);
}

export function listenComments(activityId, callback) {
  const path = subcollectionPath(
    COLLECTIONS.ACTIVITIES,
    activityId,
    SUBCOLLECTIONS.COMMENTS,
  );
  return listenCollection(path, { orderBy: ["createdAt", "asc"] }, callback);
}

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
