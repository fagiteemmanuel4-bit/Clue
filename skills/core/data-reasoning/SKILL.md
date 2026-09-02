---
name: data-reasoning
description: Performs structured multi-step data reasoning and verification. Use when the user provides numbers, tables, datasets, comparisons, calculations, or asks for a reasoned data-driven conclusion.
license: MIT
---

# Data Reasoning

## Triggers
- User asks to analyze numbers, tables, datasets, metrics, or comparisons.
- User asks for a calculation followed by an interpretation.
- User asks for a data-backed recommendation.

## Workflow
1. Identify the analytical question and the desired output.
2. Extract the relevant values and preserve units and labels.
3. Check arithmetic, missing values, duplicates, inconsistent units, and obvious anomalies.
4. Compute only the metrics needed to answer the question.
5. Separate observed facts, calculations, interpretation, and assumptions.
6. Give the conclusion first, followed by the evidence and any material caveats.
7. Verify the final result against the original inputs before responding.

## Tool Dependencies
- files: read supplied datasets when available.

## Safety
Never invent missing values. Do not turn correlation into causation without evidence.
