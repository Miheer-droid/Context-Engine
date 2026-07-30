# Failure Patterns to Fixes

> Purpose: Diagnostic table for detecting and silently repairing common prompt weaknesses.
> Load: During the "is this prompt good enough" self-check pass.

## Task Patterns
| Pattern | Symptom | Fix |
|---|---|---|
| Vague verb | "help with my email" | Replace with the precise operation: "draft", "shorten", "make more formal" |
| Two tasks in one | "explain and rewrite this" | Split into two sequential prompts |
| No success criteria | "make it better" | Add a checkable definition of done |
| Emotional description | "this is a mess, fix it" | Extract the specific, concrete fault |
| Unbounded scope | "build the whole thing" | Decompose into ordered sub-tasks |

## Context Patterns
| Pattern | Symptom | Fix |
|---|---|---|
| Assumed shared history | "continue where we left off" | Restate the relevant prior decisions explicitly |
| Missing audience | "write something for users" | Name the audience and their knowledge level |
| Missing domain | "write a cover letter" | Add role, industry, relevant experience |
| Invites fabrication | "what do experts say about X" | Add a grounding constraint — see grounding.md |

## Format Patterns
| Pattern | Symptom | Fix |
|---|---|---|
| No output format | "explain this concept" | Add explicit structure and length |
| Implicit length | "write a summary" | State an exact length (sentences, words) |
| Vague aesthetic adjective | "make it professional" | Translate to concrete, measurable specs |
| No role for a specialized task | (blank) | Add a specific expert identity — see techniques.md |

## Reasoning Patterns
| Pattern | Symptom | Fix |
|---|---|---|
| No step-by-step for logic/math | "which option is better?" | Add: "think through this step by step before answering" |
| No verification step | Complex or high-stakes output | Add a self-check pass against stated criteria |

## Usage Note
Fix silently when the fix doesn't change user intent. Flag to the user as a clarifying question only when the missing information is genuinely unknowable from context — see SKILL.md for the clarifying-question cap.
