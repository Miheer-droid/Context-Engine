const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const statusDetail = document.getElementById("status-detail");
const enableBtn = document.getElementById("enable-btn");
const mainPanel = document.getElementById("main-panel");
const refinerPanel = document.getElementById("refiner-panel");
const roughPrompt = document.getElementById("rough-prompt");
const refineBtn = document.getElementById("refine-btn");
const refinerStatus = document.getElementById("refiner-status");
const refinedPrompt = document.getElementById("refined-prompt");

// Declaring the language explicitly avoids the "no output language specified"
// warning and matches what LanguageModel.create() will be called with later.
const MODEL_OPTIONS = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

function setStatus(state, label, detail) {
  statusDot.dataset.state = state;
  statusText.textContent = label;
  statusDetail.textContent = detail;
}

async function checkAvailability() {
  if (!("LanguageModel" in self)) {
    setStatus(
      "unavailable",
      "Not supported",
      "This Chrome build does not expose the on-device AI Prompt API. Make sure you are on an official Chrome release (not a Linux-distro Chromium build), version 138 or newer."
    );
    return;
  }

  let availability;
  try {
    availability = await LanguageModel.availability(MODEL_OPTIONS);
  } catch (err) {
    setStatus("unavailable", "Check failed", `Availability check threw an error: ${err.message}`);
    return;
  }

  if (availability === "available") {
    onReady();
  } else if (availability === "downloadable") {
    setStatus(
      "downloadable",
      "Not downloaded yet",
      "Gemini Nano can run on this device but hasn't been downloaded. Click below to start the download (needs about 10GB free disk space)."
    );
    enableBtn.hidden = false;
  } else if (availability === "downloading") {
    setStatus("downloading", "Downloading...", "Gemini Nano is downloading in the background. This can take a few minutes.");
    pollUntilReady();
  } else {
    setStatus(
      "unavailable",
      "Unavailable on this device",
      "Check chrome://on-device-internals for the reason (usually insufficient GPU or storage)."
    );
  }
}

function pollUntilReady() {
  const interval = setInterval(async () => {
    const availability = await LanguageModel.availability(MODEL_OPTIONS);
    if (availability === "available") {
      clearInterval(interval);
      onReady();
    }
  }, 5000);
}

function onReady() {
  setStatus("available", "Ready", "Gemini Nano is downloaded and ready on this device.");
  enableBtn.hidden = true;
  mainPanel.hidden = false;
  refinerPanel.hidden = false;
  refreshActiveSite();
}

const siteDot = document.getElementById("site-dot");
const siteText = document.getElementById("site-text");
const siteDetail = document.getElementById("site-detail");

// Site display text used to be a second, hand-duplicated copy of what's in
// data/prompt-structures.json. It now comes from that file directly, so
// there is exactly one place that knows what "Claude" means structurally.
let siteStructures = null;

async function loadSiteStructures() {
  try {
    const url = chrome.runtime.getURL("data/prompt-structures.json");
    const response = await fetch(url);
    const doc = await response.json();
    siteStructures = doc.sites || {};
  } catch (err) {
    // Non-fatal: the panel still works, it just won't have a structure
    // description until this resolves (or if it never does).
    siteStructures = {};
  }
}

async function refreshActiveSite() {
  if (typeof detectSite !== "function") {
    siteText.textContent = "Internal error";
    siteDetail.textContent = "detector.js failed to load. Check sidepanel.html script tags.";
    return;
  }

  if (!siteStructures) {
    await loadSiteStructures();
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let hostname = null;
  try {
    hostname = tab && tab.url ? new URL(tab.url).hostname : null;
  } catch (err) {
    hostname = null;
  }

  const site = detectSite(hostname);
  siteDot.dataset.state = site.id;
  siteText.textContent = site.label;
  siteDetail.textContent = (siteStructures[site.id] && siteStructures[site.id].displayHint) || "";
}

chrome.tabs.onActivated.addListener(refreshActiveSite);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    refreshActiveSite();
  }
});

enableBtn.addEventListener("click", async () => {
  enableBtn.disabled = true;
  enableBtn.textContent = "Starting download...";
  try {
    // Creating a session is what actually triggers the download.
    // This only works right after a real user click (user activation).
    const session = await LanguageModel.create(MODEL_OPTIONS);
    session.destroy();
    onReady();
  } catch (err) {
    setStatus("unavailable", "Could not start download", err.message);
    enableBtn.disabled = false;
    enableBtn.textContent = "Enable Gemini Nano";
  }
});

refineBtn.addEventListener("click", async () => {
  refineBtn.disabled = true;
  refinerStatus.textContent = "Refining on this device...";

  try {
    const result = await refinePrompt(roughPrompt.value);
    refinedPrompt.value = result.refinedPrompt;
    refinerStatus.textContent = `Refinement ${result.turn} of 5 complete.`;
  } catch (err) {
    refinerStatus.textContent = err.message;
  } finally {
    refineBtn.disabled = false;
  }
});

checkAvailability();
loadSiteStructures();
