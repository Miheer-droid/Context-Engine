// summarizer.js — converts a continuous chat's extracted dialogue into a
// small, local topic summary. This intentionally uses Chrome's task-specific
// Summarizer API, not the LanguageModel Prompt API used by refiner.js.

const SUMMARIZER_OPTIONS = {
  type: "tldr",
  format: "plain-text",
  length: "short",
  expectedInputLanguages: ["en"],
  outputLanguage: "en",
  expectedContextLanguages: ["en"],
  sharedContext: "Summarize the current AI chat's topic, decisions, and constraints in one sentence for a later prompt-refinement step.",
};

const MAX_SUMMARIZABLE_MESSAGES = 8;
const MAX_SUMMARIZABLE_CHARACTERS = 6000;

function dialogueToSummaryText(messages) {
  return messages
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.text}`)
    .join("\n\n");
}

function isTooComplexToSummarize(messages, text) {
  return messages.length > MAX_SUMMARIZABLE_MESSAGES || text.length > MAX_SUMMARIZABLE_CHARACTERS;
}

async function summarizeChatDialogue(dialogue) {
  if (!dialogue || dialogue.state !== "continuous" || !dialogue.messages.length) {
    return { type: "none" };
  }

  const summaryText = dialogueToSummaryText(dialogue.messages);
  if (isTooComplexToSummarize(dialogue.messages, summaryText)) {
    return {
      type: "clarify",
      question: "This chat has too many details to safely reduce to one sentence. Do you want to continue this chat? If so, describe the specific next task in the rough prompt box.",
    };
  }

  if (!("Summarizer" in self)) {
    return { type: "unavailable", reason: "Chrome's on-device Summarizer API is not available in this build." };
  }

  let availability;
  try {
    availability = await Summarizer.availability();
  } catch (err) {
    return { type: "unavailable", reason: `Could not check chat summarization: ${err.message}` };
  }

  if (availability !== "available") {
    return {
      type: "unavailable",
      reason: availability === "downloadable"
        ? "Chat summarization is ready to download after a user interaction."
        : "Chat summarization is unavailable on this device.",
    };
  }

  let summarizer;
  try {
    summarizer = await Summarizer.create(SUMMARIZER_OPTIONS);
    const summary = await summarizer.summarize(summaryText, {
      context: "Return one plain-text sentence that preserves the current topic and any stated decisions or constraints.",
    });
    return { type: "summary", summary: summary.trim() };
  } catch (err) {
    return { type: "unavailable", reason: `Could not summarize this chat: ${err.message}` };
  } finally {
    if (summarizer && typeof summarizer.destroy === "function") {
      summarizer.destroy();
    }
  }
}
