/**
 * router.js
 * ----------------------------------------------------------------------
 * TNCschedule adalah Multi-Page App (setiap fitur = file .html terpisah)
 * sesuai requirement "dijalankan langsung via Live Server tanpa build tool".
 * Modul ini HANYA membantu:
 *  1) menandai item navigasi aktif berdasarkan nama halaman saat ini,
 *  2) menyimpan/membaca query state (misalnya filter kalender) di URL.
 * Ini BUKAN client-side router seperti React Router.
 * ----------------------------------------------------------------------
 */

/** Mengambil nama file halaman saat ini, misal "dashboard.html". */
export function getCurrentPage() {
  const path = window.location.pathname.split("/").pop();
  return path || "index.html";
}

/**
 * Menandai nav-item yang cocok dengan halaman aktif menggunakan aria-current="page".
 * @param {string} navSelector - selector untuk semua item nav, misal ".sidebar-nav-item"
 */
export function highlightActiveNav(navSelector) {
  const current = getCurrentPage();
  document.querySelectorAll(navSelector).forEach((item) => {
    const href = item.getAttribute("href");
    if (href === current) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

/** Navigasi ke halaman lain sambil membawa query params. */
export function navigateTo(page, params = {}) {
  const url = new URL(page, window.location.href);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  window.location.href = url.toString();
}
