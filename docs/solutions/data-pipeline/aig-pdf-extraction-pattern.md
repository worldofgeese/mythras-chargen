---
title: AiG PDF Extraction Pattern
category: data-pipeline
module: data-ingestion
problem_type: extraction_pattern
tags:
  - aig
  - pdf-extraction
  - json-merge
  - data-pipeline
---

# AiG PDF Extraction Pattern

## Problem

The Adventures in Glorantha (AiG) PDF was extracted by an LLM into page-block format — 10 concatenated JSON objects in a single file, each representing a chunk of pages. This is not valid JSON and cannot be consumed directly by the application.

## Solution

1. Split the raw extraction output on object boundaries (each top-level `{...}` block).
2. Parse each block independently.
3. Deep-merge all blocks into a single unified JSON structure, resolving array concatenation (e.g., cult lists, skill lists) and object merging (e.g., nested culture data).
4. Validate the merged result against the expected schema before committing.

## Key Insight

LLM-based PDF extraction produces page-aligned chunks, not domain-aligned structures. A transformation step is always needed to go from "pages N-M content" to "all cults" or "all cultures". Plan for this merge step when designing extraction prompts.

## When to Apply

- Any time a large PDF is extracted in chunks (by page range or section).
- When the extraction tool outputs concatenated JSON objects rather than a JSON array.
