# Grounding & Hallucination Reduction

> Purpose: Rules that reduce fabricated facts, citations, or claims.
> Load: Whenever a prompt involves factual claims, citations, or attached reference material (scraped page, uploaded document, chat history).

## Core Rule
Never let a prompt implicitly invite invention. Any factual, citation, or reference-based task should carry an explicit accuracy constraint.

## Default Grounding Instruction
Append when the task is factual or citation-based:
"Use only information you are highly confident is accurate. If you are not certain, say so explicitly rather than guessing. Do not fabricate sources, quotes, or statistics."

## Scope Lock for Reference Material
When reference material is attached (scraped page, document, prior transcript), instruct the model to stay inside it:
"Base your answer only on the material provided below. Do not add outside information. If the provided material doesn't contain the answer, say so."

## Cite-Then-Conclude
For long-document analysis, ask the model to pull the relevant snippet or fact first, then reason from it. This anchors the answer to something checkable instead of a free-floating claim.

## Placeholder Fields Are Not Optional
If a prompt contains bracketed placeholders (e.g. `[industry]`, `[product]`), treat them as required inputs, not stylistic flourish. An unresolved placeholder is a missing-context failure — surface it as a clarifying question rather than letting the model silently invent a value.

## Red Flags That Invite Fabrication
- Open-ended appeals to authority ("what do experts say about X") — reframe with a verifiability constraint.
- Requests for exact quotes or statistics with no source attached — add the grounding instruction, or explicitly allow paraphrase only.
- Underspecified numeric or factual claims ("the market is worth billions") — ask for the number's source or mark it as illustrative only.
