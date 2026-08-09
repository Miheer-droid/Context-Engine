// template-engine.js — converts completed prompt content into the wire format
// expected by the active target site. It deliberately does not change the
// prompt's instructions; refiner.js remains the owner of content quality.

let promptStructuresPromise = null;

function loadPromptStructures() {
  if (!promptStructuresPromise) {
    promptStructuresPromise = fetch(chrome.runtime.getURL("data/prompt-structures.json"))
      .then((response) => response.json())
      .then((doc) => doc.sites || {});
  }

  return promptStructuresPromise;
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyWireFormat(refinedPrompt, format) {
  if (format === "xml-tags") {
    return `<task>\n${escapeXml(refinedPrompt)}\n</task>`;
  }

  if (format === "markdown-headers") {
    return `## Task\n\n${refinedPrompt}`;
  }

  if (format === "plain-labeled") {
    return `Task:\n${refinedPrompt}`;
  }

  return `Task:\n${refinedPrompt}`;
}

async function formatRefinedPromptForSite(siteId, refinement) {
  const structures = await loadPromptStructures();
  const structure = structures[siteId] || structures.unsupported;
  const rawPrompt = refinement.refinedPrompt.trim();

  return {
    ...refinement,
    siteId,
    format: structure.format,
    formattedPrompt: applyWireFormat(rawPrompt, structure.format),
  };
}
