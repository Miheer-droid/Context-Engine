// background.js — MV3 service worker.
//
// This used to contain a second, hand-duplicated copy of detector.js's
// SITE_RULES/detectSite() — dead code that nothing here called, and a
// duplication-drift risk (the exact thing this project's architecture is
// trying to avoid elsewhere). Removed.
//
// What this file actually needs to do: tell Chrome to open the side panel
// when the toolbar icon is clicked. manifest.json's "side_panel.default_path"
// only tells Chrome *what* to show once the panel opens — it does not, on
// its own, make the action icon open it. Without the call below, clicking
// the icon does nothing.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error("Failed to set side panel behavior:", err));
