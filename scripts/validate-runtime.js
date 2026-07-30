#!/usr/bin/env node
/**
 * validate-runtime.js
 *
 * Consistency check for the hand-mirrored runtime layer (runtime/rules.json,
 * runtime/fragments.json). It does NOT parse the markdown in knowledge/ — the
 * project deliberately keeps runtime/ hand-authored for now (see
 * knowledge/SKILL.md, "Keeping runtime/ in Sync"). This script only catches
 * broken cross-references and missing required fields, which is the failure
 * mode manual sync is actually prone to.
 *
 * Usage:  node scripts/validate-runtime.js
 * Exit code 0 = all checks passed. Exit code 1 = at least one check failed.
 *
 * No npm dependencies. Uses only Node's built-in fs/path modules.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const RULES_PATH = path.join(ROOT, "runtime", "rules.json");
const FRAGMENTS_PATH = path.join(ROOT, "runtime", "fragments.json");
const KNOWLEDGE_DIR = path.join(ROOT, "knowledge");

const errors = [];
const warnings = [];

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`${label}: file not found at ${filePath}`);
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    errors.push(`${label}: invalid JSON — ${err.message}`);
    return null;
  }
}

function checkSourceFile(sourceFile, context) {
  if (!sourceFile) {
    errors.push(`${context}: missing "sourceFile" field`);
    return;
  }
  // sourceFile is written relative to the extension root, e.g. "knowledge/core.md"
  const resolved = path.join(ROOT, sourceFile);
  if (!fs.existsSync(resolved)) {
    errors.push(`${context}: sourceFile "${sourceFile}" does not exist`);
  }
}

const rulesDoc = readJson(RULES_PATH, "runtime/rules.json");
const fragmentsDoc = readJson(FRAGMENTS_PATH, "runtime/fragments.json");

if (rulesDoc && fragmentsDoc) {
  const rules = rulesDoc.rules || {};
  const fragments = fragmentsDoc.fragments || {};
  const fragmentIds = new Set(Object.keys(fragments));
  const ruleIds = new Set(Object.keys(rules));

  const REQUIRED_RULE_FIELDS = ["description", "sourceFile", "detect", "fragmentId"];
  const REQUIRED_DETECT_TYPES = new Set([
    "verbAbsence",
    "regex",
    "keywordAbsence",
    "keywordPresence",
    "keywordPresenceWithoutPhrase",
  ]);
  const REQUIRED_FRAGMENT_FIELDS = ["text", "sourceFile", "triggeredBy"];

  // --- Validate each rule ---
  for (const [ruleId, rule] of Object.entries(rules)) {
    for (const field of REQUIRED_RULE_FIELDS) {
      if (!(field in rule)) {
        errors.push(`rule "${ruleId}": missing required field "${field}"`);
      }
    }

    if (rule.detect && !REQUIRED_DETECT_TYPES.has(rule.detect.type)) {
      errors.push(
        `rule "${ruleId}": unknown detect.type "${rule.detect.type}" (expected one of: ${[...REQUIRED_DETECT_TYPES].join(", ")})`
      );
    }

    if (rule.detect && rule.detect.type === "regex") {
      try {
        new RegExp(rule.detect.pattern, rule.detect.flags || "");
      } catch (err) {
        errors.push(`rule "${ruleId}": invalid regex pattern — ${err.message}`);
      }
    }

    if (rule.fragmentId && !fragmentIds.has(rule.fragmentId)) {
      errors.push(
        `rule "${ruleId}": fragmentId "${rule.fragmentId}" has no matching entry in runtime/fragments.json`
      );
    }

    if (rule.sourceFile) {
      checkSourceFile(rule.sourceFile, `rule "${ruleId}"`);
    }
  }

  // --- Validate each fragment ---
  for (const [fragmentId, fragment] of Object.entries(fragments)) {
    for (const field of REQUIRED_FRAGMENT_FIELDS) {
      if (!(field in fragment)) {
        errors.push(`fragment "${fragmentId}": missing required field "${field}"`);
      }
    }

    if (fragment.sourceFile) {
      checkSourceFile(fragment.sourceFile, `fragment "${fragmentId}"`);
    }

    if (Array.isArray(fragment.triggeredBy)) {
      for (const trigger of fragment.triggeredBy) {
        const isContextFlag = trigger.startsWith("context:");
        const isManual = trigger === "manual";
        if (!isContextFlag && !isManual && !ruleIds.has(trigger)) {
          warnings.push(
            `fragment "${fragmentId}": triggeredBy "${trigger}" does not match any rule id in runtime/rules.json (ok if this is intentional, but double-check for a typo)`
          );
        }
      }
    }
  }

  // --- Flag fragments no rule points to (dead weight, not necessarily wrong) ---
  const referencedFragmentIds = new Set(Object.values(rules).map((r) => r.fragmentId));
  for (const fragmentId of fragmentIds) {
    const fragment = fragments[fragmentId];
    const triggeredByContextOrManual =
      Array.isArray(fragment.triggeredBy) &&
      fragment.triggeredBy.some((t) => t.startsWith("context:") || t === "manual");
    if (!referencedFragmentIds.has(fragmentId) && !triggeredByContextOrManual) {
      warnings.push(`fragment "${fragmentId}": no rule references it, and it has no context/manual trigger — check for a stale entry`);
    }
  }
}

// --- Report ---
console.log(`Checked: ${RULES_PATH}`);
console.log(`Checked: ${FRAGMENTS_PATH}`);
console.log(`Knowledge source dir: ${KNOWLEDGE_DIR}\n`);

if (warnings.length) {
  console.log(`${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  - ${w}`);
  console.log("");
}

if (errors.length) {
  console.log(`${errors.length} error(s):`);
  for (const e of errors) console.log(`  - ${e}`);
  console.log("\nFAIL");
  process.exit(1);
} else {
  console.log("PASS — runtime/rules.json and runtime/fragments.json are internally consistent.");
  process.exit(0);
}
