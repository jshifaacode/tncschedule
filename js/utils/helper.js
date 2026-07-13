/**
 * helper.js
 * ----------------------------------------------------------------------
 * Fungsi bantu generik: query DOM singkat, debounce, escape HTML, dsb.
 * ----------------------------------------------------------------------
 */

/** Shorthand querySelector. */
export const qs = (selector, parent = document) => parent.querySelector(selector);

/** Shorthand querySelectorAll -> array. */
export const qsa = (selector, parent = document) =>
  Array.from(parent.querySelectorAll(selector));

/** Membuat elemen DOM dengan atribut dan children secara deklaratif. */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null) {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

/** Debounce: menunda eksekusi hingga tidak ada panggilan baru selama `delay` ms. Dipakai untuk Live Search. */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Escape karakter HTML untuk mencegah XSS saat merender teks dari input pengguna. */
export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

/** Mengecek apakah dua rentang waktu (tanggal + jam) saling tumpang tindih — dipakai untuk deteksi konflik jadwal. */
export function isTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/** Mengambil parameter dari query string URL, misal ?id=xxx */
export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** Menunggu selama ms milidetik (dipakai untuk animasi berurutan sederhana). */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate warna avatar konsisten berdasarkan string nama (hash sederhana). */
export function stringToColor(str) {
  const palette = ["#1F7A4D", "#1D5FBF", "#B4790B", "#6B4FA0", "#2E8E9E", "#C0392B"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

/** Trap focus sederhana di dalam elemen modal untuk aksesibilitas keyboard. */
export function trapFocus(containerEl) {
  const focusable = qsa(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    containerEl
  );
  if (!focusable.length) return () => {};
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function handleKeydown(e) {
    if (e.key !== "Tab") return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  containerEl.addEventListener("keydown", handleKeydown);
  first.focus();
  return () => containerEl.removeEventListener("keydown", handleKeydown);
}
