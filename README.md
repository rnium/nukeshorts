# NukeYT

A Chrome/Brave extension that can block YouTube Shorts, watch-page recommendations, or nuke YouTube entirely — with a PIN-protected popup UI so the settings can't be casually undone.

## Features

- **Nuke YouTube** — replaces the entire YouTube page with a clean "YouTube is Nuked" screen
- **Nuke Shorts** — hides all Shorts thumbnails, shelf sections, sidebar links, and redirects away from `/shorts/` URLs
- **Nuke Recommendations** — hides the watch-page sidebar, end-screen suggestions, and autoplay overlays
- **Popup UI** — click the extension icon to toggle each feature on or off
- **PIN protection** — turning a feature *off* requires a 4-digit PIN; turning it back *on* is always free
- **Change PIN** — update your PIN at any time from the popup (requires the current PIN first)
- **Live updates** — changes in the popup take effect on any open YouTube tab instantly, no refresh needed

## Install (Developer Mode)

1. Open `chrome://extensions` (or `brave://extensions`).
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `nukeshorts` folder.

## How to Use

### Toggles

Open the popup by clicking the extension icon in the toolbar. Three toggle switches are shown:

| Toggle | What it does |
|---|---|
| Nuke YouTube | Replaces YouTube entirely with a "nuked" page |
| Nuke Shorts | Hides Shorts thumbnails, shelves, nav links, `/shorts/` redirects |
| Nuke Recommendations | Hides watch-page sidebar, end-screen cards, autoplay overlays |

Nuke Shorts and Nuke Recommendations are **on by default**. Nuke YouTube is **off by default**.

### PIN setup

Turning a toggle **off** for the first time will prompt you to create a 4-digit PIN before the change is applied. After a PIN is set:

- **Turning off** any feature → enter your PIN on the numpad
- **Turning on** any feature → no PIN needed
- **Changing your PIN** → click *Change PIN*, verify your current PIN, then enter and confirm the new one

The PIN is never stored in plain text — it is hashed with **SHA-256** (Web Crypto API) before being saved to `chrome.storage.local`.

## File Structure

```
nukeshorts/
├── manifest.json      # Extension manifest (MV3)
├── content.js         # Injected into YouTube; manages blocking CSS + DOM enforcement
├── popup.html         # Popup UI markup
├── popup.css          # Popup styles (shadcn-style dark, black & white)
├── popup.js           # Popup logic: toggles, PIN state machine, storage sync
└── icon*.png          # Extension icons (16, 32, 48, 128 px)
```

## Technical Notes

- **Dynamic CSS injection** — `content.js` creates a `<style>` element synchronously at `document_start` and updates its content based on stored settings. This means blocking is active before any page content paints, with no flash of unblocked content.
- **Nuke YouTube overlay** — when enabled, a full-page overlay replaces all YouTube content with a clean "YouTube is Nuked" message.
- **SPA navigation** — a `MutationObserver` watches for DOM changes and re-enforces rules after YouTube's client-side navigation.
- **Periodic sweep** — a `setInterval` runs every 1.5 s as a safety net for lazily-loaded content.
- **Storage** — settings (`ytBlocked`, `shortsBlocked`, `recsBlocked`, `pinHash`) are persisted in `chrome.storage.local`. The content script listens via `chrome.storage.onChanged` for instant cross-tab updates.
- **Permissions used** — `storage`, `host_permissions: https://www.youtube.com/*`

## Caveats

YouTube periodically changes its internal component names. If blocking stops working, the CSS selectors and custom-element names in `content.js` may need updating.