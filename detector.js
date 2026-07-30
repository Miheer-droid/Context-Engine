const SITE_RULES = [
  { id: "claude", label: "Claude", hostnames: ["claude.ai"] },
  { id: "chatgpt", label: "ChatGPT", hostnames: ["chatgpt.com", "chat.openai.com"] },
  { id: "gemini", label: "Gemini", hostnames: ["gemini.google.com"] },
  { id: "grok", label: "Grok", hostnames: ["grok.com"] },
];

function detectSite(hostname) {
  if (!hostname) {
    return { id: "none", label: "No active tab" };
  }

  const clean = hostname.replace(/^www\./, "");
  const match = SITE_RULES.find((site) =>
    site.hostnames.some((h) => clean === h || clean.endsWith(`.${h}`))
  );

  if (match) {
    return { id: match.id, label: match.label };
  }

  return { id: "unsupported", label: "Unsupported site" };
}
