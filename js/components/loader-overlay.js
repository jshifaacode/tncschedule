import { el } from "../utils/helper.js";

let loaderEl = null;
let hideTimer = null;

export function showLoader({
  text = "Memuat…",
  subtext = "Mohon tunggu sebentar",
} = {}) {
  if (loaderEl) return;

  loaderEl = el("div", {
    class: "page-loader-overlay",
    "data-page-loader": "true",
  });
  loaderEl.innerHTML = `
    <div class="page-loader-card" role="status" aria-live="polite">
      <div class="page-loader-spinner" aria-hidden="true"></div>
      <div class="page-loader-text">
        <div class="page-loader-title">${text}</div>
        <div class="page-loader-sub">${subtext}</div>
      </div>
    </div>
  `;
  document.body.appendChild(loaderEl);
}

export function hideLoader() {
  if (!loaderEl) return;
  loaderEl.style.opacity = "0";
  loaderEl.style.transform = "translateY(-6px)";
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    loaderEl?.remove();
    loaderEl = null;
  }, 180);
}
