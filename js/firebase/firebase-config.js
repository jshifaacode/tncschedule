import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

/** @type {import("https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js").FirebaseOptions} */
const firebaseConfig = {
  apiKey: "AIzaSyDDGNgFgW_Q_8EeDAp3G0BKNRRr9f6Offk",
  authDomain: "tncschedule.firebaseapp.com",
  databaseURL: "https://tncschedule-default-rtdb.firebaseio.com",
  projectId: "tncschedule",
  storageBucket: "tncschedule.firebasestorage.app",
  messagingSenderId: "916495404005",
  appId: "1:916495404005:web:edbd87ea68b53a6d08fd0c",
  measurementId: "G-N70CS50B3M"
};


export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

/**
 * Cloud Firestore dengan Offline Persistence aktif (multi-tab aware).
 * Ini memenuhi requirement "Offline Mode" dan "Multi Device Sync"
 * pada spesifikasi: data yang pernah dibuka tetap terbaca saat offline,
 * dan otomatis sinkron kembali saat koneksi pulih.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const storage = getStorage(app);

/**
 * Menentukan persistence sesi berdasarkan pilihan "Ingat Saya" di form login.
 * @param {boolean} rememberMe
 */
export async function applyAuthPersistence(rememberMe) {
  await setPersistence(
    auth,
    rememberMe ? browserLocalPersistence : browserSessionPersistence
  );
}
