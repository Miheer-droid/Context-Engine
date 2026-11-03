// metrics.js — lightweight, in-memory measurement for the project report.
//
// Rules this file follows:
// - Everything lives in plain JS variables inside the side panel. Nothing is
//   written to chrome.storage, IndexedDB, localStorage, or a file, so closing
//   the panel wipes it.
// - It never stores the text of prompts, answers, or chat messages. Only
//   lengths, counts, booleans, timings, and rule ids.
// - It makes no network calls and never sends or submits anything.
// - Set METRICS_ENABLED to false and every helper below returns immediately.

const METRICS_ENABLED = true;

// Column order for each record type. The CSV export is built from these lists,
// so the header stays the same even if a field is missing on one record.
const METRICS_RUN_COLUMNS = [
  "runId",
  "siteId",
  "refineAgain",
  "wallMs",
  "modelMs",
  "sessionCreateMs",
  "coldStart",
  "selfCheckMs",
  "finalRefineMs",
  "userRounds",
  "refinementTurns",
  "roughWords",
  "refinedWords",
  "formattedWords",
  "triggeredRuleIds",
  "selectedFragmentCount",
  "selfCheckParsedOk",
  "selfCheckFailOpen",
  "finalParsedOk",
  "finalUsedRawFallback",
  "hitTurnCap",
];

const METRICS_CHAT_COLUMNS = [
  "siteId",
  "dialogueState",
  "messageCount",
  "characterCount",
  "outcomeType",
  "readMs",
  "summarizeMs",
  "readFailed",
];

const METRICS_INJECTION_COLUMNS = ["siteId", "ok", "reason", "applyMs", "promptChars"];

const metricsRunRecords = [];
const metricsChatRecords = [];
const metricsInjectionRecords = [];

let metricsNextRunId = 1;
// True once this panel has created its first refinement session. Used only to
// label the first LanguageModel.create() as a "cold start".
let metricsSessionCreatedSincePanelOpen = false;

// The run currently in progress (null when none). Only one run is tracked at a
// time; starting a new run discards an unfinished one.
let metricsCurrentRun = null;
let metricsRunStartedAt = 0;
let metricsRunModelMs = 0;

// ---------- small helpers ----------

function metricsNow() {
  return METRICS_ENABLED ? performance.now() : 0;
}

function metricsRound(value) {
  return Math.round(value * 10) / 10;
}

// Words = chunks separated by whitespace. Only the count is kept, never the text.
function metricsCountWords(text) {
  if (typeof text !== "string") return 0;
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function metricsIsObject(value) {
  return value !== null && typeof value === "object";
}

// ---------- run records (one per Refine / Refine Again, up to Prompt Ready) ----------

function metricsStartRun(siteId, refineAgain, roughText) {
  if (!METRICS_ENABLED) return;
  metricsRunStartedAt = performance.now();
  metricsRunModelMs = 0;
  metricsCurrentRun = {
    runId: null,
    siteId: siteId,
    refineAgain: Boolean(refineAgain),
    wallMs: null,
    modelMs: null,
    sessionCreateMs: null,
    coldStart: false,
    selfCheckMs: [],
    finalRefineMs: null,
    userRounds: null,
    refinementTurns: null,
    roughWords: metricsCountWords(roughText),
    refinedWords: null,
    formattedWords: null,
    triggeredRuleIds: [],
    selectedFragmentCount: null,
    selfCheckParsedOk: null,
    selfCheckFailOpen: null,
    finalParsedOk: null,
    finalUsedRawFallback: null,
    hitTurnCap: false,
  };
}

// Merge simple fields into the current run. Arrays are copied so later changes
// elsewhere cannot alter the record.
function metricsRunSet(fields) {
  if (!METRICS_ENABLED || !metricsCurrentRun) return;
  for (const [key, value] of Object.entries(fields)) {
    metricsCurrentRun[key] = Array.isArray(value) ? [...value] : value;
  }
}

function metricsRecordSessionCreate(ms) {
  if (!METRICS_ENABLED || !metricsCurrentRun) return;
  metricsCurrentRun.sessionCreateMs = metricsRound(ms);
  metricsCurrentRun.coldStart = !metricsSessionCreatedSincePanelOpen;
  metricsSessionCreatedSincePanelOpen = true;
}

// One self-check prompt() call. A run can contain several of these.
function metricsRecordSelfCheck(ms) {
  if (!METRICS_ENABLED || !metricsCurrentRun) return;
  metricsRunModelMs += ms;
  metricsCurrentRun.selfCheckMs.push(metricsRound(ms));
}

// What tryParseJson returned for one self-check call. Across several calls in
// one run: parsedOk is true only if every call parsed; failOpen is true if any
// call fell through as "sufficient" because the JSON was junk.
function metricsRecordSelfCheckParse(parsedValue) {
  if (!METRICS_ENABLED || !metricsCurrentRun) return;
  const parsedOk = metricsIsObject(parsedValue);
  const run = metricsCurrentRun;
  run.selfCheckParsedOk = run.selfCheckParsedOk === null ? parsedOk : run.selfCheckParsedOk && parsedOk;
  run.selfCheckFailOpen = Boolean(run.selfCheckFailOpen) || !parsedOk;
}

function metricsRecordFinalRefine(ms) {
  if (!METRICS_ENABLED || !metricsCurrentRun) return;
  metricsRunModelMs += ms;
  metricsCurrentRun.finalRefineMs = metricsRound(ms);
}

function metricsFinishRun(refinedText, formattedText) {
  if (!METRICS_ENABLED || !metricsCurrentRun) return;
  const record = metricsCurrentRun;
  record.runId = metricsNextRunId;
  metricsNextRunId += 1;
  record.wallMs = metricsRound(performance.now() - metricsRunStartedAt);
  record.modelMs = metricsRound(metricsRunModelMs);
  record.refinedWords = metricsCountWords(refinedText);
  record.formattedWords = metricsCountWords(formattedText);
  metricsRunRecords.push(record);
  metricsCurrentRun = null;
  console.table(metricsRunRecords);
}

// ---------- chat-context records (one per completed refreshChatContext) ----------

// Takes the dialogue and context objects but keeps only counts and type labels.
function metricsRecordChatContext(siteId, dialogue, context, readMs, summarizeMs) {
  if (!METRICS_ENABLED) return;
  const messages = dialogue && Array.isArray(dialogue.messages) ? dialogue.messages : [];
  let characterCount = 0;
  for (const message of messages) {
    characterCount += typeof message.text === "string" ? message.text.length : 0;
  }
  metricsChatRecords.push({
    siteId: siteId,
    dialogueState: dialogue && dialogue.state ? dialogue.state : "",
    messageCount: messages.length,
    characterCount: characterCount,
    outcomeType: context && context.type ? context.type : "",
    readMs: metricsRound(readMs),
    summarizeMs: metricsRound(summarizeMs),
    readFailed: Boolean(dialogue && dialogue.reason),
  });
}

// ---------- injection records (one per Apply Prompt click) ----------

function metricsRecordInjection(siteId, ok, reason, applyMs, promptChars) {
  if (!METRICS_ENABLED) return;
  metricsInjectionRecords.push({
    siteId: siteId,
    ok: Boolean(ok),
    reason: ok ? "" : String(reason || ""),
    applyMs: metricsRound(applyMs),
    promptChars: promptChars,
  });
}

// ---------- export ----------

function metricsCsvCell(value) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join(";") : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function metricsAllColumns() {
  const columns = ["recordType"];
  for (const list of [METRICS_RUN_COLUMNS, METRICS_CHAT_COLUMNS, METRICS_INJECTION_COLUMNS]) {
    for (const column of list) {
      if (!columns.includes(column)) columns.push(column);
    }
  }
  return columns;
}

// Returns { json, csv }. The CSV is one table: a recordType column ("run",
// "chatContext", "injection") says which kind each row is, and columns that
// do not apply to a row are left empty. Array values are joined with ";".
function exportMetrics() {
  if (!METRICS_ENABLED) return { json: "", csv: "" };

  const json = JSON.stringify(
    {
      runs: metricsRunRecords,
      chatContext: metricsChatRecords,
      injection: metricsInjectionRecords,
    },
    null,
    2
  );

  const columns = metricsAllColumns();
  const rows = [
    ...metricsRunRecords.map((record) => ({ recordType: "run", ...record })),
    ...metricsChatRecords.map((record) => ({ recordType: "chatContext", ...record })),
    ...metricsInjectionRecords.map((record) => ({ recordType: "injection", ...record })),
  ];
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => metricsCsvCell(row[column])).join(","));
  }

  return { json, csv: lines.join("\r\n") };
}

function metricsRowCount() {
  if (!METRICS_ENABLED) return 0;
  return metricsRunRecords.length + metricsChatRecords.length + metricsInjectionRecords.length;
}

function metricsClear() {
  if (!METRICS_ENABLED) return;
  metricsRunRecords.length = 0;
  metricsChatRecords.length = 0;
  metricsInjectionRecords.length = 0;
}

// Puts the CSV on the clipboard. Tries the normal clipboard API first (works
// right after a button click), then an older textarea fallback.
async function metricsCopyCsvToClipboard() {
  if (!METRICS_ENABLED) return { ok: false, rows: 0 };
  const rows = metricsRowCount();
  const { csv } = exportMetrics();
  try {
    await navigator.clipboard.writeText(csv);
    return { ok: true, rows };
  } catch (err) {
    try {
      const helper = document.createElement("textarea");
      helper.value = csv;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand("copy");
      helper.remove();
      return { ok: copied, rows };
    } catch (fallbackErr) {
      return { ok: false, rows };
    }
  }
}
