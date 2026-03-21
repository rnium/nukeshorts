"use strict";

/* ─────────────────────────────────────────────
   Modal modes
───────────────────────────────────────────── */
const MODE = {
  VERIFY_DISABLE_SHORTS: "verify-disable-shorts",
  VERIFY_DISABLE_RECS: "verify-disable-recs",
  VERIFY_CHANGE_PIN: "verify-change-pin",
  SET_NEW_PIN: "set-new-pin",
  CONFIRM_NEW_PIN: "confirm-new-pin",
};

/* ─────────────────────────────────────────────
   Runtime state
───────────────────────────────────────────── */
const state = {
  shortsBlocked: true,
  recsBlocked: true,
  pinHash: null, // SHA-256 hex string, or null if no PIN set
};

let modalMode = null; // current MODE value
let pinBuffer = ""; // digits typed so far (max 4)
let newPinBuffer = ""; // new PIN stored between SET_NEW_PIN → CONFIRM_NEW_PIN
let pendingDisable = null; // 'shorts' | 'recs' | null – feature to disable after PIN setup

/* ─────────────────────────────────────────────
   Crypto
───────────────────────────────────────────── */
async function sha256(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ─────────────────────────────────────────────
   Storage helpers
───────────────────────────────────────────── */
function loadState() {
  return new Promise((resolve) =>
    chrome.storage.local.get(
      ["shortsBlocked", "recsBlocked", "pinHash"],
      (res) => {
        state.shortsBlocked = res.shortsBlocked !== false; // default true
        state.recsBlocked = res.recsBlocked !== false; // default true
        state.pinHash = res.pinHash ?? null;
        resolve();
      },
    ),
  );
}

function persist() {
  chrome.storage.local.set({
    shortsBlocked: state.shortsBlocked,
    recsBlocked: state.recsBlocked,
    pinHash: state.pinHash,
  });
}

/* ─────────────────────────────────────────────
   Main-view rendering
───────────────────────────────────────────── */
function renderMain() {
  // Toggles
  document.getElementById("shorts-toggle").checked = state.shortsBlocked;
  document.getElementById("recs-toggle").checked = state.recsBlocked;

  // PIN section
  const hasPIN = Boolean(state.pinHash);
  document.getElementById("pin-status-label").textContent = hasPIN
    ? "PIN protected"
    : "No PIN set";
  document.getElementById("pin-status-desc").textContent = hasPIN
    ? "PIN required to disable"
    : "Set a PIN to lock your settings";
  document.getElementById("pin-action-btn").textContent = hasPIN
    ? "Change PIN"
    : "Set PIN";
}

/* ─────────────────────────────────────────────
   Modal helpers
───────────────────────────────────────────── */
function openModal(mode, title, desc) {
  modalMode = mode;
  pinBuffer = "";
  refreshDots();
  clearError();

  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-desc").textContent = desc;
  document.getElementById("main-view").classList.add("hidden");
  document.getElementById("pin-view").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("pin-view").classList.add("hidden");
  document.getElementById("main-view").classList.remove("hidden");
  modalMode = null;
  pinBuffer = "";
  newPinBuffer = "";
  pendingDisable = null;
}

/* ─────────────────────────────────────────────
   Dot display
───────────────────────────────────────────── */
function refreshDots() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`d${i}`);
    dot.classList.toggle("filled", i < pinBuffer.length);
    dot.classList.remove("error");
  }
}

function flashDots(errorMsg) {
  const dotsEl = document.getElementById("pin-dots");

  for (let i = 0; i < 4; i++) {
    const d = document.getElementById(`d${i}`);
    d.classList.remove("filled");
    d.classList.add("error");
  }

  dotsEl.classList.remove("shake");
  // Force reflow so the animation re-triggers
  void dotsEl.offsetWidth;
  dotsEl.classList.add("shake");

  showError(errorMsg);
  pinBuffer = "";

  // Clear after shake settles
  setTimeout(() => {
    dotsEl.classList.remove("shake");
    for (let i = 0; i < 4; i++) {
      document.getElementById(`d${i}`).classList.remove("error");
    }
  }, 500);
}

/* ─────────────────────────────────────────────
   Error message
───────────────────────────────────────────── */
function showError(msg) {
  const el = document.getElementById("pin-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}

function clearError() {
  const el = document.getElementById("pin-error");
  el.textContent = "";
  el.classList.add("hidden");
}

/* ─────────────────────────────────────────────
   Numpad input
───────────────────────────────────────────── */
function pressDigit(digit) {
  if (pinBuffer.length >= 4) return;
  clearError();
  pinBuffer += digit;
  refreshDots();
  if (pinBuffer.length === 4) {
    // Small delay so the last dot fills visibly before processing
    setTimeout(handleComplete, 120);
  }
}

function pressBackspace() {
  if (!pinBuffer.length) return;
  pinBuffer = pinBuffer.slice(0, -1);
  refreshDots();
  clearError();
}

/* ─────────────────────────────────────────────
   PIN completion handler (state machine)
───────────────────────────────────────────── */
async function handleComplete() {
  const mode = modalMode;
  const entered = pinBuffer;

  /* ── Verify to disable Shorts ── */
  if (mode === MODE.VERIFY_DISABLE_SHORTS) {
    const hash = await sha256(entered);
    if (hash === state.pinHash) {
      state.shortsBlocked = false;
      persist();
      renderMain();
      closeModal();
    } else {
      flashDots("Incorrect PIN. Try again.");
    }
    return;
  }

  /* ── Verify to disable Recommendations ── */
  if (mode === MODE.VERIFY_DISABLE_RECS) {
    const hash = await sha256(entered);
    if (hash === state.pinHash) {
      state.recsBlocked = false;
      persist();
      renderMain();
      closeModal();
    } else {
      flashDots("Incorrect PIN. Try again.");
    }
    return;
  }

  /* ── Verify current PIN before changing ── */
  if (mode === MODE.VERIFY_CHANGE_PIN) {
    const hash = await sha256(entered);
    if (hash === state.pinHash) {
      openModal(MODE.SET_NEW_PIN, "Set New PIN", "Enter your new 4-digit PIN");
    } else {
      flashDots("Incorrect PIN. Try again.");
    }
    return;
  }

  /* ── Capture new PIN (step 1 of 2) ── */
  if (mode === MODE.SET_NEW_PIN) {
    newPinBuffer = entered;
    openModal(
      MODE.CONFIRM_NEW_PIN,
      "Confirm PIN",
      "Re-enter your new PIN to confirm",
    );
    return;
  }

  /* ── Confirm new PIN (step 2 of 2) ── */
  if (mode === MODE.CONFIRM_NEW_PIN) {
    if (entered === newPinBuffer) {
      state.pinHash = await sha256(entered);

      // Execute any pending disable action that triggered the setup flow
      if (pendingDisable === "shorts") state.shortsBlocked = false;
      if (pendingDisable === "recs") state.recsBlocked = false;

      persist();
      renderMain();
      closeModal();
    } else {
      newPinBuffer = "";
      flashDots("PINs don't match.");
      // After the error animation, restart from step 1
      setTimeout(() => {
        openModal(
          MODE.SET_NEW_PIN,
          "Set New PIN",
          "Enter your new 4-digit PIN",
        );
      }, 900);
    }
    return;
  }
}

/* ─────────────────────────────────────────────
   Toggle "turn off" flow
───────────────────────────────────────────── */
function handleTurnOff(feature /* 'shorts' | 'recs' */) {
  const isShorts = feature === "shorts";
  const featureName = isShorts ? "Block Shorts" : "Block Recommendations";

  if (!state.pinHash) {
    // No PIN exists yet → force the user to create one first
    pendingDisable = feature;
    openModal(
      MODE.SET_NEW_PIN,
      "Create a PIN First",
      `Set a PIN — it will be required to turn off ${featureName}.`,
    );
  } else {
    openModal(
      isShorts ? MODE.VERIFY_DISABLE_SHORTS : MODE.VERIFY_DISABLE_RECS,
      "Enter PIN",
      `Enter your PIN to disable ${featureName}`,
    );
  }
}

/* ─────────────────────────────────────────────
   Boot
───────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async () => {
  await loadState();
  renderMain();

  /* ── Shorts toggle ── */
  document.getElementById("shorts-toggle").addEventListener("change", (e) => {
    if (e.target.checked) {
      // Turning ON is always free
      state.shortsBlocked = true;
      persist();
      renderMain();
    } else {
      // Revert the visual immediately; only update after PIN is confirmed
      e.target.checked = true;
      handleTurnOff("shorts");
    }
  });

  /* ── Recs toggle ── */
  document.getElementById("recs-toggle").addEventListener("change", (e) => {
    if (e.target.checked) {
      state.recsBlocked = true;
      persist();
      renderMain();
    } else {
      e.target.checked = true;
      handleTurnOff("recs");
    }
  });

  /* ── PIN action button (Set PIN / Change PIN) ── */
  document.getElementById("pin-action-btn").addEventListener("click", () => {
    if (state.pinHash) {
      // Already has PIN → verify current before allowing change
      openModal(
        MODE.VERIFY_CHANGE_PIN,
        "Change PIN",
        "Enter your current PIN first",
      );
    } else {
      pendingDisable = null;
      openModal(
        MODE.SET_NEW_PIN,
        "Set PIN",
        "Create a 4-digit PIN to protect your settings",
      );
    }
  });

  /* ── Cancel / back button ── */
  document.getElementById("modal-close").addEventListener("click", () => {
    closeModal();
    renderMain(); // restore any visually-reverted toggles
  });

  /* ── Numpad digit buttons ── */
  document.querySelectorAll(".num-btn[data-digit]").forEach((btn) => {
    btn.addEventListener("click", () => pressDigit(btn.dataset.digit));
  });

  /* ── Backspace button ── */
  document
    .getElementById("backspace")
    .addEventListener("click", pressBackspace);

  /* ── Keyboard support ── */
  document.addEventListener("keydown", (e) => {
    // Only active when the overlay is visible
    if (document.getElementById("pin-view").classList.contains("hidden"))
      return;

    if (e.key >= "0" && e.key <= "9") pressDigit(e.key);
    else if (e.key === "Backspace") pressBackspace();
    else if (e.key === "Escape") {
      closeModal();
      renderMain();
    }
  });
});
