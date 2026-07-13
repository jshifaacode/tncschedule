/**
 * storage.js
 * ----------------------------------------------------------------------
 * Lapisan akses Firebase Storage: upload foto profil, dokumentasi
 * kegiatan, lampiran (PDF/DOCX/XLSX/dll), dan logo.
 * ----------------------------------------------------------------------
 */

import { storage } from "./firebase-config.js";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

/** Tipe file yang diizinkan untuk lampiran kegiatan. */
export const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Batas ukuran file (dalam bytes). Sesuaikan dengan kuota Firebase Storage. */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

/**
 * Validasi file sebelum diupload (client-side, sebagai lapisan pertama;
 * validasi kedua ada di Storage Security Rules di server).
 * @param {File} file
 * @param {{allowedTypes?: string[], maxSize?: number}} options
 * @returns {{valid: boolean, message?: string}}
 */
export function validateFile(file, options = {}) {
  const allowedTypes = options.allowedTypes || ALLOWED_ATTACHMENT_TYPES;
  const maxSize = options.maxSize || MAX_FILE_SIZE_BYTES;

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, message: `Tipe file "${file.type || "tidak dikenal"}" tidak diizinkan.` };
  }
  if (file.size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return { valid: false, message: `Ukuran file melebihi batas maksimal ${maxMb}MB.` };
  }
  return { valid: true };
}

/**
 * Mengunggah file dengan progress callback.
 * @param {string} path - path tujuan di Storage, misal: `activities/{id}/attachments/{filename}`
 * @param {File} file
 * @param {(percent: number) => void} [onProgress]
 * @returns {Promise<{url: string, fullPath: string, size: number, name: string}>}
 */
export function uploadFile(path, file, onProgress) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    task.on(
      "state_changed",
      (snapshot) => {
        if (onProgress) {
          const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(Math.round(percent));
        }
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({
          url,
          fullPath: task.snapshot.ref.fullPath,
          size: file.size,
          name: file.name,
        });
      }
    );
  });
}

/** Menghapus file dari Storage berdasarkan path lengkapnya. */
export function deleteFile(fullPath) {
  return deleteObject(ref(storage, fullPath));
}

/** Membuat path Storage yang aman (menghindari karakter bermasalah pada nama file). */
export function buildStoragePath(...segments) {
  const sanitized = segments.map((s) =>
    String(s).replace(/[^a-zA-Z0-9._-]/g, "_")
  );
  return sanitized.join("/");
}
