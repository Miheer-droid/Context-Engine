const REFINER_MODEL_OPTIONS = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

const MAX_REFINEMENT_TURNS = 5;

let runtimeKnowledgePromise = null;
let refinerSession = null;
let refinementTurns = 0;

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

function containsKeyword(text, keyword) {
  return text.includes(keyword.toLowerCase());
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

  return `You are Context-Engine, a local prompt-refinement assistant. Rewrite the user's rough prompt into one clear, self-contained prompt that they can paste into another AI assistant. Do not answer the user's underlying request. Do not invent facts, sources, requirements, or context. Return only the improved prompt, with no introduction or explanation.\n\nApply these refinement instructions:\n${guidance}\n\nUser's rough prompt:\n---\n${roughPrompt}\n---`;
}

async function refinePrompt(roughPrompt, contextFlags = []) {
  const cleanPrompt = roughPrompt.trim();
  if (!cleanPrompt) {
    throw new Error("Enter a rough prompt before refining it.");
  }

  if (refinementTurns >= MAX_REFINEMENT_TURNS) {
    throw new Error("This refinement session has reached its 5-turn limit. Close and reopen the panel to start a new session.");
  }

  const { rules, fragments } = await loadRuntimeKnowledge();
  const triggeredRuleIds = findTriggeredRuleIds(cleanPrompt, rules);
  const instructions = selectFragments(rules, fragments, triggeredRuleIds, contextFlags);

  if (!refinerSession) {
    refinerSession = await LanguageModel.create(REFINER_MODEL_OPTIONS);
  }

  const refinedPrompt = await refinerSession.prompt(
    buildRefinementRequest(cleanPrompt, instructions)
  );
  refinementTurns += 1;

  return { refinedPrompt, triggeredRuleIds, turn: refinementTurns };
}
