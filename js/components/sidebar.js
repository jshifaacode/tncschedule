/**
 * sidebar.js
 * ----------------------------------------------------------------------
 * Merender Sidebar Navigation (desktop) ke dalam elemen #sidebar-root
 * yang ada di setiap halaman utama, lalu memasang interaksi collapse
 * dan highlight menu aktif.
 * ----------------------------------------------------------------------
 */

import { qs } from "../utils/helper.js";
import { highlightActiveNav } from "../utils/router.js";
import { getPref, setPref } from "../utils/storage.js";

const NAV_ITEMS = [
  { href: "dashboard.html", label: "Dashboard", icon: "layout-dashboard" },
  { href: "calendar.html", label: "Kalender", icon: "calendar" },
  { href: "attendance.html", label: "Absensi", icon: "clipboard-check" },
  { href: "staff.html", label: "Data Staff", icon: "users" },
  { href: "notifications.html", label: "Notifikasi", icon: "bell" },
];

const NAV_ITEMS_SECONDARY = [
  { href: "profile.html", label: "Profil Saya", icon: "user" },
  { href: "settings.html", label: "Pengaturan", icon: "settings" },
];

/** Kumpulan path ikon SVG minimalis (stroke-based, konsisten satu gaya). */
const ICONS = {
  "layout-dashboard": '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  "clipboard-check": '<path d="M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1z"/><rect x="5" y="6" width="14" height="16" rx="2"/><path d="M9 13l2 2 4-4"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><circle cx="17" cy="9" r="2.5"/><path d="M22 20c0-2.6-1.9-4.8-4.5-5.6"/>',
  bell: '<path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 004 0"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V21a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.2a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.2a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.2a1.7 1.7 0 00-1.5 1z"/>',
};

function iconSvg(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>`;
}

function navItemHtml(item) {
  return `
    <a href="${item.href}" class="sidebar-nav-item">
      ${iconSvg(item.icon)}
      <span class="sidebar-nav-label">${item.label}</span>
    </a>
  `;
}

/**
 * Merender sidebar ke dalam target selector.
 * @param {string} targetSelector - biasanya "#sidebar-root"
 */
export function renderSidebar(targetSelector = "#sidebar-root") {
  const target = qs(targetSelector);
  if (!target) return;

  target.innerHTML = `
    <aside class="sidebar" id="app-sidebar" aria-label="Navigasi utama">
      <div class="sidebar-brand">
        <img src="assets/logo/tnc-logo.png" alt="Logo TNC" onerror="this.style.display='none'">
        <span class="sidebar-brand-name">TNCschedule</span>
      </div>
      <nav class="sidebar-nav">
        <div class="sidebar-section-title">Menu Utama</div>
        ${NAV_ITEMS.map(navItemHtml).join("")}
        <div class="sidebar-section-title">Akun</div>
        ${NAV_ITEMS_SECONDARY.map(navItemHtml).join("")}
      </nav>
      <button type="button" class="sidebar-toggle" id="sidebar-toggle-btn" aria-label="Ciutkan sidebar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 6l-6 6 6 6"/>
        </svg>
      </button>
    </aside>
  `;

  highlightActiveNav(".sidebar-nav-item");

  const shell = qs(".app-shell");
  const toggleBtn = qs("#sidebar-toggle-btn");
  const collapsed = getPref("sidebarCollapsed", false);
  if (collapsed && shell) shell.setAttribute("data-sidebar", "collapsed");

  toggleBtn?.addEventListener("click", () => {
    if (!shell) return;
    const isCollapsed = shell.getAttribute("data-sidebar") === "collapsed";
    shell.setAttribute("data-sidebar", isCollapsed ? "expanded" : "collapsed");
    setPref("sidebarCollapsed", !isCollapsed);
  });
}
