// dom-reader.js — the only module that reads a supported AI site's existing
// conversation. It returns plain alternating dialogue; it does not summarize
// or decide how that context should change the user's new prompt.

const DOM_READER_TARGETS = {
  chatgpt: {
    userSelectors: ['[data-message-author-role="user"]'],
    assistantSelectors: ['[data-message-author-role="assistant"]'],
  },
  claude: {
    userSelectors: ['[data-testid="user-message"]', '[data-testid*="user-message"]', '[data-testid*="human-message"]'],
    assistantSelectors: ['[data-testid="assistant-message"]', '[data-testid*="assistant-message"]', '.font-claude-message'],
  },
  gemini: {
    userSelectors: ['user-query', '[data-testid="user-message"]', '[data-testid*="user-query"]'],
    assistantSelectors: ['model-response', '[data-testid="model-response"]', '[data-testid*="model-response"]'],
  },
  grok: {
    userSelectors: ['[data-testid*="user-message"]', '[data-testid*="userMessage"]', '[data-testid*="message-user"]'],
    assistantSelectors: ['[data-testid*="assistant-message"]', '[data-testid*="assistantMessage"]', '[data-testid*="message-assistant"]'],
  },
};

const MAX_DIALOGUE_CHARACTERS = 12000;

function getDomReaderTarget(siteId) {
  return DOM_READER_TARGETS[siteId] || null;
}

// --- page-side: runs inside the target tab, not the side panel ---
function pageSideReadDialogue(targetInfo, maxCharacters) {
  const collected = new Map();

  function collect(role, selectors) {
    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        if (!collected.has(element)) {
          collected.set(element, role);
        }
      }
    }
  }

  collect("user", targetInfo.userSelectors);
  collect("assistant", targetInfo.assistantSelectors);

  const entries = [...collected.entries()]
    .map(([element, role]) => ({
      element,
      role,
      text: (element.innerText || "").replace(/\s+/g, " ").trim(),
    }))
    .filter((entry) => entry.text)
    .sort((left, right) => {
      const relation = left.element.compareDocumentPosition(right.element);
      return relation & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });

  const messages = [];
  for (const entry of entries) {
    const previous = messages[messages.length - 1];
    if (previous && previous.role === entry.role) {
      if (!previous.text.includes(entry.text)) {
        previous.text += `\n${entry.text}`;
      }
    } else {
      messages.push({ role: entry.role, text: entry.text });
    }
  }

  let totalCharacters = messages.reduce((total, message) => total + message.text.length, 0);
  while (messages.length && totalCharacters > maxCharacters) {
    totalCharacters -= messages[0].text.length;
    messages.shift();
  }

  return {
    state: messages.length ? "continuous" : "fresh",
    messages,
  };
}
// --- end page-side ---

async function readActiveChatDialogue() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    return { state: "fresh", siteId: "none", messages: [] };
  }

  let hostname = null;
  try {
    hostname = tab.url ? new URL(tab.url).hostname : null;
  } catch (err) {
    hostname = null;
  }

  const site = detectSite(hostname);
  const targetInfo = getDomReaderTarget(site.id);
  if (!targetInfo) {
    return { state: "fresh", siteId: site.id, messages: [] };
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: pageSideReadDialogue,
      args: [targetInfo, MAX_DIALOGUE_CHARACTERS],
    });
    const dialogue = results && results[0] && results[0].result;
    return { ...(dialogue || { state: "fresh", messages: [] }), siteId: site.id };
  } catch (err) {
    return { state: "fresh", siteId: site.id, messages: [], reason: err.message };
  }
}
