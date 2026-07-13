/**
 * firestore.js
 * ----------------------------------------------------------------------
 * Lapisan akses data (data access layer) untuk Cloud Firestore.
 * Modul lain (modules/calendar.js, modules/activities.js, dll.) TIDAK
 * boleh memanggil Firestore SDK langsung — semua akses data melewati
 * fungsi-fungsi di sini agar query, penamaan koleksi, dan strategi
 * caching konsisten di seluruh aplikasi (Separation of Concerns).
 * ----------------------------------------------------------------------
 */

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

/** Nama koleksi terpusat agar tidak ada "magic string" tersebar di codebase. */
export const COLLECTIONS = {
  USERS: "users",
  ACTIVITIES: "activities",
  ATTENDANCE: "attendance",
  NOTIFICATIONS: "notifications",
  ACTIVITY_LOGS: "activityLogs",
  BOOKMARKS: "bookmarks",
  SETTINGS: "settings",
};

/** Subcollections di bawah activities/{id} */
export const SUBCOLLECTIONS = {
  COMMENTS: "comments",
  EVALUATIONS: "evaluations",
  ATTACHMENTS: "attachments",
};

export { serverTimestamp, Timestamp };

/**
 * Membuat dokumen baru pada koleksi tertentu.
 * @param {string} collectionPath
 * @param {object} data
 * @returns {Promise<string>} ID dokumen baru
 */
export async function createDoc(collectionPath, data) {
  const ref = await addDoc(collection(db, collectionPath), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Memperbarui dokumen. Otomatis menambahkan updatedAt.
 * @param {string} collectionPath
 * @param {string} id
 * @param {object} data
 */
export function updateDocById(collectionPath, id, data) {
  return updateDoc(doc(db, collectionPath, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Menghapus dokumen berdasarkan ID. */
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

/**
 * Mendengarkan satu dokumen secara realtime (dipakai di halaman detail kegiatan).
 * @param {string} collectionPath
 * @param {string} id
 * @param {(data: object|null) => void} callback
 * @returns {() => void} unsubscribe
 */
export function listenDoc(collectionPath, id, callback) {
  return onSnapshot(doc(db, collectionPath, id), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

/**
 * Query sekali jalan (non-realtime), berguna untuk export laporan
 * atau pencarian yang tidak perlu live update.
 */
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

/** Helper path untuk subcollection, misal: activities/{id}/comments */
export function subcollectionPath(parentCollection, parentId, sub) {
  return `${parentCollection}/${parentId}/${sub}`;
}

/**
 * Mencatat entri Activity Log. Dipanggil setiap kali ada create/update/delete
 * pada data penting, memenuhi requirement Audit Trail.
 * @param {{userId:string,userName:string,action:string,targetType:string,targetId:string,targetName?:string,before?:object,after?:object}} entry
 */
export function writeActivityLog(entry) {
  return createDoc(COLLECTIONS.ACTIVITY_LOGS, entry);
}
