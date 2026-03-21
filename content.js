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

  /* ─────────────────────────────────────────────
     Inject a <style> element immediately (sync)
     so blocking applies before any content paints.
     Default: both features ON (same behaviour as
     the old static styles.css).
  ───────────────────────────────────────────── */
  const styleEl = document.createElement("style");
  styleEl.id = "nuke-shorts-dynamic-css";
  document.documentElement.appendChild(styleEl);

  const settings = { shortsBlocked: true, recsBlocked: true };

  function applyCSS() {
    let css = "";
    if (settings.shortsBlocked) css += SHORTS_CSS;
    if (settings.recsBlocked) css += RECS_CSS;
    styleEl.textContent = css;
  }

  // Apply defaults immediately (blocks everything until storage is read)
  applyCSS();

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
    redirectIfShorts();
    removeShortsNodes(document);
    setRecsVisibility();
  }

  /* ─────────────────────────────────────────────
     Load persisted settings, then re-apply
  ───────────────────────────────────────────── */
  chrome.storage.local.get(["shortsBlocked", "recsBlocked"], (result) => {
    // Treat missing keys as "blocked" (default on)
    settings.shortsBlocked = result.shortsBlocked !== false;
    settings.recsBlocked = result.recsBlocked !== false;
    applyCSS();
    enforce();
  });

  /* ─────────────────────────────────────────────
     Live listener – reacts instantly when the
     popup toggles a setting
  ───────────────────────────────────────────── */
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    let changed = false;

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
     MutationObserver – catch dynamically added nodes
  ───────────────────────────────────────────── */
  let lastHref = location.href;

  const observer = new MutationObserver((mutations) => {
    // SPA navigation detected
    if (location.href !== lastHref) {
      lastHref = location.href;
      enforce();
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

  // Periodic sweep as a safety net for lazy-loaded content
  setInterval(enforce, 1500);

  enforce();
})();
