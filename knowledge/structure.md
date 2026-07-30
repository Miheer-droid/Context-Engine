# Prompt Anatomy & Organization

> Purpose: Defines the standard components of a prompt and how to order them.
> Load: When assembling or restructuring a prompt.
> See also: templates.md for ready-made skeletons.

## Components
| Component | Required? | Purpose |
|---|---|---|
| Task | Always | The imperative instruction plus action verb |
| Format | Always | Length, structure, style of the output |
| Context | When it affects output | Background, audience, domain, constraints, prior decisions |
| Reference material | When input data exists | Text/document the model should operate on |
| Role / Persona | Optional | Expertise framing that shapes tone and depth |
| Examples | When format is pattern-sensitive | 2-5 input/output pairs |
| Success criteria | For complex or ambiguous tasks | What "done" looks like |

## Ordering Rules
1. **Reference material first.** If the prompt includes a long document or scraped page, place it before the instruction. Models attend to instructions more reliably when they trail the data the instruction applies to.
2. **Critical constraints early.** Models weight the beginning and end of a prompt more heavily than the middle (attention decay over long context is a general transformer property, not a single vendor's quirk). Put non-negotiable constraints in the first third of the prompt, not buried mid-paragraph.
3. **Query last.** End with the specific ask, after all supporting material has been presented.

## Separating Mixed Content
When a prompt mixes several content types (instructions + reference text + examples), wrap each type in a clearly labeled block (tags, headers, or a labeled section) so the model doesn't confuse instruction with data. Use consistent labels within a session (e.g., always `TASK:`, `CONTEXT:`, `REFERENCE:`) rather than inventing new ones each time.

## Minimal Viable Prompt
Not every component is needed every time. The floor is Task + Format. Add Context, Reference material, Role, or Examples only when they would change the output.
