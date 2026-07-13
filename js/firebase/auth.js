/**
 * auth.js
 * ----------------------------------------------------------------------
 * Seluruh logika autentikasi Firebase: login, register, Google Sign-In,
 * logout, forgot password, dan observer sesi.
 * Modul ini TIDAK menyentuh DOM — hanya logika Firebase murni,
 * sehingga dapat digunakan kembali oleh login.js, register.js, dll.
 * ----------------------------------------------------------------------
 */

import { auth, db, applyAuthPersistence } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const googleProvider = new GoogleAuthProvider();

/**
 * Memetakan Firebase Auth error code ke pesan berbahasa Indonesia
 * yang ramah pengguna.
 * @param {string} code
 * @returns {string}
 */
export function mapAuthError(code) {
  const map = {
    "auth/invalid-email": "Format email tidak valid.",
    "auth/user-disabled": "Akun ini telah dinonaktifkan.",
    "auth/user-not-found": "Email atau kata sandi salah.",
    "auth/wrong-password": "Email atau kata sandi salah.",
    "auth/invalid-credential": "Email atau kata sandi salah.",
    "auth/email-already-in-use": "Email ini sudah terdaftar.",
    "auth/weak-password": "Kata sandi minimal 6 karakter.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.",
    "auth/popup-closed-by-user": "Login Google dibatalkan.",
    "auth/network-request-failed": "Koneksi internet terputus. Periksa jaringan Anda.",
  };
  return map[code] || "Terjadi kesalahan. Silakan coba lagi.";
}

/**
 * Membuat dokumen profil staff di Firestore setelah registrasi berhasil.
 * Dokumen ini menjadi sumber data untuk menu "Data Staff".
 */
async function ensureUserProfile(user, extra = {}) {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) return;

  await setDoc(userRef, {
    uid: user.uid,
    fullName: extra.fullName || user.displayName || "Staff TNC",
    email: user.email,
    phone: extra.phone || "",
    jobdesk: extra.jobdesk || "",
    division: extra.division || "",
    photoURL: user.photoURL || "",
    accountStatus: "active",
    joinedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  });
}

/**
 * Registrasi akun baru dengan email & password.
 * @param {{fullName:string,email:string,password:string,jobdesk?:string,phone?:string}} data
 */
export async function registerWithEmail({ fullName, email, password, jobdesk, phone }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: fullName });
  await ensureUserProfile(cred.user, { fullName, jobdesk, phone });
  return cred.user;
}

/**
 * Login dengan email & password.
 * @param {string} email
 * @param {string} password
 * @param {boolean} rememberMe
 */
export async function loginWithEmail(email, password, rememberMe = true) {
  await applyAuthPersistence(rememberMe);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await touchLastLogin(cred.user.uid);
  return cred.user;
}

/**
 * Login menggunakan akun Google (popup).
 * @param {boolean} rememberMe
 */
export async function loginWithGoogle(rememberMe = true) {
  await applyAuthPersistence(rememberMe);
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(cred.user);
  await touchLastLogin(cred.user.uid);
  return cred.user;
}

async function touchLastLogin(uid) {
  try {
    await setDoc(
      doc(db, "users", uid),
      { lastLoginAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    // Non-fatal: jangan blokir login hanya karena gagal update metadata.
    console.warn("Gagal memperbarui lastLoginAt:", err);
  }
}

/** Logout pengguna saat ini. */
export function logout() {
  return signOut(auth);
}

/** Mengirim email reset password. */
export function requestPasswordReset(email) {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Observer status login. Memanggil callback setiap kali status berubah.
 * @param {(user: import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js").User | null) => void} callback
 */
export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Guard halaman: redirect ke login.html bila belum login.
 * Dipanggil di awal setiap halaman yang membutuhkan autentikasi.
 * @returns {Promise<import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js").User>}
 */
export function requireAuth() {
  return new Promise((resolve) => {
    const unsubscribe = watchAuthState((user) => {
      unsubscribe();
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      resolve(user);
    });
  });
}

/**
 * Guard halaman auth (login/register): redirect ke dashboard bila sudah login.
 */
export function redirectIfAuthenticated() {
  const unsubscribe = watchAuthState((user) => {
    unsubscribe();
    if (user) {
      window.location.href = "dashboard.html";
    }
  });
}
