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
   - Data Collection Layer: detector.js ✅ (hostname → site match) and dom-reader.js ✅ (reads the active supported chat through `chrome.scripting`, then reports fresh versus continuous dialogue). scraper.js is intentionally out of scope for this MVP because arbitrary reference tabs need broader host access.
   - Processing Layer: ai-availability.js logic (currently inline in sidepanel.js), refiner.js ✅ (guided Prompt API refinement), summarizer.js ✅ (one-sentence current-chat summary via the Summarizer API), template-engine.js ✅ (per-site wire formatting only).
   - Execution Layer: injector.js ✅ (uses chrome.scripting.executeScript to dispatch native input/change events into the target site's prompt box). Contenteditable prompts are inserted line by line so complete multiline prompts survive. Never sends Enter/submit; the user always presses Enter manually.
   - Storage Sandbox: plain in-memory JS variables (no separate file yet, trivial when needed)
   - Knowledge Layer (new): `knowledge/` (8 markdown files, source of truth for prompt-quality principles) → `runtime/rules.json` + `runtime/fragments.json` (hand-mirrored deterministic checks + instruction fragments, what `refiner.js` will actually read) → `scripts/validate-runtime.js` (consistency check, zero npm dependencies, run with `node scripts/validate-runtime.js`)
   - Data: `data/prompt-structures.json` ✅ built — per-site wire format only, separate axis from the Knowledge Layer above
   - Background: `background.js` — now just `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`. It previously held a dead, hand-duplicated copy of detector.js's site-matching logic that nothing called; removed. It also previously lacked this `setPanelBehavior` call, which meant clicking the toolbar icon didn't actually open the panel — fixed.
## Build order (6-step framework applied to this project)
1. ✅ Empty extension shell (manifest, sidepanel loads)
2. ✅ Site detection (detector.js — hostname → known site or "unsupported")
3. ✅ `prompt-structures.json` and `template-engine.js` — the finished refined prompt is wrapped just before preview/injection: XML tags for Claude, Markdown headings for ChatGPT/Gemini, and plain labels for Grok. Knowledge Layer (`knowledge/` + `runtime/` + `scripts/validate-runtime.js`) remains separate from this wire-format layer.
4. ✅ Gemini Nano availability check + download trigger (done, verified working)
5. ✅ Wire an actual `session.prompt()` call into the panel (`refiner.js` — guided refinement conversation). `refiner.js` runs deterministic runtime rules, includes only matching instruction fragments, asks one high-value clarification question at a time, and keeps one in-memory Prompt API session with a five-call cap.
6. — Reference-tab scraper (`scraper.js`) is out of scope for this MVP. It is not implemented and must not be added without revisiting host-permission requirements.
7. ✅ Continuous-chat history reader + Summarizer API (`dom-reader.js`, `summarizer.js`). The panel immediately reports that it is checking chat context; a fresh chat proceeds normally, a short continuous chat supplies a one-sentence local topic summary to refiner.js, and a complex history surfaces a clarifying prompt instead of guessing.
8. ✅ Preview/approval card + injector.js (paste into target site). After the self-check loop reports the prompt is sufficient, `refiner.js` produces a `{summary, refinedPrompt}` object; `sidepanel.js` renders it as a "Prompt Ready" card with Apply Prompt / Refine Again. Apply Prompt calls `injector.js`, which uses `chrome.scripting.executeScript` to clear and insert into the target site's prompt box (contenteditable via `execCommand`, plain `<textarea>` via the framework's native value setter). Never dispatches Enter or a submit event — the user always sends manually.
9. ⬜ In-memory session store wiring, confirm wipe-on-close
10. ⬜ End-to-end test pass across supported/unsupported sites
## Verified working on the developer's machine
- Chrome build supports the Prompt API.
- `chrome://on-device-internals` confirms: Device performance class = Very High, Gemini Nano downloaded and Ready.
- Extension's own sidepanel independently confirms `LanguageModel.availability()` → `"available"`.
- Files delivered so far: `manifest.json`, `background.js`, `detector.js`, `sidepanel.html`, `sidepanel.css`, `sidepanel.js`, `refiner.js`, `template-engine.js`, `dom-reader.js`, `summarizer.js`, `injector.js`, `knowledge/` (8 files), `runtime/rules.json`, `runtime/fragments.json`, `data/prompt-structures.json`, and `scripts/validate-runtime.js`. `scripts/validate-runtime.js` passes clean as of this update — run `node scripts/validate-runtime.js` from the extension root any time `runtime/*.json` is hand-edited. Existing host permissions cover only the supported AI sites; no broader permission is present or required by this MVP.
## Not yet built
No remaining module from the original MVP build order is planned. `scraper.js` remains deliberately absent. Remaining work is the in-memory-session verification and an end-to-end pass across supported and unsupported sites.
 
## Working style notes for future chats
- User is a "vibe coder" — explain technical steps in plain, simple terms (as if to a 10-year-old) before/alongside code.
- Always give complete, runnable files — no placeholder comments, no pseudocode.
- Always give exact local test steps (load unpacked, what to click, what output to expect).
- Only one project worked on at a time — this doc is Context-Engine only, do not mix with other project.
