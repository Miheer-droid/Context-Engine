const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const statusDetail = document.getElementById("status-detail");
const enableBtn = document.getElementById("enable-btn");
const mainPanel = document.getElementById("main-panel");
const chatContextPanel = document.getElementById("chat-context-panel");
const chatContextText = document.getElementById("chat-context-text");
const refinerPanel = document.getElementById("refiner-panel");
const roughPrompt = document.getElementById("rough-prompt");
const refineBtn = document.getElementById("refine-btn");
const refinerStatus = document.getElementById("refiner-status");

const questionPanel = document.getElementById("question-panel");
const questionText = document.getElementById("question-text");
const questionAnswer = document.getElementById("question-answer");
const answerBtn = document.getElementById("answer-btn");

const previewCard = document.getElementById("preview-card");
const previewSummary = document.getElementById("preview-summary");
const previewPrompt = document.getElementById("preview-prompt");
const applyPromptBtn = document.getElementById("apply-prompt-btn");
const refineAgainBtn = document.getElementById("refine-again-btn");
const applyStatus = document.getElementById("apply-status");

// Holds the most recent refinement result so "Apply Prompt" has something
// to send even though the visible preview textarea is read-only. Lives only
// in memory, consistent with the project's volatile-session-only storage rule.
let currentRefinedPrompt = null;

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
let activeSiteId = "none";
let chatContextRequestId = 0;

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
  activeSiteId = site.id;
  siteDot.dataset.state = site.id;
  siteText.textContent = site.label;
  siteDetail.textContent = (siteStructures[site.id] && siteStructures[site.id].displayHint) || "";
  refreshChatContext(site);
}

async function refreshChatContext(site) {
  const requestId = ++chatContextRequestId;
  setChatContextSummary("");
  chatContextPanel.hidden = true;

  if (!["claude", "chatgpt", "gemini", "grok"].includes(site.id)) {
    return;
  }

  chatContextPanel.hidden = false;
  chatContextText.textContent = "Checking whether this is a fresh chat or an existing conversation. Please wait...";

  const dialogue = await readActiveChatDialogue();
  if (requestId !== chatContextRequestId || activeSiteId !== site.id || dialogue.siteId !== site.id) {
    return;
  }

  const context = await summarizeChatDialogue(dialogue);
  if (requestId !== chatContextRequestId || activeSiteId !== site.id) {
    return;
  }

  if (context.type === "none") {
    chatContextText.textContent = "Fresh chat detected. No earlier conversation context will be added.";
  } else if (context.type === "summary") {
    setChatContextSummary(context.summary);
    chatContextText.textContent = `Continuing this chat: ${context.summary}`;
  } else if (context.type === "clarify") {
    chatContextText.textContent = context.question;
  } else {
    chatContextText.textContent = context.reason;
  }
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

// Shared by "Refine prompt", "Continue" (answering a clarifying question),
// and "Refine Again" - the only difference between them is what text is
// being fed in next, not what work needs to happen.
async function runRefinementTurn(userInput) {
  refineBtn.disabled = true;
  answerBtn.disabled = true;
  applyPromptBtn.disabled = true;
  refinerStatus.textContent = "Thinking on this device...";
  applyStatus.textContent = "";

  try {
    const result = await startOrContinueRefinement(userInput);

    if (result.type === "question") {
      questionPanel.hidden = false;
      previewCard.hidden = true;
      questionText.textContent = result.question;
      questionAnswer.value = "";
      questionAnswer.focus();
      refinerStatus.textContent = `Round ${result.userRounds} - one more detail needed.`;
    } else {
      questionPanel.hidden = true;
      const formatted = await formatRefinedPromptForSite(activeSiteId, result);
      currentRefinedPrompt = formatted.formattedPrompt;
      previewSummary.textContent = result.summary;
      previewPrompt.value = formatted.formattedPrompt;
      previewCard.hidden = false;
      refinerStatus.textContent = `Refinement complete after ${result.userRounds} round${result.userRounds === 1 ? "" : "s"}.`;
    }
  } catch (err) {
    refinerStatus.textContent = err.message;
  } finally {
    refineBtn.disabled = false;
    answerBtn.disabled = false;
    applyPromptBtn.disabled = false;
  }
}

refineBtn.addEventListener("click", () => {
  resetRefinementSession();
  questionPanel.hidden = true;
  previewCard.hidden = true;
  runRefinementTurn(roughPrompt.value);
});

refineAgainBtn.addEventListener("click", () => {
  resetRefinementSession();
  questionPanel.hidden = true;
  previewCard.hidden = true;
  runRefinementTurn(roughPrompt.value);
});

answerBtn.addEventListener("click", () => {
  runRefinementTurn(questionAnswer.value);
});

applyPromptBtn.addEventListener("click", async () => {
  if (!currentRefinedPrompt) {
    applyStatus.textContent = "Refine a prompt first.";
    return;
  }

  applyPromptBtn.disabled = true;
  applyStatus.textContent = "Applying...";

  try {
    const result = await applyPromptToActiveTab(currentRefinedPrompt);
    applyStatus.textContent = result.ok
      ? "Applied. Review it in the page, then press Enter yourself to send it."
      : `Could not apply automatically: ${result.reason}`;
  } catch (err) {
    applyStatus.textContent = `Could not apply automatically: ${err.message}`;
  } finally {
    applyPromptBtn.disabled = false;
  }
});

checkAvailability();
loadSiteStructures();
