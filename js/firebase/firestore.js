import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as fsLimit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export const COLLECTIONS = {
  USERS: "users",
  ACTIVITIES: "activities",
  ATTENDANCE: "attendance",
  NOTIFICATIONS: "notifications",
  ACTIVITY_LOGS: "activityLogs",
  BOOKMARKS: "bookmarks",
  SETTINGS: "settings",
};

export const SUBCOLLECTIONS = {
  COMMENTS: "comments",
  EVALUATIONS: "evaluations",
  ATTACHMENTS: "attachments",
};

export { serverTimestamp, Timestamp };



export async function createDoc(collectionPath, data) {
  const ref = await addDoc(collection(db, collectionPath), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function updateDocById(collectionPath, id, data) {
  return updateDoc(doc(db, collectionPath, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export function deleteDocById(collectionPath, id) {
  return deleteDoc(doc(db, collectionPath, id));
}

/** Mengambil satu dokumen sekali (bukan realtime). */
export async function getDocById(collectionPath, id) {
  const snap = await getDoc(doc(db, collectionPath, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Mendengarkan perubahan pada sebuah koleksi secara realtime.
 * Inilah inti dari "Shared Calendar" dan seluruh fitur realtime lainnya:
 * setiap perubahan data di Firestore (oleh siapa pun) langsung memicu
 * callback ini di semua klien yang sedang membuka halaman terkait.
 *
 * @param {string} collectionPath
 * @param {{where?: Array<[string,string,any]>, orderBy?: [string,('asc'|'desc')], limit?: number}} options
 * @param {(docs: Array<object>) => void} callback
 * @returns {() => void} fungsi unsubscribe — WAJIB dipanggil saat halaman ditutup/diganti
 */
export function listenCollection(collectionPath, options, callback) {
  let q = collection(db, collectionPath);
  const constraints = [];

  if (options?.where) {
    for (const [field, op, value] of options.where) {
      constraints.push(where(field, op, value));
    }
  }
  if (options?.orderBy) {
    constraints.push(orderBy(options.orderBy[0], options.orderBy[1] || "asc"));
  }
  if (options?.limit) {
    constraints.push(fsLimit(options.limit));
  }
  if (constraints.length) {
    q = query(q, ...constraints);
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(docs);
    },
    (error) => {
      console.error(`Realtime listener error on ${collectionPath}:`, error);
      callback([], error);
    },
  );
}


export function listenDoc(collectionPath, id, callback) {
  return onSnapshot(doc(db, collectionPath, id), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}


export async function getCollectionOnce(collectionPath, options) {
  let q = collection(db, collectionPath);
  const constraints = [];
  if (options?.where) {
    for (const [field, op, value] of options.where) {
      constraints.push(where(field, op, value));
    }
  }
  if (options?.orderBy) {
    constraints.push(orderBy(options.orderBy[0], options.orderBy[1] || "asc"));
  }
  if (options?.limit) {
    constraints.push(fsLimit(options.limit));
  }
  if (constraints.length) {
    q = query(q, ...constraints);
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}


export function subcollectionPath(parentCollection, parentId, sub) {
  return `${parentCollection}/${parentId}/${sub}`;
}


export function writeActivityLog(entry) {
  return createDoc(COLLECTIONS.ACTIVITY_LOGS, entry);
}
