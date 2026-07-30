# Generic Templates

> Purpose: Ready-to-fill, model-agnostic prompt skeletons, composed from the components defined in structure.md.
> Load: When assembling a final prompt, after core.md and patterns.md checks pass.

## Template 1 — Minimal (Task + Format)
Use for simple, single-step requests.
```
Task: [precise verb + what to produce]
Format: [length, structure, style]
```

## Template 2 — Standard (Role + Task + Context + Format)
Use for most everyday requests.
```
Role: [expert identity, optional]
Task: [precise verb + what to produce]
Context: [audience, domain, background, constraints]
Format: [length, structure, style]
```

## Template 3 — Grounded Reference
Use when reference material (scraped page, document) is attached. Reference material goes first — see structure.md ordering rules.
```
Reference material:
[pasted or attached content]

Task: [precise verb + what to produce, referencing the material above]
Grounding: Base your answer only on the material above. If it doesn't contain
the answer, say so. Do not add outside information.
Format: [length, structure, style]
```

## Template 4 — Step-by-Step Reasoning
Use for logic, comparison, debugging, or multi-step analysis.
```
Task: [precise verb + what to produce]
Context: [relevant background]
Instruction: Think through this step by step before giving your final answer.
Format: [length, structure, style]
```

## Template 5 — Few-Shot
Use when output must follow a specific pattern.
```
Task: [precise verb + what to produce]
Example 1:
  Input: [...]
  Output: [...]
Example 2:
  Input: [...]
  Output: [...]
Now produce the output for:
Input: [actual input]
```

## Choosing a Template
| If the prompt has... | Use |
|---|---|
| Nothing but a simple ask | Template 1 |
| Audience, domain, or constraints | Template 2 |
| A scraped page or document | Template 3 |
| Logic, math, or comparison | Template 4 |
| A specific output pattern to match | Template 5 |
