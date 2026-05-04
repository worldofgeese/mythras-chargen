# Design: OCR Miracle Name Cleanup (Orlanth/Vinga Subcults)

**Status:** accepted
**Date:** 2026-05-04
**Upstream:** Notes from Pavis Orlanth.pdf (OCR'd)

## Problem

The Orlanth cult entry in CULTS_DATA contained OCR-corrupted miracle names. The original PDF used rune glyphs inline with miracle names, which the OCR interpreted as garbage characters.

## Pattern

Original PDF format (inferred): `[Rune Glyph] Miracle Name`
OCR result: `Subcult:GARBAGE Miracle Name`

Examples:
- `"Orlanth Adventurous:Rce Shield"` → `"Orlanth Adventurous: Shield"`
- `"Orlanth Adventurous:g Lightning"` → `"Orlanth Adventurous: Lightning"`
- `"Vinga:4g Flight"` → `"Vinga: Flight"`
- `"Wegow Command Worshippers"` → merged into `"Orlanth Rex: Command Worshippers"`

## Changes Made

Cleaned 24 miracle name entries across Orlanth cult (including Vinga subcult). Format standardized to `"Subcult: Miracle Name"` with single space after colon.

One broken entry `"Orlanth Rex:"` (empty name, rune_inferred: true) was merged with the following `"Wegow Command Worshippers"` entry, which was itself OCR corruption of `"Command Worshippers"`.

## Validation

- Vasana's fixture miracles `["Shield", "Lightning"]` now match via substring against `"Orlanth Adventurous: Shield"` and `"Orlanth Adventurous: Lightning"`
- Ionara's fixture miracles `["Blast Earth", "Create Fissure", "Shake Earth"]` matched correctly in Maran Gor cult (no OCR issues in that entry)
- 100/100 character generation tests pass after cleanup
