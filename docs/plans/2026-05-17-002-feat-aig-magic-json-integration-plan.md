# AiG Magic JSON Integration Plan

Created: 2026-05-17  
Status: active  
Type: feat  

---

## Summary

Integrate a cleaned-up AiG (Adventures in Glorantha) magic extraction (`~/Downloads/aig-magic.json`) into our existing reference JSON sources under `references/aig-raw/`. The new extraction covers AiG pages 59–151 and contains:

- **412 spells** (45 Folk Magic + ~367 Rune Magic)
- **33 named spirits** (Gloranthan spirit stat blocks)
- **61 section headings** (cult structure, casting rules, spirit traditions)
- **4 worked examples**
- Full Spirit Magic chapter (p.134-151) — previously missing from our data

This is dramatically richer than our current AiG JSONs which only have partial Folk Magic (19 spells from 2 cultures) and Rune Affinities.

---

## Source Analysis

### New Extraction Format (`aig-magic.json`)
- **Format:** 10 concatenated JSON objects (one per batch of 8 pages)
- **Schema:** `{ source_file, extraction_method, batch: {start/end pages}, pages: [{ pdf_page, printed_page, chapter, blocks: [...] }] }`
- **Block types:** `spell`, `spirit`, `section`, `body`, `example`, `table`, `list`, `callout`, `note`, etc.
- **Chapters covered:** Magic (overview), Folk Magic, Rune Magic, Spirit Magic
- **Page range:** AiG p.59-151

### Existing AiG JSONs (in `references/aig-raw/`)
| File | Content | Schema |
|---|---|---|
| `folk-magic-aig.json` | 19 spells from 2 cultures | `{ source, page, spells_from_cultures, unique_spells_alphabetical }` |
| `rune-affinities.json` | Rune affinity rules | `{ source, page, rune_affinities, elemental_runes }` |
| `combat-styles-aig.json` | Combat styles by culture | `{ source, combat_styles }` |
| `cultures.json` | Culture data | structured |
| `creation-summary-aig.json` | Chargen summary | structured |
| `equipment-aig.json` | Equipment lists | structured |

### Schema Gap
The new extraction uses a **page-block** schema (raw OCR-style), while existing JSONs use **domain-structured** schemas (spell lists, culture maps, etc.). Integration requires **transforming** the page-block format into domain-structured JSONs that match our existing patterns.

---

## Implementation Units

### U1. Fix JSON format (concatenated → valid)

**Goal:** Convert the multi-object file into a single valid JSON array.  
**Input:** `/home/worldofgeese/Downloads/aig-magic.json` (10 concatenated objects)  
**Output:** `references/aig-raw/aig-magic-pages.json` (single valid JSON with all pages merged)  
**Approach:** Parse all 10 objects, merge their `pages` arrays into one flat array sorted by `pdf_page`, write as single JSON with metadata.  
**Verification:** `python3 -c "import json; json.load(open('references/aig-raw/aig-magic-pages.json'))"` succeeds.

### U2. Transform Folk Magic spells into domain schema

**Goal:** Replace `folk-magic-aig.json` with the complete 45-spell extraction.  
**Dependencies:** U1  
**Input:** All blocks with `type: "spell"` from chapter `"Folk Magic"`  
**Output:** Updated `references/aig-raw/folk-magic-aig.json`  
**Schema mapping:**
- Keep existing keys: `source`, `extracted_at`, `page`, `note`, `core_reference`
- Replace `unique_spells_alphabetical` with full spell list (45 vs current 19)
- Add `spells` array with `{ name, page, description, duration, range, ... }` from block data
- Keep `spells_from_cultures` (culture assignments come from culture JSONs, not this extraction)
- Update `missing_cultures` to reflect what's now covered  
**Verification:** All 45 spell names present; existing 19 are a subset.

### U3. Create Rune Magic spells JSON

**Goal:** Create a new `rune-magic-aig.json` with all ~367 Rune spells.  
**Dependencies:** U1  
**Input:** All blocks with `type: "spell"` from chapter `"Rune Magic"`  
**Output:** New `references/aig-raw/rune-magic-aig.json`  
**Schema:** `{ source, extracted_at, page, spells: [{ name, page, rune, description, ... }], cult_structure: {...}, casting_rules: {...} }`  
**Approach:** Extract spell blocks, parse name/description. Also extract the cult structure sections (Lay Members, Initiates, Devotees, Feats) and casting rules.  
**Verification:** Spell count matches extraction (367+). Cult structure sections present.

### U4. Create Spirit Magic JSON

**Goal:** Create a new `spirit-magic-aig.json` with traditions, spirits, and abilities.  
**Dependencies:** U1  
**Input:** All pages from chapter `"Spirit Magic"` (p.134-151)  
**Output:** New `references/aig-raw/spirit-magic-aig.json`  
**Schema:** `{ source, extracted_at, page, traditions: [...], spirit_societies: {...}, spirits: [{ name, page, description, abilities }], spirit_abilities: [...] }`  
**Approach:** Extract tradition descriptions, spirit society structure, named spirit stat blocks, and spirit abilities list.  
**Verification:** All 33 named spirits present. Traditions (Golden Bow, Hsunchen, Kolating, Praxian) all present.

### U5. Create Magic Overview JSON

**Goal:** Create/update `magic-overview-aig.json` with the general magic rules from AiG.  
**Dependencies:** U1  
**Input:** Pages from chapter `"Magic"` (p.59-62)  
**Output:** New `references/aig-raw/magic-overview-aig.json`  
**Schema:** `{ source, extracted_at, page, general_rules: { casting_skills, spell_availability, pricing, learning, casting_time, magic_points, restrictions, stacking }, system_descriptions: {...} }`  
**Approach:** Extract the "General Rules for Gloranthan Magic" sections — these define how AiG modifies Mythras Core casting.  
**Verification:** All general rules sections present. "Changes to Casting Skills" section captured (this is the Rune Affinity adaptation).

### U6. Reconcile with existing rune-affinities.json

**Goal:** Ensure `rune-affinities.json` is consistent with the new extraction's casting rules.  
**Dependencies:** U5  
**Input:** Compare existing `rune-affinities.json` against new "Changes to Casting Skills" section  
**Output:** Updated `references/aig-raw/rune-affinities.json` if needed  
**Approach:** Cross-reference. The existing file may already be correct (it was manually extracted). Add any missing detail from the new extraction.  
**Verification:** No contradictions between files.

### U7. Update chargen to use new spell data

**Goal:** Wire the new complete spell lists into the character generator.  
**Dependencies:** U2, U3, U4  
**Input:** New/updated AiG JSONs  
**Output:** Updated `index.html` spell selection logic  
**Approach:** The chargen currently references `theism-miracles.json` (from one-pagers) for Rune spells. The new `rune-magic-aig.json` provides the canonical AiG spell list. Determine if/how to merge or cross-reference.  
**Verification:** Spell selection still works. New spells available where appropriate.

---

## Key Technical Decisions

- **Keep raw page-block file** as `aig-magic-pages.json` — serves as the attestable source per ADR-003
- **Transform into domain JSONs** — matches existing schema patterns for chargen consumption
- **Don't overwrite existing JSONs blindly** — reconcile and merge, preserving any manual corrections
- **Mark all new data `"verified": false`** — per ADR-003, until human-verified against PDF

---

## Scope Boundaries

### In Scope
- Parsing and validating the multi-object JSON file
- Creating domain-structured JSONs for Folk Magic, Rune Magic, Spirit Magic, Magic Overview
- Reconciling with existing `rune-affinities.json`
- Wiring new data into chargen where it improves coverage

### Deferred
- Human verification of all 412 spells against PDF (separate bead `mythras-chargen-nfe`)
- Adding spell descriptions to the chargen UI (currently only shows spell names)
- Spirit stat block integration into the spirit picker (blocked by `mythras-chargen-9bw`)
