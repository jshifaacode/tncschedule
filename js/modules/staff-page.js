/**
 * staff-page.js (page-level module, loaded only by staff.html)
 * ----------------------------------------------------------------------
 * Direktori seluruh staff internal TNC dengan live search dan table/card view.
 * ----------------------------------------------------------------------
 */

import { initApp } from "../app.js";
import { qs, qsa, escapeHtml } from "../utils/helper.js";
import { formatShortDate, getInitials } from "../utils/formatter.js";
import { listenAllStaff, searchStaff } from "./staff.js";
import { bindLiveSearch } from "./search.js";
import { renderTable } from "../components/table.js";
import { skeletonList } from "../components/skeleton.js";

let allStaff = [];
let currentViewMode = "table";

function render() {
  const keyword = qs("[data-staff-search]")?.value || "";
  const filtered = searchStaff(allStaff, keyword);

  if (currentViewMode === "table") {
    renderStaffTable(filtered);
  } else {
    renderStaffCards(filtered);
  }
}

function renderStaffTable(list) {
  const target = qs("[data-staff-content]");
  target.innerHTML = renderTable(
    [
      {
        key: "fullName",
        label: "Nama",
        render: (s) => `
          <div class="flex items-center gap-2">
            ${s.photoURL ? `<img src="${s.photoURL}" class="avatar avatar-xs" alt="">` : `<div class="avatar avatar-xs avatar-fallback" style="font-size:9px;">${getInitials(s.fullName)}</div>`}
            ${escapeHtml(s.fullName)}
          </div>`,
      },
      { key: "jobdesk", label: "Jobdesk" },
      { key: "email", label: "Email" },
      { key: "phone", label: "No. HP" },
      { key: "joinedAt", label: "Bergabung", render: (s) => (s.joinedAt ? formatShortDate(s.joinedAt) : "-") },
    ],
    list,
    { emptyMessage: "Tidak ada staff yang cocok dengan pencarian." }
  );

  qsa("tr[data-row-id]", target).forEach((row) => {
    row.style.cursor = "pointer";
    row.addEventListener("click", () => {
      window.location.href = `staff-detail.html?id=${row.dataset.rowId}`;
    });
  });
}

function renderStaffCards(list) {
  const target = qs("[data-staff-content]");
  if (!list.length) {
    target.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-title">Tidak ada staff yang cocok.</div></div>`;
    return;
  }
  target.innerHTML = `<div class="page-grid">${list
    .map(
      (s) => `
      <div class="col-span-4">
        <div class="card card-compact" role="button" data-staff-id="${s.id}" style="cursor:pointer;text-align:center;">
          ${s.photoURL ? `<img src="${s.photoURL}" class="avatar avatar-lg" style="margin:0 auto 12px;" alt="">` : `<div class="avatar avatar-lg avatar-fallback" style="margin:0 auto 12px;font-size:20px;">${getInitials(s.fullName)}</div>`}
          <h4>${escapeHtml(s.fullName)}</h4>
          <p class="text-sm text-muted">${escapeHtml(s.jobdesk || "-")}</p>
        </div>
      </div>`
    )
    .join("")}</div>`;

  qsa("[data-staff-id]", target).forEach((card) => {
    card.addEventListener("click", () => {
      window.location.href = `staff-detail.html?id=${card.dataset.staffId}`;
    });
  });
}

function bindViewSwitch() {
  qsa("[data-staff-view-btn]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentViewMode = btn.dataset.staffViewBtn;
      qsa("[data-staff-view-btn]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      render();
    });
  });
}

async function bootstrap() {
  await initApp();
  bindViewSwitch();

  const target = qs("[data-staff-content]");
  if (target) target.innerHTML = skeletonList(6);

  listenAllStaff((docs) => {
    allStaff = docs;
    render();
  });

  const searchInput = qs("[data-staff-search]");
  if (searchInput) bindLiveSearch(searchInput, render);
}

bootstrap();
