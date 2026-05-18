---
title: "fix: Correct ~335 garbled OCR miracle entries across MIRACLES_DATA"
type: fix
status: active
origin: bead mythras-chargen-izi
created: 2026-05-18
---

# fix: Correct ~335 garbled OCR miracle entries across MIRACLES_DATA

## Problem Frame

The `MIRACLES_DATA` inline constant in `index.html` contains 335 entries flagged with `split_from_garbled: true` and/or `rune_inferred: true` across 76 cults. These are artifacts from OCR extraction of cult one-pager PDFs (Notes from Pavis 2019 v5.2). The garbling manifests as:

1. **OCR rune-code prefixes left in miracle names** (39 entries) — e.g., "gw Mist Cloud" should be "Mist Cloud" with Water rune, "Rb Soul Sight" should be "Soul Sight" with Beast rune
2. **"Behold" noise entries** (5 entries) — OCR artifact appearing in several 7 Mothers cults
3. **Merged/concatenated names** (1 entry) — multiple miracles in one string
4. **rune_inferred-only entries** (213 entries) — names may be clean or have garbled prefixes; rune assignment was guessed from context
5. **Standard runelord miracles with wrong runes** (77 entries) — Excommunication, Mindlink, Sanctify, Summon Spirit of Reprisal flagged with cult-specific runes instead of "Any"

The reference JSONs (`references/cults-raw/<pantheon>/<cult>.json`) are the ADR-003 source of truth, but **114 of 335 entries** have garbled reference data too (mainly concatenated runelord strings).

---

## Scope Boundaries

### In Scope
- Fix all 335 flagged entries in `MIRACLES_DATA` inline constant
- Fix garbled reference JSONs (114 entries where reference itself is garbled)
- Remove `split_from_garbled` and `rune_inferred` flags from corrected entries
- Vision-verify corrections against source PDFs for uncertain cases
- Maintain test suite passing (235 tests)

### Out of Scope / Deferred
- Rewriting the extraction pipeline
- Adding new miracles not already in the data
- Fixing cult data unrelated to miracles (skills, folk magic, etc.)
- Re-running full extraction from PDFs

---

## Key Technical Decisions

1. **Standard runelord miracles are deterministic** — Every theist cult gets `Excommunication, Mindlink, Sanctify, Summon Spirit of Reprisal` at runelord rank with `"runes": ["Any"]`. These can be programmatically corrected without PDF verification.

2. **Rune code prefix stripping uses the existing legend** — `MIRACLES_DATA.rune_code_legend` maps OCR codes to rune names (e.g., "gw" → "Water", "4g" → "Air", "Rb" → "Beast"). The cleanup script uses this mapping.

3. **Reference JSON fixes first, then propagate to inline** — Per ADR-003, the data chain is PDF → reference JSON → inline constant. Fix reference JSONs first so the inline constant can be regenerated from clean reference data.

4. **"Behold" entries are noise** — Verified against Jakaleel fix (commit 4cd024e). "Behold" does not appear as a real miracle in any source PDF.

5. **Batch processing with manual verification for ambiguous cases** — Most corrections are mechanical (strip prefix, split concatenated string). Only genuinely ambiguous cases (merged names, unclear cult-specific miracles) need vision-mode PDF verification.

---

## Implementation Units

### U1. Build correction script: reference JSON runelord splitting

**Goal:** Split concatenated runelord strings in reference JSONs into separate entries.

**Requirements:** ADR-003 compliance — reference JSON must be correct before inline data.

**Dependencies:** None

**Files:**
- `scripts/fix-garbled-miracles.js` (create)
- `references/cults-raw/storm/*.json` (modify)
- `references/cults-raw/lunar/*.json` (modify)
- `references/cults-raw/darkness/*.json` (modify)
- `references/cults-raw/independent/*.json` (modify)
- `references/cults-raw/praxian/*.json` (modify)

**Approach:**
- Parse each reference JSON's `miracles.runelord` array
- If any entry contains "Excommunication Mindlink Sanctify Summon Spirit of Reprisal" as a substring, split into 4 standard entries plus any remaining cult-specific miracles
- Strip rune code prefixes from remaining runelord entries using `rune_code_legend`
- Write back the corrected JSON preserving formatting
- Also fix `miracles.initiate` entries that have OCR rune prefixes (e.g., "Rb Soul Sight" → "Soul Sight")

**Patterns to follow:** The `rune_code_legend` in MIRACLES_DATA provides the prefix → rune mapping. Match longest prefix first to avoid partial matches.

**Test scenarios:**
- Concatenated runelord "Excommunication Mindlink Sanctify Summon Spirit of Reprisal Awaken" splits into 5 entries
- Rune prefix "gw Mist Cloud" → "Mist Cloud" 
- Multi-char prefix "4egow Dismiss Elemental" → "Dismiss Elemental"
- Empty associate arrays preserved unchanged
- Initiate entries without prefixes preserved unchanged
- Subservient cult syntax "Orlanth:Lightning" preserved (colon separates cult from miracle)

**Verification:** Reference JSONs have no concatenated runelord strings and no rune code prefixes in miracle names.

---

### U2. Vision-verify ambiguous reference corrections against source PDFs

**Goal:** Verify corrections for ambiguous cases where OCR extraction is unclear.

**Dependencies:** U1

**Files:**
- `references/cults-raw/storm/eurmal.json` (verify/modify)
- `references/cults-raw/darkness/tokaz-varaz.json` (verify/modify)
- `references/cults-raw/storm/mastakos.json` (verify/modify)
- Any other cults with non-standard patterns

**Approach:**
- For cults with complex subservient cult syntax (Eurmal has "Murderer(s):?j Crack", "Fool(s):hj Group Laughter"), verify against PDF using `pdf_extract_text` and vision mode
- For merged entries like Tokaz Varaz's "4? Chaos Gift jo Dark Fear io Bump In The Night", extract correct miracle names from PDF
- Pattern: `<subcult>:<rune_code> <miracle_name>` for subservient cult miracles

**Test scenarios:**
- Eurmal subservient miracles correctly identify subcult name and miracle name
- Tokaz Varaz merged string correctly splits into 3 miracles with proper rune codes
- Mastakos "s Guided Teleportation s\nTeleportation" splits into "Guided Teleportation" [Movement] and "Teleportation" [Movement]

**Verification:** All reference JSONs for these cults match their source PDF content. No OCR artifacts remain.

---

### U3. Build inline correction script: propagate reference fixes to MIRACLES_DATA

**Goal:** Regenerate the inline `MIRACLES_DATA` entries from corrected reference JSONs, removing all `split_from_garbled` and `rune_inferred` flags.

**Dependencies:** U1, U2

**Files:**
- `scripts/fix-garbled-miracles.js` (extend)
- `index.html` (modify — MIRACLES_DATA section)

**Approach:**
- For each cult in MIRACLES_DATA with flagged entries:
  - Load the corresponding reference JSON
  - Rebuild the miracles array from reference data:
    - Common miracles (Extension, Find, Divination, Chastise) at initiate rank with `"runes": ["Any"]`
    - Cult-specific initiate miracles with proper rune from reference
    - Standard runelord miracles with `"runes": ["Any"]`
    - Cult-specific runelord miracles with proper rune
  - Remove `split_from_garbled` and `rune_inferred` flags
  - Preserve `source` field ("normal", "common", "subservient", "associate")
- Write the corrected MIRACLES_DATA back to index.html preserving the JSON structure and indentation

**Patterns to follow:** The Jakaleel fix (commit 4cd024e) shows the pattern — replace garbled entries with clean entries from reference JSON, removing flags.

**Test scenarios:**
- Heler goes from 8 flagged entries to 0, with correct miracle list matching PDF
- Standard runelord miracles get `"runes": ["Any"]` regardless of cult
- Cult-specific runelord miracles get proper rune from reference
- "Behold" entries are removed entirely
- Entries without flags are preserved unchanged
- Total flagged count drops from 335 to 0

**Verification:** `grep -c 'split_from_garbled' index.html` returns 0. `grep -c 'rune_inferred' index.html` returns 0.

---

### U4. Run test suite and validate

**Goal:** Ensure all corrections maintain application integrity.

**Dependencies:** U3

**Files:**
- `test-chargen.js` (run, not modify)

**Approach:**
- Run `node test-chargen.js` — all 235 tests must pass
- Spot-check several cults in the browser to verify miracle pickers render correctly
- Verify miracle count for a few cults matches PDF source

**Test scenarios:**
- 235/235 unit tests pass
- Heler miracle picker shows correct initiate and runelord miracles
- Ana Gor miracle picker shows "Stop Plague", "Command Worshippers", "Vision" without garbled prefixes
- Eurmal subservient miracles render correctly with subcult labels

**Verification:** Test suite green. No regressions in miracle selection UI.

---

## System-Wide Impact

- **Miracle pickers (Step 9)** — Will show clean miracle names instead of OCR-garbled ones
- **PDF export** — Miracle names in exported character sheets will be correct
- **Play mode** — Selected miracles display correctly
- **Fixtures** — Existing fixture files reference miracle names; if any fixture references a garbled name, it will need updating (but fixtures likely reference clean common miracles)

---

## Deferred Implementation Notes

- The `rune_code_legend` in MIRACLES_DATA may have entries not fully accounted for; the script should log any unrecognized prefixes for manual review
- Some cults may have cult-specific runelord miracles beyond the standard 4; these need careful identification during splitting
- The Eurmal subcult pattern (`SubcultName(s):rune_code MiracleName`) is unique and may need special handling
