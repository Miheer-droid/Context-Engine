---
name: prompt-engineering-knowledge-pack
version: 2.0.0
description: Universal, model-agnostic prompt engineering principles for Context-Engine's refiner.js, plus the deterministic rule/fragment layer distilled from them for runtime use.
---

# How Context-Engine Uses This Pack

## Audience
This file is written for whoever implements or maintains `refiner.js` — a human, or a future chat continuing this project. Gemini Nano does not read this pack directly at runtime: it has no file access, and its context window is small (on the order of a few thousand tokens, shared between input and output). "Load a file" has to be a decision made in JavaScript, not something the model does for itself. This file specifies that JavaScript-level decision. It replaces the earlier version of this file, which described a load order as if the model were browsing files — it wasn't going to.

## Two Kinds of Content, Two Consumers
- `core.md`, `structure.md`, `techniques.md`, `grounding.md`, `patterns.md`, `templates.md` — prose for humans. The source of truth for *why* a rule exists. Never pasted into a `session.prompt()` call wholesale.
- `../runtime/rules.json` and `../runtime/fragments.json` (sibling folder, not nested inside this one) — the distilled, machine-consumed mirror of the checkable subset of that prose. `refiner.js` reads only these two files at runtime, never the markdown.

## Runtime Flow (what refiner.js should do)
1. Run every entry in `runtime/rules.json` against the user's rough prompt text. These are cheap regex/keyword checks — no model call, no latency.
2. Collect the `fragmentId`s of any rules that fired, plus any context flags that apply (e.g. `context:hasReferenceMaterial` once scraper.js supplies reference text).
3. Look up the matching entries in `runtime/fragments.json` and concatenate only those short strings — not whole files — into the one `session.prompt()` call that does the actual generative refinement.
4. If a genuinely fuzzy judgment remains that no rule caught (e.g. "is this context actually sufficient"), that's the existing sufficient/missing self-check call from decision #1 in Project_Context.md — spend it on what the deterministic pass couldn't decide, not on what it already could.
5. Hand the assembled, model-agnostic prompt content to `template-engine.js`, which applies `data/prompt-structures.json`'s per-site wire format. Do not add XML tags, Markdown headers, or any site-specific syntax before that step.

## Keeping runtime/ in Sync
`runtime/rules.json` and `runtime/fragments.json` are hand-mirrored from this folder, not auto-generated — that's a deliberate MVP choice, not an oversight. When you change a checkable principle in `core.md`, `patterns.md`, or `grounding.md`, update the matching rule or fragment by hand, then run `node scripts/validate-runtime.js` to catch broken references before you ship. If the pack grows enough that manual sync becomes error-prone, that's the trigger to write a real markdown-parsing generator in `scripts/` — not before.

## Non-Goals
- No per-model tricks here. A genuinely universal technique belongs in this pack. A genuinely site-specific wire-format fact (XML tags vs. Markdown headers, etc.) belongs in `data/prompt-structures.json`, never here.
- This pack never answers the user's underlying question. Context-Engine only improves the prompt.

## Reference Files
| File | Purpose |
|---|---|
| [core.md](core.md) | Foundational principles |
| [structure.md](structure.md) | Prompt anatomy and ordering |
| [techniques.md](techniques.md) | Steering techniques |
| [grounding.md](grounding.md) | Anti-hallucination rules |
| [patterns.md](patterns.md) | Failure-pattern to fix table — source for `runtime/rules.json` |
| [templates.md](templates.md) | Fillable skeletons for final assembly |
| `../runtime/rules.json` | Deterministic checks, mirrors the checkable rows above |
| `../runtime/fragments.json` | Short instruction strings actually sent to Gemini Nano |
