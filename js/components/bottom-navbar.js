/**
 * bottom-navbar.js
 * ----------------------------------------------------------------------
 * Merender Bottom Navigation (mobile only) + Floating Action Button
 * ke dalam #bottomnav-root. Sidebar TIDAK PERNAH ditampilkan di mobile
 * — navigasi mobile sepenuhnya melalui komponen ini.
 * ----------------------------------------------------------------------
 */

import { qs, el } from "../utils/helper.js";
import { highlightActiveNav } from "../utils/router.js";

const ITEMS = [
  { href: "dashboard.html", label: "Dashboard", icon: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>' },
  { href: "calendar.html", label: "Kalender", icon: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>' },
  { type: "fab" },
  { href: "attendance.html", label: "Absensi", icon: '<path d="M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1z"/><rect x="5" y="6" width="14" height="16" rx="2"/><path d="M9 13l2 2 4-4"/>' },
  { href: "profile.html", label: "Profil", icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>' },
];

function iconSvg(path) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

export function renderBottomNav(targetSelector = "#bottomnav-root") {
  const target = qs(targetSelector);
  if (!target) return;

  const itemsHtml = ITEMS.map((item) => {
    if (item.type === "fab") {
      return `
        <button type="button" class="bottom-nav-item fab" id="fab-trigger" aria-label="Tambah kegiatan">
          <span class="bottom-nav-fab-circle">
            ${iconSvg('<path d="M12 5v14M5 12h14"/>')}
          </span>
        </button>
      `;
    }
    return `
      <a href="${item.href}" class="bottom-nav-item">
        ${iconSvg(item.icon)}
        <span>${item.label}</span>
      </a>
    `;
  }).join("");

  target.innerHTML = `
    <nav class="bottom-nav" aria-label="Navigasi mobile">
      ${itemsHtml}
    </nav>
    <div class="drawer-backdrop" id="fab-backdrop"></div>
  `;

  highlightActiveNav(".bottom-nav-item");

  const fabTrigger = qs("#fab-trigger");
  const backdrop = qs("#fab-backdrop");
  let fabMenu = null;

  fabTrigger?.addEventListener("click", () => {
    if (fabMenu) {
      closeFabMenu();
      return;
    }
    fabMenu = el("div", { class: "fab-menu", id: "fab-menu" }, [
      fabMenuItem("📅", "Tambah Kegiatan", "calendar.html?action=new"),
      fabMenuItem("📝", "Tambah Evaluasi", "calendar.html?action=evaluate"),
      fabMenuItem("📷", "Tambah Dokumentasi", "calendar.html?action=upload"),
    ]);
    document.body.appendChild(fabMenu);
    backdrop.classList.add("open");
  });

  backdrop?.addEventListener("click", closeFabMenu);

  function closeFabMenu() {
    fabMenu?.remove();
    fabMenu = null;
    backdrop.classList.remove("open");
  }

  function fabMenuItem(icon, label, href) {
    const item = el("a", { class: "fab-menu-item", href }, [`${icon} ${label}`]);
    return item;
  }
}
