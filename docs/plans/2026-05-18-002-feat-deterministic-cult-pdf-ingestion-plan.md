---
title: "feat: Deterministic cult PDF ingestion pipeline"
type: feat
status: active
origin: bead mythras-chargen-h99
created: 2026-05-18
---

# feat: Deterministic cult PDF ingestion pipeline

## Problem Frame

Hannu's cult one-pager PDFs (Notes from Pavis, v5.2 → soon v6) use a custom `GloranthaCoreRunes` font to render rune symbols inline with miracle text. When standard text extraction tools (pdfminer, pypdf) process these PDFs, rune glyphs are decoded as their Unicode code points (e.g., "s", "w", "g", "4") and concatenated with adjacent text — producing garbage like "gw Mist Cloud" or "4egow Dismiss Elemental".

The current extraction pipeline (`scripts/extract-theism-miracles.py`) attempts regex-based post-hoc prefix stripping, but this is fragile and produced 335+ garbled entries across 76 cults that required manual correction.

**Goal:** A font-aware extraction pipeline that deterministically produces clean, verified output from any batch of cult PDFs — zero post-processing cleanup needed.

---

## Scope Boundaries

### In Scope
- Font-aware PDF extraction that separates rune glyphs from body text
- Structured JSON output per cult (same schema as `references/cults-raw/`)
- Rune glyph → rune name mapping table (built from the font's character map)
- Batch processing of entire `references/cults-upstream/` directory
- Diff-mode to compare new extraction against existing reference JSONs
- Validation pass that flags any entry requiring manual review

### Out of Scope / Deferred
- Changing the inline MIRACLES_DATA format (separate concern)
- Processing non-cult PDFs (Mythras Core, Adventures in Glorantha)
- Automated index.html update (keep that as a separate manual step via existing script)
- UI changes

### Deferred to Follow-Up Work
- Auto-updating `index.html` from reference JSONs (could extend `fix-garbled-miracles.js --phase2`)
- CI/CD integration or GitHub Action for ingestion
- Vision-mode verification automation

---

## Key Technical Decisions

1. **Font-aware extraction via pdfplumber** — pdfplumber exposes per-character font metadata (`char["fontname"]`). Characters in `GloranthaCoreRunes` are rune glyphs; all others are body text. This is deterministic and doesn't require heuristics.

2. **Rune glyph mapping table** — Build a definitive mapping from character code → rune name by analyzing the `GloranthaCoreRunes` font's character repertoire across all PDFs. The existing `rune_code_legend` is the starting point but was built empirically. The new table will be built systematically.

3. **Section-based parsing** — Cult one-pagers have a fixed structure:
   - Header (cult name, rune symbols, version)
   - Requirements
   - Cult Skills
   - Folk Magic
   - **Theist Miracles — Initiate** (target section)
   - **Runelord** (target section)
   - **Associate/Subservient** (optional)
   - Pantheons, Areas, Personality Traits, etc.

4. **Comma-delimited miracle parsing** — Within the miracles section, entries are comma-separated. Rune glyphs appear immediately before their miracle name with no comma separator. The pipeline uses the font boundary as the delimiter.

5. **Idempotent output** — Running the pipeline twice on the same PDFs produces identical JSON. Output is sorted deterministically.

6. **Schema validation** — Output JSON is validated against a JSON schema before writing, catching structural issues at extraction time.

---

## High-Level Technical Design

*This illustrates the intended approach and is directional guidance for review, not implementation specification.*

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│  PDF Files      │───▶│  Font-Aware Parser    │───▶│  Structured     │
│  (cults-upstream)│    │  (pdfplumber chars)   │    │  Extraction     │
└─────────────────┘    └──────────────────────┘    └─────────────────┘
                              │                           │
                              ▼                           ▼
                       ┌──────────────┐          ┌──────────────────┐
                       │ Rune Glyph   │          │ Section Parser   │
                       │ Detector     │          │ (regex anchors)  │
                       │ (font check) │          │                  │
                       └──────────────┘          └──────────────────┘
                              │                           │
                              ▼                           ▼
                       ┌──────────────────────────────────────────┐
                       │  Miracle Entry Builder                    │
                       │  - Rune glyphs → rune metadata           │
                       │  - Body text → miracle name               │
                       │  - Comma splitting → individual entries   │
                       │  - Rank assignment (initiate/runelord)    │
                       └──────────────────────────────────────────┘
                              │
                              ▼
                       ┌──────────────────────────────────────────┐
                       │  Output: references/cults-raw/<p>/<c>.json│
                       │  + Validation report                      │
                       │  + Diff against existing (if present)     │
                       └──────────────────────────────────────────┘
```

---

## Implementation Units

### U1. Build rune glyph mapping table from font analysis

**Goal:** Systematically enumerate all characters used in `GloranthaCoreRunes` across cult PDFs and map each to its rune name.

**Dependencies:** None

**Files:**
- `scripts/build-rune-map.py` (create)
- `references/rune-glyph-map.json` (create — definitive mapping)

**Approach:**
- Use pdfplumber to scan all cult PDFs, collecting every unique character that appears in `GloranthaCoreRunes` font
- Cross-reference against the known `rune_code_legend` to assign rune names
- For unmapped characters, output them with the PDF context for manual assignment
- Produce a JSON file mapping char_code → rune_name

**Test scenarios:**
- "s" in GloranthaCoreRunes → "Movement"
- "w" in GloranthaCoreRunes → "Water"
- "g" in GloranthaCoreRunes → "Air"
- "t" in GloranthaCoreRunes → "Death"
- All characters from existing `rune_code_legend` are covered
- No unmapped characters remain after manual review

**Verification:** `rune-glyph-map.json` covers all rune glyphs found across 214 cult PDFs with zero unknowns.

---

### U2. Font-aware text extraction function

**Goal:** Build the core extraction function that reads PDF text while separating rune glyphs from body text.

**Dependencies:** U1

**Files:**
- `scripts/ingest-cults.py` (create — main pipeline script)

**Approach:**
- Use pdfplumber's `page.chars` to iterate characters with full metadata
- For each character:
  - If `fontname` contains "GloranthaCoreRunes" → emit as rune token (lookup in glyph map)
  - Otherwise → emit as text character
- Output is a stream of typed tokens: `[{type: "text", value: "Mist Cloud"}, {type: "rune", value: "Water"}, ...]`
- Group consecutive same-type tokens into segments

**Test scenarios:**
- "gw Mist Cloud" in raw PDF → tokens: [rune:"Water", text:"Mist Cloud"]
- "4egow Dismiss Elemental" → tokens: [rune:"Any" (multi-rune), text:"Dismiss Elemental"]
- "Extension, Find (Specific Thing)" → tokens: [text:"Extension, Find (Specific Thing)"]
- Rune glyphs followed immediately by text (no space) are correctly split

**Verification:** Heler PDF page 1 produces tokens that cleanly separate all rune symbols from miracle names.

---

### U3. Section parser — identify Theist Miracles boundaries

**Goal:** Locate the "Theist Miracles" section in each cult PDF and extract rank-delimited miracle text.

**Dependencies:** U2

**Files:**
- `scripts/ingest-cults.py` (extend)

**Approach:**
- Detect section headers by font size/style (headers use Helvetica-Bold 12pt+)
- Key section anchors:
  - "Theist Miracles - Initiate:" marks start of initiate miracles
  - "Runelord:" marks start of runelord miracles
  - "Initiate - subservient:" or "Initiate - associate:" marks associate sections
  - "Runelord - subservient:" or "Runelord - associate:" marks runelord associate
  - Next section header (Pantheons, Source, Areas) marks end
- Extract the token stream between these boundaries for each rank

**Test scenarios:**
- Heler: finds initiate section with 11 miracles, runelord with standard 4
- Eurmal: finds both normal and subservient sections for initiate and runelord
- Tokaz Varaz: correctly terminates miracle section before "Pantheons"
- A cult with no miracles section (e.g., purely animist) returns null gracefully

**Verification:** All 78 cult PDFs that have theist miracles produce correctly bounded section text.

---

### U4. Miracle entry builder — parse entries from token streams

**Goal:** Convert the rune-annotated token stream into structured miracle entries.

**Dependencies:** U2, U3

**Files:**
- `scripts/ingest-cults.py` (extend)

**Approach:**
- Within a section, split on commas to get individual entries
- For each entry:
  - Leading rune token(s) → the miracle's rune assignment
  - Text content → the miracle name (trimmed)
  - If no rune token, assign "Any" (for common miracles like Extension)
- Handle subcult syntax: `SubcultName(s):` followed by rune+miracle
- Handle associate syntax: `CultName(a):` followed by rune+miracle
- Standard runelord miracles ("Excommunication, Mindlink, Sanctify, Summon Spirit of Reprisal") always get rune "Any"

**Test scenarios:**
- Heler initiate "w Rain" → {name: "Rain", runes: ["Water"], rank: "initiate"}
- Heler runelord has exactly 4 standard entries, all with runes: ["Any"]
- Eurmal subcult "Fool(s):hj Group Laughter" → {name: "Fool(s):Group Laughter", runes: ["Illusion"], source: "subservient"}
- Issaries associate "Orlanth(a):4g Flight" → {name: "Flight", runes: ["Air"], source: "associated", from_cult: "Orlanth"}
- Multi-rune glyphs (e.g., "4egow" = all elements) → runes: ["Any"]

**Verification:** Heler, Eurmal, Issaries, Tokaz Varaz all produce correct entries matching their manually-verified reference JSONs.

---

### U5. Batch processing and diff mode

**Goal:** Process all cult PDFs in batch, output reference JSONs, and show differences from existing data.

**Dependencies:** U4

**Files:**
- `scripts/ingest-cults.py` (extend)
- `references/cults-raw/` (output, modify existing JSONs)

**Approach:**
- Walk `references/cults-upstream/` finding individual cult PDFs (skip Catalogue/Relationships/Spell/Personality PDFs)
- For each PDF:
  - Extract miracles using the pipeline
  - Merge with existing reference JSON (update miracles field, preserve other fields like requirements, cultSkills, folkMagic)
  - If `--diff` flag: show differences between new extraction and existing reference
  - If `--write` flag: write updated reference JSON
- Output summary: total processed, changed, unchanged, errors

**Patterns to follow:** Existing `extract-cults.py` already has the file discovery logic (SKIP_PATTERNS, pantheon directory structure).

**Test scenarios:**
- Processing Heler.pdf produces output identical to our manually-verified `references/cults-raw/storm/heler.json` miracles
- `--diff` mode shows no changes for already-correct reference JSONs
- New/unknown PDFs create new reference JSON files
- Missing PDFs don't destroy existing reference data
- Processing is deterministic: running twice produces identical output

**Verification:** Full batch run on all 214 cult PDFs completes without errors. Diff against existing corrected references shows zero meaningful differences for the 78 cults already in the system.

---

### U6. Validation and quality gate

**Goal:** Automated checks that flag suspicious entries before they enter the data chain.

**Dependencies:** U5

**Files:**
- `scripts/ingest-cults.py` (extend — `--validate` flag)
- `scripts/validate-miracles.js` (create — can also be run standalone)

**Approach:**
- Flag entries where:
  - Name starts with lowercase (likely garbled rune code leaked through)
  - Name is a single word under 4 characters (likely noise)
  - Name contains digits not in parentheses (likely garbled)
  - Rune assignment is "UNVERIFIED" (glyph not in mapping table)
  - Entry count for a cult deviates significantly from expected range (6-30 for initiate, 4-8 for runelord)
- Generate validation report: per-cult pass/fail, flagged entries with context
- Exit non-zero if any entries are flagged (prevents bad data from being committed)

**Test scenarios:**
- A clean extraction (Heler) passes with zero flags
- An intentionally garbled entry ("gw Mist Cloud") is caught
- "Behold" single-word entries are flagged
- Entries with rune "UNVERIFIED" are flagged
- A cult with 0 initiate miracles is flagged as unusual

**Verification:** Running validation on the current corrected reference JSONs produces zero flags.

---

## System-Wide Impact

- **ADR-003 compliance** — The pipeline enforces the data chain: PDF → reference JSON → inline constant. No manual editing of reference JSONs needed.
- **New PDF versions** — When Hannu drops v6 PDFs, the pipeline can process the entire batch in one command.
- **Existing data preserved** — The pipeline merges with existing reference JSONs rather than overwriting non-miracle fields.

---

## Deferred Implementation Notes

- The `GloranthaCoreRunes` font may have different character mappings in v6 PDFs. The rune glyph map should be rebuilt when new PDFs arrive.
- Some cults may have animist or sorcery sections rather than theist miracles — the section parser should detect and skip these gracefully.
- The pipeline could eventually also extract folk magic, cult skills, and personality traits, but miracle extraction is the priority.
