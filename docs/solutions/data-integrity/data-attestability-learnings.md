---
title: Data Attestability & Vision-Mode Verification
category: architecture
tags: [data-integrity, pdf-verification, vision-mode, spirit-picker, sorcery-picker]
date: 2026-05-17
---

# Data Attestability & Vision-Mode Verification

## Problem

LLM-generated content was introduced into the chargen without verification against source PDFs, creating:
1. Wrong spell descriptions (34 fabricated sorcery spell summaries)
2. Wrong formulas (INT/4 for spell limits — actual Core rule is memorisation limit = INT)
3. Wrong spirit stats (Whulla POW 9 → actual PDF shows POW 11)
4. False source citations ("per Mythras Core" for CHA/2 — which turned out to actually BE in Core p.136, but the citation was never verified)

## Key Learnings

### 1. Vision-mode PDF verification is essential

**Pattern:** Extract PDF pages to images → read with vision → compare against code.

This caught errors that text extraction (pdftotext) missed due to formatting issues. Vision mode reads tables, stat blocks, and formatted rules text accurately.

### 2. "UNVERIFIED" markers prevent silent hallucination

When extracting data, marking unknown values as `"UNVERIFIED"` (string literal) rather than guessing prevents wrong data from entering the chargen. The bird-in-hand.json had 5 spirits with UNVERIFIED stats that would have been wrong if guessed.

### 3. The reference JSON is the single source of truth

**Pattern:** `references/*.json` → `index.html` constants → UI rendering

Never update the chargen UI without first updating the reference JSON. The JSON must be verified against the PDF before the chargen constant is updated. This prevents drift between the "source of truth" and the running code.

### 4. CHA/2 was actually correct — verify before declaring something wrong

Plan 005 claimed "CHA/2 is NOT in Mythras Core" — but vision-verifying p.136 proved it IS there under "Limits to Bound Spirits." Lesson: always verify claims about what's NOT in a source by actually reading the source.

### 5. Spell limit formula: Core vs. chargen starting limit

- **Core rule (p.165):** Memorisation limit = INT (total spells a sorcerer can know)
- **Chargen starting limit:** 3 spells (Dedicated rank with ~50% Rune Affinity / 20)

These are different things. The old INT/4 formula conflated them. The chargen should show the starting allocation, not the lifetime maximum.

## Conventions Established

1. All reference JSONs must have `"verified": true/false` and `"verified_at"` date
2. Vision-mode verification should note the method: "Vision-verified against PDF page images"
3. Page citations must be specific (p.136, not "Mythras Core")
4. House rules must be documented in ADRs with Discord screenshot citations
5. The `spell_list` in reference JSONs should include `traits` (Concentration, Resist) for completeness
