// spinner.js
const OVERLAY_ID = "loading-overlay";

function createOverlay() {
  // attach inside #container if present so it covers only the map area; otherwise use body
  const container = document.getElementById("container") || document.body;

  // avoid creating more than one
  if (container.querySelector(`#${OVERLAY_ID}`)) return container.querySelector(`#${OVERLAY_ID}`);

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.setAttribute("aria-hidden", "false");
  overlay.style.display = "none"; // hidden by default
  overlay.style.position = "absolute";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.right = "0";
  overlay.style.bottom = "0";

  // spinner markup
  overlay.innerHTML = `
    <div class="spinner-stack" role="status" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <div class="loading-label">Loading…</div>
    </div>
  `;

  // ensure overlay is placed as first child so z-index stacking behaves
  container.appendChild(overlay);
  return overlay;
}

export function showSpinner(label = "Loading…") {
  const overlay = createOverlay();
  // set text
  const lbl = overlay.querySelector(".loading-label");
  if (lbl) lbl.textContent = label;

  // if append-to-body, ensure overlay covers viewport; if inside #container, it covers that element
  overlay.style.display = "flex";
  overlay.setAttribute("aria-hidden", "false");
}

export function hideSpinner() {
  const container = document.getElementById("container") || document.body;
  const overlay = container.querySelector(`#${OVERLAY_ID}`);
  if (overlay) {
    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");
  }
}