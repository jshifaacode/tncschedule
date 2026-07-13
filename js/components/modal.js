/**
 * modal.js
 * ----------------------------------------------------------------------
 * Modal generik yang dapat diisi konten HTML apa pun (form tambah
 * kegiatan, detail kegiatan, dsb). Menangani backdrop, ESC to close,
 * dan focus trap untuk aksesibilitas.
 * ----------------------------------------------------------------------
 */

import { el, trapFocus } from "../utils/helper.js";

let releaseFocusTrap = null;
let lastFocusedEl = null;

/**
 * Membuka modal dengan konten HTML yang diberikan.
 * @param {{title:string, bodyHtml:string, size?:'md'|'lg', footerHtml?:string, onMount?:(modalEl:HTMLElement)=>void, onClose?:()=>void}} options
 * @returns {{close: () => void, el: HTMLElement}}
 */
export function openModal({
  title,
  bodyHtml,
  size = "md",
  footerHtml = "",
  onMount,
  onClose,
}) {
  lastFocusedEl = document.activeElement;

  const backdrop = el("div", {
    class: "modal-backdrop",
    "data-modal-backdrop": "true",
  });
  const modal = el("div", {
    class: `modal ${size === "lg" ? "modal-lg" : ""}`,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title,
  });

  modal.innerHTML = `
    <div class="modal-header">
      <h3 class="card-title">${title}</h3>
      <button type="button" class="btn btn-icon btn-ghost" data-modal-close aria-label="Tutup">✕</button>
    </div>
    <div class="modal-body">${bodyHtml}</div>
    ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  document.body.style.overflow = "hidden";

  function close() {
    releaseFocusTrap?.();
    backdrop.remove();
    document.body.style.overflow = "";
    if (lastFocusedEl instanceof HTMLElement) lastFocusedEl.focus();
    onClose?.();
  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  modal.querySelector("[data-modal-close]").addEventListener("click", close);

  function handleEsc(e) {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", handleEsc);
    }
  }
  document.addEventListener("keydown", handleEsc);

  releaseFocusTrap = trapFocus(modal);
  onMount?.(modal);

  return { close, el: modal };
}

/**
 * Dialog konfirmasi sederhana (ya/batal), dipakai sebelum aksi destruktif.
 * @param {{icon?:string, title:string, message:string, confirmLabel?:string, danger?:boolean}} options
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
  icon = "⚠️",
  title,
  message,
  confirmLabel = "Ya, Lanjutkan",
  danger = true,
}) {
  return new Promise((resolve) => {
    const { close } = openModal({
      title: "",
      size: "md",
      bodyHtml: `
        <div class="dialog">
          <div class="dialog-icon">${icon}</div>
          <h3 style="margin-bottom: 8px;">${title}</h3>
          <p class="text-muted">${message}</p>
        </div>
      `,
      footerHtml: `
        <button type="button" class="btn" data-dialog-cancel>Batal</button>
        <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"}" data-dialog-confirm>${confirmLabel}</button>
      `,
      onMount: (modalEl) => {
        modalEl.querySelector(".modal-header")?.remove();

        const cancelBtn = modalEl.querySelector("[data-dialog-cancel]");
        const confirmBtn = modalEl.querySelector("[data-dialog-confirm]");

        // Debug ringan supaya kita tahu tombolnya ketemu atau tidak.
        // (Kalau confirm tidak pernah resolve, kemungkinan tombol tidak terpasang / tertutup overlay.)
        if (!cancelBtn || !confirmBtn) {
          console.error("confirmDialog: tombol konfirmasi tidak ditemukan", {
            cancelBtn: !!cancelBtn,
            confirmBtn: !!confirmBtn,
          });
          close();
          resolve(false);
          return;
        }

        cancelBtn.addEventListener(
          "click",
          () => {
            resolve(false);
            close();
          },
          { once: true },
        );

        confirmBtn.addEventListener(
          "click",
          () => {
            resolve(true);
            close();
          },
          { once: true },
        );
      },
      onClose: () => resolve(false),
    });
  });
}
