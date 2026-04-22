const OVERLAY_ID = "em-loading-overlay";

function createOverlay(wrapper) {
    if (!wrapper) return null;

    let overlay = wrapper.querySelector(`#${OVERLAY_ID}`);
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.classList.add("is-hidden");
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
        <div class="em-spinner-stack" role="status" aria-live="polite">
            <div class="em-loading-spinner" aria-hidden="true"></div>
            <div class="em-loading-label">Loading…</div>
        </div>
    `;

    wrapper.appendChild(overlay);
    return overlay;
}

export function showSpinner(wrapper, label = "Loading…") {
    const overlay = createOverlay(wrapper);
    if (!overlay) return;

    const lbl = overlay.querySelector(".em-loading-label");
    if (lbl) lbl.textContent = label;

    overlay.classList.remove("is-hidden");
    overlay.setAttribute("aria-hidden", "false");
}

export function hideSpinner(wrapper) {
    if (!wrapper) return;

    const overlay = wrapper.querySelector(`#${OVERLAY_ID}`);
    if (!overlay) return;

    overlay.classList.add("is-hidden");
    overlay.setAttribute("aria-hidden", "true");
}
