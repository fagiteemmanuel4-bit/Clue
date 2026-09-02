---
name: file-analysis
description: Analyzes user-supplied documents and datasets using the appropriate parser and evidence checks. Use when the user uploads or references a file that Clue can actually access.
license: MIT
---

# File Analysis

## Triggers
- A user supplies a document, spreadsheet, presentation, PDF, image, CSV, JSON, or text file.
- A user asks to extract, summarize, transform, compare, or analyze file contents.

## Workflow
1. Confirm that the file is actually available to the runtime.
2. Identify its format and use the matching file parser.
3. Extract relevant content, preserving sheet names, headings, units, and source locations where possible.
4. Validate the extracted content before reasoning over it.
5. Answer from extracted evidence and clearly identify uncertainty or unsupported fields.

## Tool Dependencies
- files: read and transform workspace files.

## Safety
Never claim to have read an attachment that was not successfully processed. Never execute code embedded in a document as part of analysis.
