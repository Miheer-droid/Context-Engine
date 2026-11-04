const REFINER_MODEL_OPTIONS = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

const MAX_REFINEMENT_TURNS = 5;

let runtimeKnowledgePromise = null;
let refinementTurns = 0;

// Every model call gets a fresh session. Each request already carries the whole
// conversation, so a shared session only repeated it and used up the small
// context window.
async function promptOnce(text, recordCreate) {
  const createStartedAt = metricsNow();
  const session = await LanguageModel.create(REFINER_MODEL_OPTIONS);
  if (recordCreate) metricsRecordSessionCreate(metricsNow() - createStartedAt);
  try {
    return await session.prompt(text);
  } finally {
    session.destroy();
  }
}

function loadRuntimeKnowledge() {
  if (!runtimeKnowledgePromise) {
    runtimeKnowledgePromise = Promise.all([
      fetch(chrome.runtime.getURL("runtime/rules.json")).then((response) => response.json()),
      fetch(chrome.runtime.getURL("runtime/fragments.json")).then((response) => response.json()),
    ]).then(([rulesDoc, fragmentsDoc]) => ({
      rules: rulesDoc.rules || {},
      fragments: fragmentsDoc.fragments || {},
    }));
  }

  return runtimeKnowledgePromise;
}

// Whole-word match, so "vs" does not fire inside "canvas" or "nice" inside "Venice".
function containsKeyword(text, keyword) {
  const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(text);
}

function matchesRule(text, detect) {
  const normalizedText = text.toLowerCase();

  if (detect.type === "verbAbsence") {
    return !detect.verbs.some((verb) =>
      new RegExp(`\\b${verb.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`, "i").test(text)
    );
  }

  if (detect.type === "regex") {
    return new RegExp(detect.pattern, detect.flags || "").test(text);
  }

  if (detect.type === "keywordAbsence") {
    return !detect.keywords.some((keyword) => containsKeyword(normalizedText, keyword));
  }

  if (detect.type === "keywordPresence") {
    return detect.keywords.some((keyword) => containsKeyword(normalizedText, keyword));
  }

  if (detect.type === "keywordPresenceWithoutPhrase") {
    return (
      detect.keywords.some((keyword) => containsKeyword(normalizedText, keyword)) &&
      !containsKeyword(normalizedText, detect.excludePhrase)
    );
  }

  return false;
}

function findTriggeredRuleIds(text, rules) {
  return Object.entries(rules)
    .filter(([, rule]) => matchesRule(text, rule.detect))
    .map(([ruleId]) => ruleId);
}

function selectFragments(rules, fragments, triggeredRuleIds, contextFlags) {
  const selectedIds = new Set(
    triggeredRuleIds.map((ruleId) => rules[ruleId].fragmentId)
  );

  for (const [fragmentId, fragment] of Object.entries(fragments)) {
    if (fragment.triggeredBy.some((trigger) => contextFlags.includes(trigger))) {
      selectedIds.add(fragmentId);
    }
  }

  return [...selectedIds]
    .map((fragmentId) => fragments[fragmentId])
    .filter(Boolean)
    .map((fragment) => fragment.text);
}

function buildRefinementRequest(roughPrompt, instructions) {
  const guidance = instructions.length
    ? instructions.map((instruction) => `- ${instruction}`).join("\n")
    : "- Preserve the user's intent while making the task, context, and expected output clear.";

  return `You are Context-Engine, a local prompt-refinement assistant. Rewrite the user's rough prompt into one clear, self-contained prompt that they can paste into another AI assistant. Do not answer the user's underlying request. Do not invent facts, sources, requirements, or context.

Apply these refinement instructions:
${guidance}

Respond with only a single JSON object and nothing else - no preamble, no markdown code fences, no text before or after it. The object must have exactly two string fields:
- "summary": a 1-2 sentence, plain-English description of what the refined prompt asks the AI to do. This is written for the human user reviewing it, not another prompt.
- "refinedPrompt": the rewritten prompt itself.

User's rough prompt:
---
${roughPrompt}
---`;
}

// Gemini Nano isn't guaranteed to return clean JSON - small models sometimes
// wrap it in a markdown code fence, or add a stray word before/after. This
// keeps a bad response from breaking the whole refinement instead of just
// degrading the summary, in line with the project's "never crash" rule.
function parseRefinerOutput(rawText) {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.refinedPrompt === "string" && parsed.refinedPrompt.trim()) {
      const summary =
        typeof parsed.summary === "string" && parsed.summary.trim()
          ? parsed.summary.trim()
          : "Refined prompt ready - review the preview below.";
      return { refinedPrompt: parsed.refinedPrompt.trim(), summary };
    }
  } catch (err) {
    // Falls through to the plain-text fallback below.
  }

  return {
    refinedPrompt: cleaned,
    summary: "Refined prompt ready - review the preview below.",
  };
}

function buildSelfCheckRequest(conversationSoFar) {
  return `You are Context-Engine, a local prompt-refinement assistant helping a user improve a rough prompt before they send it to another AI.

Conversation so far (rough prompt, plus any of your follow-up questions and the user's answers):
---
${conversationSoFar}
---

Decide if you have enough information to produce a genuinely improved, self-contained prompt. Ask a clarifying question ONLY if missing information would meaningfully change the output (e.g. missing budget, audience, format, constraints). Do not ask about things you can reasonably assume.

Respond with only a single JSON object, no markdown fences, no extra text:
{"sufficient": true or false, "question": "one short clarifying question, or empty string if sufficient"}`;
}

function buildFinalRefinementRequest(conversationSoFar, instructions) {
  const guidance = instructions.length
    ? instructions.map((i) => `- ${i}`).join("\n")
    : "- Preserve the user's intent while making the task, context, and expected output clear.";

  return `You are Context-Engine. Using the full conversation below (rough prompt, any clarifying questions you asked, and the user's answers), produce one clear, self-contained prompt the user can paste into another AI assistant. Do not answer the underlying request. Use only details from the conversation: do not add length limits, tones, placeholders, code or facts that the user did not give.

Apply these refinement instructions:
${guidance}

Conversation:
---
${conversationSoFar}
---

Respond with only a single JSON object, no markdown fences, no extra text:
{"summary": "1-2 sentence plain-English description of what the refined prompt asks for", "refinedPrompt": "the rewritten prompt"}`;
}

function tryParseJson(rawText) {
  const cleaned = rawText.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    return null;
  }
}

let conversationLog = "";
let userRounds = 0;
let chatContextSummary = "";
// The user's first message of the session. The rules are checked against this,
// not against later answers to clarifying questions.
let roughPromptText = "";

// A small model sometimes drops an instruction it was given. These fragments are
// short and fixed, so if the refined prompt left one out it is added here.
const REQUIRED_PHRASES = {
  fix_missing_stepwise_reasoning: {
    present: /step[- ]by[- ]step/i,
    append: "Think through this step by step before answering.",
  },
  grounding_fabrication_guard: {
    present: /fabricat|not certain|guess/i,
    append: "If you are not certain, say so instead of guessing. Do not fabricate sources, quotes, or statistics.",
  },
};

function ensureRequiredPhrases(prompt, fragmentIds) {
  let result = prompt.trim();
  for (const fragmentId of fragmentIds) {
    const required = REQUIRED_PHRASES[fragmentId];
    if (required && !required.present.test(result)) {
      result += (result ? " " : "") + required.append;
    }
  }
  return result;
}

function setChatContextSummary(summary) {
  chatContextSummary = typeof summary === "string" ? summary.trim() : "";
}

async function startOrContinueRefinement(userInput) {
  const clean = userInput.trim();
  if (!clean) throw new Error("Enter a rough prompt or an answer before continuing.");
  if (refinementTurns >= MAX_REFINEMENT_TURNS) {
    throw new Error("This refinement session has reached its 5-turn limit. Close and reopen the panel to start a new session.");
  }

  if (!conversationLog && chatContextSummary) {
    conversationLog = `Existing chat context: ${chatContextSummary}`;
  }
  conversationLog += (conversationLog ? "\nUser: " : "User: ") + clean;
  if (userRounds === 0) roughPromptText = clean;
  userRounds += 1;

  const checkStartedAt = metricsNow();
  const checkRaw = await promptOnce(buildSelfCheckRequest(conversationLog), true);
  metricsRecordSelfCheck(metricsNow() - checkStartedAt);
  refinementTurns += 1;
  const check = tryParseJson(checkRaw);
  metricsRecordSelfCheckParse(check);

  const isSufficient = !check || check.sufficient !== false; // fail-open if model returns junk
  // Metrics only: true when the model wanted another question but the turn cap forced the final step.
  metricsRunSet({ hitTurnCap: !isSufficient && !(refinementTurns < MAX_REFINEMENT_TURNS) });
  if (!isSufficient && refinementTurns < MAX_REFINEMENT_TURNS) {
    conversationLog += `\nAssistant question: ${check.question}`;
    return { type: "question", question: check.question, turn: refinementTurns, userRounds };
  }

  const { rules, fragments } = await loadRuntimeKnowledge();
  const triggeredRuleIds = findTriggeredRuleIds(roughPromptText, rules);
  const instructions = selectFragments(rules, fragments, triggeredRuleIds, []);

  const finalStartedAt = metricsNow();
  const finalRaw = await promptOnce(buildFinalRefinementRequest(conversationLog, instructions), false);
  metricsRecordFinalRefine(metricsNow() - finalStartedAt);
  refinementTurns += 1;
  const parsedFinal = tryParseJson(finalRaw);
  const final = parsedFinal || {};

  metricsRunSet({
    triggeredRuleIds: triggeredRuleIds,
    selectedFragmentCount: instructions.length,
    finalParsedOk: metricsIsObject(parsedFinal),
    finalUsedRawFallback: !final.refinedPrompt,
    userRounds: userRounds,
    refinementTurns: refinementTurns,
  });

  return {
    type: "ready",
    summary: final.summary || "Refined prompt ready - review the preview below.",
    refinedPrompt: ensureRequiredPhrases(
      final.refinedPrompt || finalRaw.trim(),
      triggeredRuleIds.map((ruleId) => rules[ruleId].fragmentId)
    ),
    turn: refinementTurns,
    userRounds,
  };
}

function resetRefinementSession() {
  conversationLog = "";
  roughPromptText = "";
  refinementTurns = 0;
  userRounds = 0;
}
