# YouTube Strict Cleaner (Chrome/Brave Extension)

This extension enforces two behaviors on YouTube:

1. Strictly blocks/hides Shorts content and redirects away from Shorts pages.
2. Hides recommended videos on watch/play screens.

## Install (Developer Mode)

1. Open `chrome://extensions` (or `brave://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `shortsblock`.

## Notes

- Works on `https://www.youtube.com/*`.
- Uses both CSS and JavaScript DOM enforcement so hidden elements do not come back after dynamic page updates.
- If YouTube changes internal DOM names in the future, selectors may need an update.
