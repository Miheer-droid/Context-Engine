# Core Principles

> Purpose: Foundational mental model for evaluating and improving any prompt, regardless of target model.
> Load: Always — first file loaded in every refinement pass.

## 1. Task Verb Is Mandatory
Every prompt must contain an explicit action verb describing the operation (draft, summarize, compare, classify, rewrite, explain...). A prompt without one ("help with my email") is incomplete. The missing verb is the first thing to fix.

## 2. One Task Per Prompt
A prompt that bundles two distinct operations ("explain and rewrite this") produces weaker results on both. Split multi-task requests into sequential prompts.

## 3. Specific Beats Vague, Not Long
Concise and specific are not opposites. Replace vague adjectives ("better", "professional", "engaging") with concrete, checkable descriptors ("under 150 words", "no jargon", "formal register, no contractions"). Avoid unnecessary jargon.

## 4. Context Changes Output Quality
State the "why" behind a request, not just the "what". A model that understands the goal generalizes better to edge cases than one given only a literal instruction. Supply audience, domain, prior decisions, and constraints the model cannot infer on its own.

## 5. Define "Done"
Give a success criterion, ideally binary or checkable ("done when X holds"), not an open-ended aspiration ("make it good").

## 6. Specify Format Explicitly
Never leave length, structure, or style implicit, even when it feels obvious from context.

## 7. Treat the First Output as a Draft
Prompting is iterative. A single "perfect" mega-prompt is usually worse than a good first prompt followed by a targeted follow-up ("make this more concise", "add X"). Design for a short refinement loop, not one-shot perfection.

## 8. Show Format, Don't Just Describe It
When output must follow a specific pattern (schema, tone, structure), 2-5 well-chosen examples steer the model more reliably than a prose description of the pattern. See techniques.md.

## 9. Ground Claims in Provided Material
If reference material (a document, a scraped page, prior conversation) is available, instruct the model to rely on it and to flag uncertainty rather than invent. See grounding.md.
