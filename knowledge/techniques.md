# Techniques

> Purpose: Specific, reusable steering techniques. Apply selectively based on task type — not every technique applies to every prompt.
> Load: When a task needs more than the minimal Task + Format prompt.

## Role Assignment
Assign a specific expert identity for specialized or complex tasks. Specific beats generic.
- Weak: "You are a helpful assistant."
- Strong: "You are a senior backend engineer who prioritizes correctness over cleverness."
Skip this for simple, single-fact requests — a role adds nothing there.

## Few-Shot Examples
Provide 2-5 examples when the desired output format, tone, or pattern is easier to show than describe.
- Keep examples relevant to the real task.
- Vary them enough that the model doesn't copy incidental details (names, numbers) instead of the underlying pattern.
- Label them clearly (`Example 1:`, `Example 2:`, ...).

## Step-by-Step Reasoning
For logic, math, multi-step analysis, or debugging, ask the model to reason before answering: "think through this step by step before giving your final answer." This measurably improves correctness on non-trivial reasoning tasks.
Caveat: if the target model already reasons internally by default, an explicit step-by-step instruction is redundant and can occasionally hurt output. Check target-model behavior before adding it as a blanket default.

## Self-Verification
Append a check step: "before finalizing, verify your answer against [criteria]." This catches errors the first pass misses, especially in code and math.

## Decomposition
For large or vague scope ("build my whole app", "fix everything"), break the task into an ordered sequence of smaller prompts instead of one large one. See patterns.md, "Unbounded scope".

## Positive Format Framing
State the desired output directly rather than only forbidding the unwanted one.
- Weak: "don't use bullet points."
- Strong: "write in flowing prose paragraphs."
Models follow positive instructions more reliably than negative ones.

## Precision in Verbs
"Suggest changes" and "make changes" are different instructions. If action is wanted, use an imperative verb ("rewrite", "fix", "implement") rather than a suggestion-inviting one, or the model may only propose instead of act.
