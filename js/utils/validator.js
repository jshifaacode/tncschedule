/**
 * validator.js
 * ----------------------------------------------------------------------
 * Validasi form yang dapat dipakai ulang di seluruh halaman.
 * Mengembalikan { valid, message } agar mudah ditampilkan ke UI.
 * ----------------------------------------------------------------------
 */

export function required(value, fieldLabel = "Field ini") {
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0);
  return isEmpty
    ? { valid: false, message: `${fieldLabel} wajib diisi.` }
    : { valid: true };
}

export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim())
    ? { valid: true }
    : { valid: false, message: "Format email tidak valid." };
}

export function minLength(value, min, fieldLabel = "Field ini") {
  return String(value || "").length >= min
    ? { valid: true }
    : { valid: false, message: `${fieldLabel} minimal ${min} karakter.` };
}

export function passwordsMatch(password, confirmPassword) {
  return password === confirmPassword
    ? { valid: true }
    : { valid: false, message: "Konfirmasi kata sandi tidak cocok." };
}

/** Validasi jam selesai tidak boleh lebih awal dari jam mulai (format "HH:MM"). */
export function isEndTimeAfterStart(startTime, endTime) {
  if (!startTime || !endTime) return { valid: true };
  return endTime > startTime
    ? { valid: true }
    : { valid: false, message: "Jam selesai tidak boleh lebih awal dari jam mulai." };
}

/** Validasi tanggal tidak boleh di masa lalu (dibandingkan hari ini, tanpa jam). */
export function isNotPastDate(dateStr) {
  if (!dateStr) return { valid: true };
  const input = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  input.setHours(0, 0, 0, 0);
  return input >= today
    ? { valid: true }
    : { valid: false, message: "Tanggal tidak boleh di masa lalu." };
}

/**
 * Menjalankan sekumpulan validator terhadap sebuah nilai, mengembalikan
 * hasil validasi pertama yang gagal, atau valid jika semua lolos.
 * @param {Array<() => {valid: boolean, message?: string}>} validatorFns
 */
export function runValidators(validatorFns) {
  for (const fn of validatorFns) {
    const result = fn();
    if (!result.valid) return result;
  }
  return { valid: true };
}

/**
 * Menampilkan error pada elemen field (menambahkan aria-invalid dan pesan).
 * @param {HTMLElement} inputEl
 * @param {HTMLElement} errorEl
 * @param {string} message
 */
export function showFieldError(inputEl, errorEl, message) {
  if (inputEl) inputEl.setAttribute("aria-invalid", "true");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }
}

/** Membersihkan status error pada field. */
export function clearFieldError(inputEl, errorEl) {
  if (inputEl) inputEl.removeAttribute("aria-invalid");
  if (errorEl) {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }
}
