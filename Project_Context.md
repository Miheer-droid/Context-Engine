# Context-Engine — Project Context (living doc)
 
## What this project is
A Chrome MV3 sidepanel extension that improves the user's prompt before they send it to ChatGPT/Claude/Gemini/Grok. It never answers the query itself — it only outputs a better-structured prompt for the user to paste elsewhere. Full spec lives in the "About Context-Engine" project file.
 
## Global constraints (apply to every decision)
- $0 cost: no paid APIs, no cloud hosting, no cloud DB.
- Fully local/on-device: uses Chrome's built-in Gemini Nano (Prompt API) for AI reasoning.
- Volatile memory only: everything lives in the sidepanel's JS memory, wiped on close. No chrome.storage, no IndexedDB.
- MVP scope: laptop-only presentation build. Not being published to the Chrome Web Store. No fallback engine needed for unsupported browsers/devices — only a clear status message.
## Key decisions made so far
1. **AI engine:** Gemini Nano only, via the `LanguageModel` global (Prompt API). Handles both jobs — drafting refinement questions AND judging when a prompt is "good enough" (via a self-check prompt asking for a structured sufficient/missing JSON response). Hard cap of ~5 refinement turns regardless, so the UI can't loop forever.
2. **No rule-based fallback engine.** If `LanguageModel.availability()` isn't `"available"`, the panel just shows a plain status message. This is intentional for a single-device MVP.
3. **Prompt-structure "database":** `data/prompt-structures.json` — ✅ now created. A static, hand-curated JSON file mapping site id (matching detector.js's `detectSite()` output) → target model's preferred wire format (Claude = XML-tag sections, ChatGPT = Markdown headers, unrecognized site = generic default). Manually updated from official docs, never fetched live. `sidepanel.js` already reads this file for its site-description UI text, so it's live-wired, not just sitting on disk unused.
3a. **Content-quality knowledge, kept separate from wire format:** `knowledge/` (universal prompt engineering principles, model-agnostic, 8 markdown files) is the human-editable source of truth for *what makes a prompt good*. It is deliberately not read by Gemini Nano directly at runtime — its context window is small (documented on the order of a few thousand tokens, shared between input and output), and small models are more reliable following a short direct instruction than reasoning over documentation. The checkable subset of `knowledge/` is hand-mirrored into `runtime/rules.json` (deterministic regex/keyword checks, zero model calls) and `runtime/fragments.json` (short instruction strings actually sent to Gemini Nano). `scripts/validate-runtime.js` checks the two runtime files stay internally consistent (broken cross-references, missing fields) — run it after hand-editing either one. See `knowledge/SKILL.md` for the exact intended flow once `refiner.js` exists.
4. **Correct Prompt API call shape** (avoids the DevTools warning about missing output language):
   ```js
   const MODEL_OPTIONS = {
     expectedInputs: [{ type: "text", languages: ["en"] }],
     expectedOutputs: [{ type: "text", languages: ["en"] }],
   };
   ```
5. Module breakdown locked in:
   - UI Layer: sidepanel.html/css, sidepanel.js (now also fetches `data/prompt-structures.json` for its site-description text — no more hardcoded duplicate of that text)
   - Data Collection Layer: detector.js ✅ (hostname → site match, built), dom-reader.js (continuous chat extraction, not built), scraper.js (reference tab scraping, 3000 char cap, not built)
   - Processing Layer: ai-availability.js logic (currently inline in sidepanel.js), refiner.js (not built — see `knowledge/SKILL.md` for its intended runtime flow once it exists), summarizer.js (not built), template-engine.js (not built)
   - Execution Layer: injector.js (not built) — dispatches native bubbling input event into target site's prompt box
   - Storage Sandbox: plain in-memory JS variables (no separate file yet, trivial when needed)
   - Knowledge Layer (new): `knowledge/` (8 markdown files, source of truth for prompt-quality principles) → `runtime/rules.json` + `runtime/fragments.json` (hand-mirrored deterministic checks + instruction fragments, what `refiner.js` will actually read) → `scripts/validate-runtime.js` (consistency check, zero npm dependencies, run with `node scripts/validate-runtime.js`)
   - Data: `data/prompt-structures.json` ✅ built — per-site wire format only, separate axis from the Knowledge Layer above
   - Background: `background.js` — now just `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`. It previously held a dead, hand-duplicated copy of detector.js's site-matching logic that nothing called; removed. It also previously lacked this `setPanelBehavior` call, which meant clicking the toolbar icon didn't actually open the panel — fixed.
## Build order (6-step framework applied to this project)
1. ✅ Empty extension shell (manifest, sidepanel loads)
2. ✅ Site detection (detector.js — hostname → known site or "unsupported")
3. 🟡 `prompt-structures.json` ✅ built and wired into sidepanel.js's UI text. `template-engine.js` itself — the module that will use this file to actually wrap an assembled prompt — is still not built. Knowledge Layer (`knowledge/` + `runtime/` + `scripts/validate-runtime.js`) also built ahead of schedule since it's an independent block, same reasoning as step 2.
4. ✅ Gemini Nano availability check + download trigger (done, verified working)
5. ✅ Wire an actual `session.prompt()` call into the panel (`refiner.js` — real refinement conversation). `refiner.js` runs the deterministic runtime rules, includes only their matching instruction fragments, and keeps one in-memory Prompt API session with a five-turn cap. The panel now accepts a rough prompt and displays the on-device refined result.
6. ⬜ Reference-tab scraper (scraper.js)
7. ⬜ Continuous-chat history reader + Summarizer API (dom-reader.js, summarizer.js)
8. ⬜ Preview/approval card + injector.js (paste into target site)
9. ⬜ In-memory session store wiring, confirm wipe-on-close
10. ⬜ End-to-end test pass across supported/unsupported sites
## Verified working on the developer's machine
- Chrome build supports the Prompt API.
- `chrome://on-device-internals` confirms: Device performance class = Very High, Gemini Nano downloaded and Ready.
- Extension's own sidepanel independently confirms `LanguageModel.availability()` → `"available"`.
- Files delivered so far: `manifest.json`, `background.js`, `detector.js`, `sidepanel.html`, `sidepanel.css`, `sidepanel.js`, `knowledge/` (8 files), `runtime/rules.json`, `runtime/fragments.json`, `data/prompt-structures.json`, `scripts/validate-runtime.js` (all in the `context-engine/` folder the user is running locally). `scripts/validate-runtime.js` passes clean as of this update — run `node scripts/validate-runtime.js` from the extension root any time `runtime/*.json` is hand-edited.
## Not yet built
`template-engine.js`, `dom-reader.js`, `scraper.js`, `summarizer.js`, `injector.js` — steps 6 through 8 above. Next planned step: `scraper.js` (step 6).
 
## Working style notes for future chats
- User is a "vibe coder" — explain technical steps in plain, simple terms (as if to a 10-year-old) before/alongside code.
- Always give complete, runnable files — no placeholder comments, no pseudocode.
- Always give exact local test steps (load unpacked, what to click, what output to expect).
- Only one project worked on at a time — this doc is Context-Engine only, do not mix with the Repo-Graph project.
