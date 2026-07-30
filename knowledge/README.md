# Prompt Engineering Knowledge Pack

Model-agnostic prompt engineering principles for Context-Engine's refinement engine, distilled from:
- Anthropic's Claude prompting best practices guide
- OpenAI's ChatGPT prompt engineering best practices guide
- Google's Gemini for Workspace prompting guide (October 2024)

## Why This Exists
Context-Engine improves what the user is about to send to an LLM. Early direction leaned toward per-model rule sets (Claude rules, GPT rules, Gemini rules). That duplicates content that is actually shared across all three guides and locks the pack to whichever models happen to be popular today. This pack instead captures the principles that recur across all three sources — task clarity, context, format specification, iteration, grounding — so Gemini Nano can reason about any prompt, for any target, without a per-model lookup table.

Per-model or per-site formatting (XML tags for Claude, Markdown headers for ChatGPT, etc.) is intentionally not here — that lives in `data/prompt-structures.json`, consumed by `template-engine.js`. This pack informs content; that file governs wire format. Keeping the two separate is what lets this pack stay reusable if a new target model appears later — only `prompt-structures.json` needs a new entry, not this pack.

## This Folder Is Source of Truth, Not a Runtime Dependency
Gemini Nano's context window is small enough that pasting whole markdown files into a `session.prompt()` call is a real cost, and small models are more reliable following a short direct instruction than reasoning over documentation. So the checkable subset of this pack is hand-mirrored into `../runtime/rules.json` (deterministic, zero-model-call checks) and `../runtime/fragments.json` (short instruction strings), which is what `refiner.js` actually reads at runtime. See `SKILL.md` for the exact flow. If you edit a principle here that has a runtime counterpart, update the mirror by hand and run `node scripts/validate-runtime.js`.

## Structure
| File | Contains |
|---|---|
| SKILL.md | Entry point for whoever builds `refiner.js`: how the runtime flow uses `runtime/rules.json` + `runtime/fragments.json` |
| core.md | Foundational principles — the why |
| structure.md | Prompt anatomy and component ordering — the what |
| techniques.md | Specific steering techniques — the how |
| grounding.md | Anti-hallucination / grounding rules |
| patterns.md | Failure-pattern to fix diagnostic table |
| templates.md | Fillable, model-agnostic prompt skeletons |

## Maintenance Rules
- **Single source of truth.** A principle lives in exactly one file. If you're tempted to repeat something, link to it instead (e.g. "see grounding.md").
- **No model-specific advice**, unless it reflects something fundamental to how transformer-based LLMs process prompts in general (e.g. attention weighting toward the start and end of a context window) rather than a quirk of one vendor's model.
- **Keep files short.** Each file should stay skimmable in one pass.
- **Update by re-deriving, not appending.** When reviewing a new official guide, check whether it changes a principle already stated here before adding a new bullet. This avoids duplication drift between files.
- **Runtime mirrors are hand-kept, not generated (for now).** If `runtime/rules.json` or `runtime/fragments.json` ever drift out of sync with this folder, `scripts/validate-runtime.js` will catch broken cross-references, but it can't catch a principle that changed here without its mirror being updated — that part is on you.

## Source Guides Referenced
- Claude Platform Docs — Prompting best practices
- OpenAI — Prompt engineering best practices for ChatGPT
- Google Workspace — Gemini prompting guide 101 (October 2024)
- Structural inspiration only (not content): the Prompt Master skill's always-loaded-core-plus-on-demand-references layout and pattern-table format

## Placement in the Extension
This folder lives at the extension root as `knowledge/`, alongside three siblings:
- `runtime/` — generated/hand-mirrored JSON, read by `refiner.js` at runtime, never hand-authored from scratch
- `data/` — `prompt-structures.json`, the per-site wire-format lookup, a separate axis entirely
- `scripts/` — `validate-runtime.js`, a consistency check for the runtime mirror

`refiner.js` and `template-engine.js` are the two modules expected to read from this pack (indirectly, via `runtime/`), per the flow defined in `SKILL.md`.
