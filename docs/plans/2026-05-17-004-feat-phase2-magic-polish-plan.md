---
title: "feat: Phase 2 magic system polish — PDF depth, spirit stats, sorcery effects"
status: active
created: 2026-05-17
origin: thoughts/shared/solutions/phase2-gap-analysis-and-solutions.md
type: feat
depth: standard
---

# Phase 2: Magic System Polish

## Summary

Enhance the chargen's magic system output with full PDF content for non-theist cults, sorcery spell effect descriptions, and improved spirit picker data. All 5 magic systems already work — this plan adds depth and polish.

---

## Problem Frame

The chargen correctly detects cult types and assigns resources, but:
1. **PDF export** shows resource numbers without spell/spirit details for sorcery and animist cults
2. **Sorcery spells** have names + resist types but no effect descriptions
3. **Spirit picker** uses 12 generic templates without real stat blocks from source material

Mysticism is **blocked** — no cult in the data uses Mysticism/Meditation skill signals. The Kralori cults (`Black Sun`, `Path of Immanent Mastery`) use Devotion/Runic Affinity (theist pattern). Mysticism UI work is deferred until cult data with mysticism signals arrives.

---

## Scope Boundaries

### In Scope
- PDF export: sorcery spell list + spirit details in output
- Sorcery spell effects from Mythras Core p.167-178
- Spirit stat enrichment from Monster Island + Bird in the Hand data
- Bug fixes found during implementation (e.g., orphaned state, placeholder skills)

### Deferred to Follow-Up Work
- Mysticism talent selection UI (blocked: no cult data with mysticism signals)
- Hannu's new one-pager format migration
- Performance/mobile/accessibility testing
- Full Monster Island spirit generation with random stat rolls

---

## Key Technical Decisions

1. **PDF approach**: Unified Enhanced Template — reuse existing column layout, add conditional sections per magic type (same pattern as Play Mode rendering)
2. **Sorcery effects**: Add `description` field to `SORCERY_SPELLS` tuples; show in picker tooltip + PDF
3. **Spirit enrichment**: Replace generic templates with real data from `references/spirits-raw/monster-island.json` and `references/spirits-raw/bird-in-hand.json`
4. **No new dependencies**: All changes are vanilla JS + existing jsPDF/pdf-lib

---

## Implementation Units

### U1. Add sorcery spell effect descriptions

**Goal:** Enrich `SORCERY_SPELLS` with brief effect descriptions from Mythras Core p.167-178.

**Requirements:** Gap 4 from phase2-gap-analysis-and-solutions.md

**Dependencies:** None

**Files:**
- `index.html` (SORCERY_SPELLS constant, sorcery picker rendering)
- `references/mythras-raw/sorcery.json` (add descriptions to spell_list)
- `test-chargen.js` (verify descriptions exist)

**Approach:** Extract 1-2 sentence effect summaries from `references/mythras-raw/sorcery.json` (which has page refs). Add `description` field to each spell entry. Update picker rendering to show description in tooltip (same pattern as `FOLK_MAGIC_DESCRIPTIONS` tooltips).

**Patterns to follow:** `FOLK_MAGIC_DESCRIPTIONS` tooltip pattern at line ~13120 of index.html; existing `skill-tooltip` CSS class.

**Test scenarios:**
- All 34 spells have a non-empty description string
- Tooltip renders description text when hovering ℹ️ icon
- Spells without resist type still show description correctly

**Verification:** Sorcery picker shows ℹ️ tooltips with effect text for all 34 spells.

---

### U2. Enrich spirit picker with real stat data

**Goal:** Replace 12 generic spirit templates with real spirit data from Monster Island and Bird in the Hand extractions.

**Requirements:** Gap 2 from phase2-gap-analysis-and-solutions.md

**Dependencies:** None

**Files:**
- `index.html` (STARTING_SPIRITS constant, spirit picker rendering)
- `references/spirits-raw/monster-island.json` (source data)
- `references/spirits-raw/bird-in-hand.json` (source data)
- `test-chargen.js` (verify spirit data structure)

**Approach:** Parse existing spirit extractions for intensity 1-2 spirits suitable for starting characters. Build enriched spirit objects with: name, type, intensity, POW, CHA (if available), abilities, and source page reference. Keep the picker UI pattern (checkbox + limit) but show richer info per spirit.

**Patterns to follow:** Current `STARTING_SPIRITS` structure; `SORCERY_SPELLS` data pattern.

**Test scenarios:**
- All spirits in picker have name, type, intensity, and at least one ability
- Spirit picker still enforces min(3, CHA/2) limit
- Spirits display source page reference
- toggleBoundSpirit stores enriched spirit object (not just name string)

**Verification:** Spirit picker shows real spirit names with abilities and page refs. Limit enforcement unchanged.

---

### U3. PDF export: sorcery spell list

**Goal:** Include selected sorcery spells (with effects) in PDF output for sorcery cults.

**Requirements:** Gap 1 (sorcery portion) from phase2-gap-analysis-and-solutions.md

**Dependencies:** U1

**Files:**
- `index.html` (PDF generation section, ~line 18600+)
- `test-agent-api.mjs` (verify PDF export for Arkat includes spells)

**Approach:** In the PDF sorcery section (line ~18935), iterate `CharacterData.sorcerySpells` and render each spell name + brief effect. Use same font/layout as miracle list in theist PDF section.

**Patterns to follow:** Theist miracle rendering in PDF at line ~18398.

**Test scenarios:**
- Arkat character PDF includes "Sorcery Spells" header
- Each selected spell name appears in PDF output
- Spell effects appear (truncated if needed for space)
- Pure theist PDF unchanged (no sorcery section)
- Hybrid cult with no sorcery spells shows empty sorcery section gracefully

**Verification:** Export Arkat PDF → open → verify spell names and effects visible.

---

### U4. PDF export: spirit details for animist cults

**Goal:** Include bound spirit details in PDF output for animist/hybrid cults.

**Requirements:** Gap 1 (animist portion) from phase2-gap-analysis-and-solutions.md

**Dependencies:** U2

**Files:**
- `index.html` (PDF generation section, ~line 18600+)
- `test-agent-api.mjs` (verify PDF export for Daka Fal includes spirits)

**Approach:** In the PDF animist section (line ~18924), iterate `CharacterData.boundSpirits` and render each spirit's name, type, intensity, and primary ability. Show total slots used vs available.

**Patterns to follow:** Theist miracle rendering in PDF; spirit picker display format.

**Test scenarios:**
- Daka Fal character PDF includes "Bound Spirits" header with slot count
- Each bound spirit shows name + ability
- Waha (hybrid) PDF shows both miracles AND spirits
- Character with no spirits selected shows "No spirits bound" or empty section
- Pure theist PDF unchanged (no spirit section)

**Verification:** Export Daka Fal PDF → open → verify spirit names and abilities visible.

---

### U5. Fix remaining bugs and wonky behavior

**Goal:** Clean up any remaining issues found during U1-U4 implementation.

**Requirements:** Code quality, regression prevention

**Dependencies:** U1, U2, U3, U4

**Files:**
- `index.html` (various)
- `test-chargen.js` (add regression tests)
- `fixtures/*.json` (fix any remaining placeholder issues)

**Approach:** During U1-U4, track any bugs encountered (XSS in onclick handlers, missing null checks, inconsistent data shapes). Fix them here as a dedicated cleanup pass. Run full test suite + E2E after all fixes.

**Known issues from code review to address:**
- Fragile inline onclick escaping (items #6, #7 from code review) — consider data-attribute + event delegation
- `test-agent-api.mjs` missing JSON parse error handling (item #11)
- `test-agent-api.mjs` browser leak on unhandled exception (item #12)

**Test scenarios:**
- All 235 unit tests pass
- All 30 E2E assertions pass
- Spirit names with special characters don't break onclick handlers
- test-agent-api.mjs handles non-JSON eval responses gracefully
- Browser process cleaned up even on test failure

**Verification:** Full test suite green. No orphaned browser processes after test run.

---

## Sequencing

```
U1 (sorcery effects) ──→ U3 (PDF sorcery)
U2 (spirit stats)    ──→ U4 (PDF spirits)
U1, U2, U3, U4      ──→ U5 (bug fixes)
```

U1 and U2 can run in parallel. U3 depends on U1. U4 depends on U2. U5 is the final cleanup.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| PDF layout overflow with spell effects | Truncate descriptions to 60 chars in PDF; full text in picker only |
| Spirit data from Monster Island may be too complex | Use only intensity 1-2 spirits; defer higher-intensity to future work |
| Breaking existing PDF output | Run full fixture regression after each PDF change |

---

## Success Criteria

- [ ] Sorcery spell picker shows effect descriptions via tooltips
- [ ] Spirit picker uses real spirit data with abilities and page refs
- [ ] PDF export for Arkat includes sorcery spell list with effects
- [ ] PDF export for Daka Fal includes bound spirit details
- [ ] PDF export for Waha includes both miracles and spirits
- [ ] All 235+ unit tests pass
- [ ] All E2E assertions pass
- [ ] No remaining code review issues from sprint review
