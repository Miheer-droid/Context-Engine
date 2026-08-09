# Context Engine

> An AI-powered browser extension that transforms simple prompts into structured, context-aware prompts before they are sent to any LLM.

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
- Model-agnostic design (works with any LLM)
- One-click "Apply Prompt" directly into the target site's chat box (user still sends manually)

---

# Why Context Engine?

Most users ask AI models vague or incomplete questions.

For example:

**Before**

```
Explain neural networks.
```

**After Context Engine**

```
Explain neural networks to a beginner.

Structure the response with:
- intuitive explanation
- real-world analogy
- simple mathematical intuition
- practical applications
- common misconceptions

Avoid unnecessary jargon unless defined.
```

The AI model remains exactly the same.

Only the prompt becomes significantly better.

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

background.js
detector.js
refiner.js
injector.js
template-engine.js
dom-reader.js
summarizer.js
manifest.json

sidepanel.html
sidepanel.css
sidepanel.js

knowledge/
runtime/
data/
scripts/
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

# License

Choose a license before public release (MIT is recommended for open-source projects).

---

## Vision

Context Engine aims to make high-quality prompting accessible to everyone by embedding prompt engineering best practices directly into the workflow, allowing users to focus on *what* they want to achieve instead of *how* to phrase it.
