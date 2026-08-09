// injector.js — the only module allowed to touch a supported AI site's DOM.
// detector.js decides *which* site is active; this module decides *how* to
// write into that site's prompt box once sidepanel.js asks it to.
//
// The side panel is its own document, isolated from the tab the user is
// looking at - reading or writing another tab's DOM from here isn't
// possible directly. chrome.scripting.executeScript is the bridge: it runs
// a plain function inside the target tab's page context and hands the
// return value back here. Everything under the "page-side" marker below
// runs over there, not in the side panel, so it can only see what's passed
// in through `args` - no closures over anything above it.

// Best-effort selectors for each supported site's prompt input. These are
// starting guesses based on the project's own spec notes (ChatGPT's
// #prompt-textarea, Claude's contenteditable div) and general knowledge of
// these sites' current UIs. AI chat sites redesign their DOM often and
// without notice, so treat these as a starting point: if "Apply Prompt"
// reports it can't find the input, open DevTools on the real site, inspect
// the prompt box, and update the selector here.
const INJECTOR_TARGETS = {
  claude: { selector: 'div[contenteditable="true"]', kind: "contenteditable" },
  chatgpt: { selector: "#prompt-textarea", kind: "contenteditable" },
  gemini: { selector: 'div[contenteditable="true"]', kind: "contenteditable" },
  grok: { selector: "textarea", kind: "textarea" },
};

function getInjectorTarget(siteId) {
  return INJECTOR_TARGETS[siteId] || null;
}

// --- page-side: runs inside the target tab, not the side panel ---
function pageSideApplyPrompt(refinedPrompt, targetInfo) {
  const element = document.querySelector(targetInfo.selector);
  if (!element) {
    return {
      ok: false,
      reason: `No element matched selector "${targetInfo.selector}" on this page. The site's layout may have changed.`,
    };
  }

  element.focus();

  if (targetInfo.kind === "textarea") {
    // A plain <textarea>/<input> under React or Vue tracks its value
    // through a property setter defined on the prototype, not through the
    // DOM attribute. Setting element.value directly leaves the framework's
    // internal state stale, so it won't notice the change. Calling the
    // prototype's own setter first, then dispatching a bubbling "input"
    // event, is what makes the framework pick it up.
    const proto = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, refinedPrompt);
    } else {
      element.value = refinedPrompt;
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    // contenteditable boxes (Claude, Gemini, current ChatGPT) are usually
    // backed by a rich-text editor (ProseMirror, Lexical, etc.) that only
    // recognizes real edit commands, not silent DOM mutation. execCommand
    // is deprecated but remains the most reliable cross-editor way to clear
    // and insert text that these editors will register as a genuine edit.
    document.execCommand("selectAll", false, null);
    document.execCommand("delete", false, null);

    // Some rich-text composers accept only the first line when a multi-line
    // string is passed to one insertText command. Insert each line and its
    // line break separately so the complete formatted prompt survives.
    const lines = refinedPrompt.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      document.execCommand("insertText", false, lines[index]);
      if (index < lines.length - 1) {
        document.execCommand("insertLineBreak", false, null);
      }
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return { ok: true };
}
// --- end page-side ---

async function applyPromptToActiveTab(refinedPrompt) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    return { ok: false, reason: "No active tab found." };
  }

  let hostname = null;
  try {
    hostname = tab.url ? new URL(tab.url).hostname : null;
  } catch (err) {
    hostname = null;
  }

  const site = detectSite(hostname);
  const targetInfo = getInjectorTarget(site.id);
  if (!targetInfo) {
    return { ok: false, reason: `${site.label} isn't a supported site for direct insertion yet.` };
  }

  try {
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: pageSideApplyPrompt,
      args: [refinedPrompt, targetInfo],
    });
    const pageResult = injectionResults && injectionResults[0] && injectionResults[0].result;
    return pageResult || { ok: false, reason: "The page didn't return a result." };
  } catch (err) {
    return { ok: false, reason: `Could not run on this page: ${err.message}` };
  }
}
