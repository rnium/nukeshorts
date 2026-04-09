(() => {
  "use strict";

  /* ─────────────────────────────────────────────
     Blocking CSS strings
  ───────────────────────────────────────────── */
  const SHORTS_CSS = `
    a[href^="/shorts"],
    ytd-guide-entry-renderer:has(a[href="/shorts"]),
    ytd-guide-entry-renderer:has(a[href^="/shorts"]),
    ytd-mini-guide-entry-renderer:has(a[href="/shorts"]),
    ytd-mini-guide-entry-renderer:has(a[href^="/shorts"]),
    ytd-guide-entry-renderer:has([title="Shorts"]),
    ytd-mini-guide-entry-renderer:has([title="Shorts"]),
    ytd-reel-shelf-renderer,
    ytd-rich-shelf-renderer[is-shorts],
    ytd-video-renderer:has(a[href^="/shorts/"]),
    ytd-grid-video-renderer:has(a[href^="/shorts/"]),
    ytd-compact-video-renderer:has(a[href^="/shorts/"]),
    ytd-rich-item-renderer:has(a[href^="/shorts/"]),
    ytd-channel-video-player-renderer:has(a[href^="/shorts/"]) {
      display: none !important;
    }
  `;

  const RECS_CSS = `
    ytd-watch-next-secondary-results-renderer,
    #related,
    ytd-compact-video-renderer,
    ytd-compact-radio-renderer,
    ytd-compact-playlist-renderer,
    ytd-watch-next-secondary-results-renderer * {
      display: none !important;
    }
    .ytp-ce-element,
    .ytp-endscreen-content,
    .ytp-autonav-endscreen-upnext-container,
    .ytp-autonav-endscreen-countdown-container,
    .ytp-videowall-still,
    .ytp-suggestion-set,
    .ytp-pause-overlay {
      display: none !important;
    }
  `;

  const YT_NUKE_CSS = `
    body.nukeyt-blocked > *:not(#nukeyt-overlay) {
      display: none !important;
    }
    #nukeyt-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #09090b;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    #nukeyt-overlay .nukeyt-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 40px;
      border: 1px solid #27272a;
      border-radius: 12px;
      background: #09090b;
      text-align: center;
      max-width: 420px;
      width: 90%;
    }
    #nukeyt-overlay .nukeyt-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #18181b;
      border: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      line-height: 1;
      color: #fafafa;
    }
    #nukeyt-overlay .nukeyt-title {
      font-size: 22px;
      font-weight: 600;
      color: #fafafa;
      letter-spacing: -0.01em;
      line-height: 1.3;
      margin: 0;
    }
    #nukeyt-overlay .nukeyt-desc {
      font-size: 14px;
      color: #71717a;
      line-height: 1.6;
      margin: 0;
    }
    #nukeyt-overlay .nukeyt-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: #18181b;
      border: 1px solid #27272a;
      font-size: 12px;
      font-weight: 500;
      color: #a1a1aa;
      letter-spacing: 0.02em;
    }
    #nukeyt-overlay .nukeyt-badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ef4444;
    }
  `;

  /* ─────────────────────────────────────────────
     Inject a <style> element immediately (sync)
  ───────────────────────────────────────────── */
  const styleEl = document.createElement("style");
  styleEl.id = "nuke-shorts-dynamic-css";
  document.documentElement.appendChild(styleEl);

  const settings = { ytBlocked: false, shortsBlocked: true, recsBlocked: true };

  function applyCSS() {
    let css = "";
    if (settings.ytBlocked) css += YT_NUKE_CSS;
    if (settings.shortsBlocked) css += SHORTS_CSS;
    if (settings.recsBlocked) css += RECS_CSS;
    styleEl.textContent = css;
  }

  // Apply defaults immediately
  applyCSS();

  /* ─────────────────────────────────────────────
     YouTube Nuke overlay
  ───────────────────────────────────────────── */
  function showNukeOverlay() {
    if (document.getElementById("nukeyt-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "nukeyt-overlay";
    overlay.innerHTML = `
      <div class="nukeyt-card">
        <div class="nukeyt-icon">&#x2622;</div>
        <h1 class="nukeyt-title">YouTube is Nuked</h1>
        <p class="nukeyt-desc">
          This site has been blocked by NukeYT.<br>
          Close this tab and do something awesome instead.
        </p>
        <div class="nukeyt-badge">
          <span class="nukeyt-badge-dot"></span>
          Blocked by NukeYT
        </div>
      </div>
    `;

    // Ensure body exists before appending
    const target = document.body || document.documentElement;
    target.appendChild(overlay);

    if (document.body) {
      document.body.classList.add("nukeyt-blocked");
    }
  }

  function removeNukeOverlay() {
    const overlay = document.getElementById("nukeyt-overlay");
    if (overlay) overlay.remove();
    if (document.body) {
      document.body.classList.remove("nukeyt-blocked");
    }
  }

  function enforceNuke() {
    if (settings.ytBlocked) {
      showNukeOverlay();
    } else {
      removeNukeOverlay();
    }
  }

  /* ─────────────────────────────────────────────
     DOM helpers
  ───────────────────────────────────────────── */
  const SHORTS_PATH = "/shorts/";

  function removeShortsNodes(root = document) {
    if (!settings.shortsBlocked) return;

    const links = root.querySelectorAll('a[href^="/shorts/"]');
    for (const link of links) {
      const container =
        link.closest(
          "ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, " +
            "ytd-compact-video-renderer, ytd-rich-shelf-renderer, " +
            "ytd-reel-shelf-renderer, ytd-item-section-renderer",
        ) || link;
      if (container instanceof HTMLElement) container.remove();
    }

    const shelves = root.querySelectorAll(
      "ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts]",
    );
    for (const shelf of shelves) {
      if (shelf instanceof HTMLElement) shelf.remove();
    }
  }

  function setRecsVisibility() {
    const targets = [
      document.querySelector("ytd-watch-next-secondary-results-renderer"),
      document.querySelector("#related"),
    ];
    for (const el of targets) {
      if (el instanceof HTMLElement) {
        el.style.display = settings.recsBlocked ? "none" : "";
      }
    }
  }

  function redirectIfShorts() {
    if (settings.shortsBlocked && location.pathname.startsWith(SHORTS_PATH)) {
      location.replace("https://www.youtube.com/");
    }
  }

  function enforce() {
    enforceNuke();
    if (settings.ytBlocked) return; // skip granular enforcement when fully nuked
    redirectIfShorts();
    removeShortsNodes(document);
    setRecsVisibility();
  }

  /* ─────────────────────────────────────────────
     Load persisted settings, then re-apply
  ───────────────────────────────────────────── */
  chrome.storage.local.get(
    ["ytBlocked", "shortsBlocked", "recsBlocked"],
    (result) => {
      settings.ytBlocked = result.ytBlocked === true; // default off
      settings.shortsBlocked = result.shortsBlocked !== false;
      settings.recsBlocked = result.recsBlocked !== false;
      applyCSS();
      enforce();
    },
  );

  /* ─────────────────────────────────────────────
     Live listener
  ───────────────────────────────────────────── */
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    let changed = false;

    if ("ytBlocked" in changes) {
      settings.ytBlocked = changes.ytBlocked.newValue === true;
      changed = true;
    }
    if ("shortsBlocked" in changes) {
      settings.shortsBlocked = changes.shortsBlocked.newValue !== false;
      changed = true;
    }
    if ("recsBlocked" in changes) {
      settings.recsBlocked = changes.recsBlocked.newValue !== false;
      changed = true;
    }

    if (changed) {
      applyCSS();
      enforce();
    }
  });

  /* ─────────────────────────────────────────────
     MutationObserver
  ───────────────────────────────────────────── */
  let lastHref = location.href;

  const observer = new MutationObserver((mutations) => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      enforce();
      return;
    }

    // Re-enforce nuke overlay in case YouTube tries to manipulate the DOM
    if (settings.ytBlocked) {
      enforceNuke();
      return;
    }

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          removeShortsNodes(node);
          setRecsVisibility();
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Periodic sweep as a safety net
  setInterval(enforce, 1500);

  enforce();
})();
