# Context Engine

> An AI-powered browser extension that transforms simple prompts into structured, context-aware prompts before they are sent to an LLM.

Context Engine acts as an intelligent prompt refinement layer between the user and AI models. Instead of replacing the model, it improves the quality of prompts using a modular knowledge base, runtime rules, and reusable prompt structures.

The goal is to make better prompting automatic—without requiring users to become prompt engineering experts.

---

## Current implementation status

The extension currently supports Claude, ChatGPT, Gemini, and Grok. It asks guided clarification questions locally through Gemini Nano, then previews a refined prompt before insertion. The finished prompt is wire-formatted for the active site: XML tags for Claude, Markdown headings for ChatGPT and Gemini, and plain labels for Grok.

For an existing supported chat, the extension first displays that it is checking the conversation. A short continuous chat is summarized locally into one sentence and supplied to the refiner as context; a fresh chat follows the normal refinement flow; a complex history asks the user to state the next task rather than guessing.

Apply Prompt inserts the complete multiline preview into the target composer and dispatches input events. It never submits the message; the user always reviews and sends it manually. There is no cloud service, persistent storage, or reference-tab scraper in this MVP.

---

# Features

- Prompt refinement before submission
- Context-aware prompt enhancement
- Modular knowledge system
- Runtime rule engine
- Structured prompt templates
- Lightweight browser extension architecture
- Works with ChatGPT, Claude, Gemini, and Grok
- One-click "Apply Prompt" directly into the target site's chat box (user still sends manually)

---

# Why Context Engine?

Most users ask AI models vague or incomplete questions.

**Before**

```
write a cover letter
```

The panel asks one question: *What specific job are you applying for?* The user answers: *Junior data analyst role at a logistics company. I have a statistics degree, SQL and Python skills, and one internship where I built dashboards.*

**After Context Engine** (site format)

```
## Task

Write a cover letter for a Junior Data Analyst role at a logistics company. I have a statistics degree, SQL and Python skills, and one internship where I built dashboards.
```

The AI model stays the same. The refined prompt carries the user's details, so the answer is more specific and more personal.

---

# Screenshots

The examples use a supported site and an unsupported site (Google Flow). The panel screenshots show the panel page opened in a browser tab.

## How the prompt improved

Blue is what the user's answer added. Grey is the site format.

![How the rough prompt became the refined prompt](screenshots/11-prompt-improvement.png)

## The panel in use

The panel asks its question and the user types an answer.

![The panel asks what job the cover letter is for](screenshots/06-cover-letter-question.png)

The Prompt Ready card shows a summary and the refined prompt in the format of the active site.

![Prompt Ready card with the refined prompt](screenshots/07-cover-letter-prompt-ready.png)

Apply Prompt puts the text in the site's input box. The user presses Enter to send it.

![The refined prompt in the site's input box](screenshots/08-cover-letter-applied.png)

## How the answer improved

The rough prompt gives a generic template with an invented name, invented contact details and blanks for the job, the experience and the achievements.

![The AI's answer to the rough prompt](screenshots/09-cover-letter-rough-answer.png)

The refined prompt gives a letter about the data analyst role, the logistics setting, the statistics degree, SQL, Python and the dashboards. The name, address and company are blanks because the user never gave them. The AI also adds achievements the user never mentioned, so the letter still needs checking.

![The AI's answer to the refined prompt](screenshots/10-cover-letter-refined-answer.png)

## More examples

| Case | What the refiner changed | AI's answer |
|------|--------------------------|-------------|
| `plan a trip to Japan` | Asked about the budget. The reply added 10 days, April, two travellers and an interest in food and temples. The refined prompt is one short request that holds all of these. | Rough: a general 10 to 14 day route and a question about dates. Refined: a 10-day plan for two in April, built around food and temples, with costs. |

## An unsupported site

On a site that is not Claude, ChatGPT, Gemini or Grok, the panel shows "Unsupported site" and uses a generic prompt structure. Refinement still works, but Apply Prompt does not insert text into the page, and no chat context is read.

![The side panel on an unsupported site (Google Flow)](screenshots/01-unsupported-site.png)

---

# Compared with asking an AI directly

Another way to improve a prompt is to ask a cloud AI assistant: "improve this prompt". The same two rough prompts were tried that way, once alone and once with the details the user gave the panel.

**Where Context Engine does better**

- It asks one question and uses only the user's words. Nothing is left to fill in.
- Asked "improve this prompt: write a cover letter", the assistant gave several options full of blanks (job title, company name, a pasted job description). With the details added, it still left blanks and added things the user never said: Tableau and Power BI, executive dashboards and a word limit.
- It runs on the device, so the user's background is not sent to a cloud service for the rewrite. The final prompt still goes to the chat site when the user sends it.
- The prompt is formatted for the site and inserted with one click.

![The AI's reply when asked to improve "write a cover letter"](screenshots/12-ai-improve-prompt-reply.png)

**Where it falls short**

- Gemini Nano is a small model. The refined prompt mostly joins the user's details and adds little structure, such as a role or an output format.
- For the trip plan, the assistant's improved prompt was better: a role, trip parameters, a budget definition, a route and priorities, with no blanks.
- The panel's question is often generic. When the user already knows the details, asking a large assistant directly gives a richer prompt.
- For the cover letter, the answers to both kinds of prompt were close. The panel saves effort and keeps details private. It does not give a better final answer.

---

# Known issues

- The small model can still add details the user never gave, even though its instructions forbid it.
- The same input can give different refined prompts.

---

# Project Goals

The project is designed around five principles:

- Improve prompts without changing user intent.
- Remain model-agnostic.
- Keep prompting knowledge modular and maintainable.
- Make refinement deterministic where possible.
- Separate project knowledge from runtime behavior.

---

# Architecture

```
User Prompt
      │
      ▼
Prompt Detector
      │
      ▼
Context Engine
      │
 ┌───────────────┐
 │ Knowledge Base│
 └───────────────┘
      │
      ▼
Runtime Rules
      │
      ▼
Prompt Refiner
      │
      ▼
Enhanced Prompt
      │
      ▼
Preview Card (user reviews summary + full prompt)
      │
      ▼
Apply Prompt (injector.js clears + inserts into target site's input)
      │
      ▼
Target LLM (user presses Enter manually — never auto-sent)
```

---

# Folder Structure

```
context-engine/

README.md                # Human documentation
Project_Context.md       # AI project context
LICENSE                  # MIT License

background.js
detector.js
refiner.js
injector.js
template-engine.js
dom-reader.js
summarizer.js
metrics.js
manifest.json

sidepanel.html
sidepanel.css
sidepanel.js

knowledge/
runtime/
data/
scripts/
screenshots/
```

---

# Directory Overview

## knowledge/

Contains the reusable knowledge used during prompt refinement.

This folder is intentionally modular.

| File | Purpose |
|-------|---------|
| core.md | Core prompting principles |
| grounding.md | Hallucination reduction and factual grounding |
| patterns.md | Common prompt design patterns |
| structure.md | Response organization techniques |
| techniques.md | Prompt engineering methods |
| templates.md | Reusable prompt templates |
| SKILL.md | Entry point that links the knowledge pack |
| README.md | Documentation for the knowledge system |

---

## runtime/

Contains runtime configuration used while refining prompts.

Typical contents include:

- refinement rules
- prompt fragments
- validation logic

Unlike the knowledge folder, runtime files are machine-readable.

---

## data/

Static datasets used by the extension.

Current examples include reusable prompt structures and metadata.

---

## scripts/

Development utilities.

Currently contains validation scripts for runtime configuration.

---

## screenshots/

Images used in this README.

---

# Built-in metrics (optional)

The side panel includes an optional measurement layer, `metrics.js`, used to evaluate the extension. It keeps timings, counts and true/false flags in memory only. It never records prompt, answer or chat text, nothing is written to disk, and closing the side panel clears it.

The panel's Metrics section has **Copy metrics** (puts a CSV on the clipboard) and **Clear metrics**. To turn the layer off and hide those buttons, set `METRICS_ENABLED = false` at the top of `metrics.js`.

---

# Design Philosophy

Context Engine separates knowledge into three independent layers.

## 1. Knowledge

Reusable prompt engineering concepts.

These files answer:

> *How should prompts be written?*

---

## 2. Runtime

Execution rules.

These determine:

- when refinement happens
- how fragments are combined
- refinement constraints

---

## 3. Project Context

Long-term architectural knowledge for AI assistants.

Unlike the README, this file is intended for AI coding assistants and documents:

- architecture decisions
- design principles
- coding conventions
- future plans
- project constraints

---

# Development Workflow

1. Detect the user's prompt.
2. Analyze its intent.
3. Retrieve relevant knowledge.
4. Apply runtime rules.
5. Build a refined prompt through a guided question-and-answer loop.
6. Show the user a preview card (summary + full refined prompt).
7. On "Apply Prompt", insert the refined prompt directly into the detected site's chat input — the user still presses Enter themselves.

---

# Technology Stack

- JavaScript
- HTML
- CSS
- Browser Extension APIs
- JSON configuration
- Markdown knowledge base

---

# Project Status

Current focus:

- Modular knowledge architecture
- Runtime refinement engine
- Prompt quality improvements
- Browser extension integration
- Direct prompt injection into the target site (no manual copy-paste)

Future plans may include:

- domain-specific knowledge packs
- custom refinement profiles
- user-defined templates
- evaluation metrics
- plugin architecture

---

# Feedback & Discussions

Feedback and ideas for improvement are welcome.

- **Questions, ideas, and general feedback:** [GitHub Discussions](https://github.com/Miheer-droid/Context-Engine/discussions)
- **Bug reports:** [GitHub Issues](https://github.com/Miheer-droid/Context-Engine/issues)

---

# Contributing

Contributions are welcome.

When contributing:

- Keep knowledge modular.
- Avoid duplicate concepts.
- Prefer reusable prompt patterns.
- Maintain clear separation between knowledge and runtime.
- Document architectural changes in `Project_Context.md`.

---

# Documentation

| File | Audience |
|------|----------|
| README.md | Developers and contributors |
| Project_Context.md | AI coding assistants |
| knowledge/README.md | Knowledge pack documentation |
| knowledge/SKILL.md | Knowledge entry point |

---

## System Requirements & Limitations

Context-Engine's refinement runs through Chrome's built-in Gemini Nano model. Before installing, check that your machine meets Chrome's requirements for it:

- **Free disk space:** 22 GB+ on the volume holding your Chrome profile (the model is deleted again if free space drops below 10 GB)
- **GPU:** more than 4 GB VRAM, **or**
- **CPU fallback:** 16 GB+ RAM and 4+ CPU cores if there's no qualifying GPU
- **Network:** an unmetered connection (Wi-Fi/ethernet) for the one-time model download — cellular/hotspot won't trigger it
- **OS:** Windows 10/11, macOS 13+, or Linux
- **Chrome:** a recent official Chrome build (not a Linux-distro Chromium repackage)

Other current limitations:

- Desktop Chrome only
- English only
- Supported sites are claude.ai, chatgpt.com, gemini.google.com, and grok.com. These sites change their layouts often, so "Apply Prompt" may stop finding the input box until the selectors in `injector.js` are updated
- Refinement is capped at 5 model calls per session
- Very long chats are not summarized; the extension asks you to describe your next task instead
- No reference-tab scraper in this MVP

If your device doesn't meet the hardware requirements, the side panel's on-device AI status will read:

![Gemini Nano unavailable on this device](screenshots/gemini-nano-unavailable-status.png)

This is a Chrome platform limit, not a bug in the extension — there is currently no workaround or fallback engine for devices below this bar.

---

## Installation (from GitHub, no Chrome Web Store listing)

1. Download the code: either click **Code → Download ZIP** on the repo page, or download the latest ZIP from the [Releases](https://github.com/Miheer-droid/Context-Engine/releases) page. Extract it.
2. Go to `chrome://extensions`.
3. Toggle **Developer mode** on, top-right corner.
4. Click **Load unpacked** and select the extracted folder that directly contains `manifest.json`.

   ![chrome://extensions steps: navigate to the URL, enable Developer mode, click Load unpacked](screenshots/chrome-extensions-steps.png)

5. The Context-Engine card appears.
6. Visit a supported site (`claude.ai`, `chatgpt.com`, `gemini.google.com`, or `grok.com`) and click the Context-Engine toolbar icon to open the side panel.
7. The panel checks Gemini Nano's status and downloads it if needed. This can take several minutes on Wi-Fi/ethernet the first time.

---

## Resetting Gemini Nano (optional, for testing only)

This deletes Chrome's downloaded on-device model. It affects your whole Chrome browser, not just this extension, and requires Chrome to be fully closed first (check Task Manager for any leftover `chrome.exe` processes).

```powershell
$modelPath = "$env:LOCALAPPDATA\Google\Chrome\User Data\OptGuideOnDeviceModel"
```
Stores the model folder's path in a variable so you don't have to retype it in every command below.

```powershell
Test-Path $modelPath
```
Checks whether the model folder currently exists — `True` means it's present, `False` means it isn't.

```powershell
Get-ChildItem $modelPath -Recurse
```
Lists everything inside the folder, including the version-numbered subfolder and files like `weights.bin` — this is the actual model data.

```powershell
(Get-ChildItem $modelPath -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB
```
Adds up the size of every file inside and shows the total in GB — confirms how much is actually downloaded (should be a few GB if present).

```powershell
Remove-Item $modelPath -Recurse -Force
```
Deletes the entire model folder and everything inside it. Chrome must be fully closed before running this.

```powershell
Test-Path $modelPath
```
Run again after deleting — should now return `False`, confirming removal.

Reopen Chrome and visit the Context-Engine side panel on a supported site to trigger a fresh download.

---

## License

Released under the [MIT License](LICENSE).

---

## Vision

Context-Engine aims to make high-quality prompting accessible to everyone by embedding prompt engineering best practices directly into the workflow, allowing users to focus on *what* they want to achieve instead of *how* to phrase it.
