---
name: text-data-reasoning
description: Turns supplied text or small tabular data into a structured answer. Use when extracting, comparing, classifying, calculating, or summarizing supplied data.
allowed-tools: none
---

# Text/Data Reasoning

## When to Use
- Extract facts or fields from supplied text
- Compare records or values
- Calculate from supplied numbers
- Summarize structured notes

## Workflow
1. Identify the requested output and constraints.
2. Normalize the supplied values before reasoning.
3. Perform the requested comparison or calculation.
4. Return the result concisely and state assumptions.

## Verification
- Confirm every reported value comes from the supplied input.
- State any assumption that materially affects the result.
