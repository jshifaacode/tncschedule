/**
 * settings.js
 * ----------------------------------------------------------------------
 * Logika halaman Pengaturan: ubah password, ubah email, preferensi
 * notifikasi (disimpan di koleksi `settings`, satu dokumen per user).
 * ----------------------------------------------------------------------
 */

import { auth } from "../firebase/firebase-config.js";
import {
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { db } from "../firebase/firebase-config.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { COLLECTIONS } from "../firebase/firestore.js";

/** Re-autentikasi diperlukan Firebase sebelum operasi sensitif (ganti password/email). */
export async function reauthenticate(currentPassword) {
  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  return reauthenticateWithCredential(user, credential);
}

export async function changePassword(currentPassword, newPassword) {
  await reauthenticate(currentPassword);
  return updatePassword(auth.currentUser, newPassword);
}

export async function changeEmail(currentPassword, newEmail) {
  await reauthenticate(currentPassword);
  return updateEmail(auth.currentUser, newEmail);
}

/** Menyimpan preferensi notifikasi & bahasa ke koleksi settings/{uid}. */
export function saveUserSettings(uid, settings) {
  return setDoc(doc(db, COLLECTIONS.SETTINGS, uid), settings, { merge: true });
}

/** Mengambil preferensi tersimpan. */
export async function getUserSettings(uid) {
  const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, uid));
  return snap.exists() ? snap.data() : null;
}
