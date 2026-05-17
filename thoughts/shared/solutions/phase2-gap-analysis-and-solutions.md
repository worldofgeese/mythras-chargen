# Phase 2 Gap Analysis & Solution Approaches

**Project:** mythras-chargen  
**Date:** 2026-05-17  
**Status:** Exploration Phase  
**Context:** All 5 magic systems work, 94 cults classified, pickers for miracles/sorcery/spirits. Exploring solutions for remaining gaps.

---

## Executive Summary

The mythras-chargen has achieved full magic system coverage (Folk Magic, Theism, Animism, Sorcery, Mysticism) and successfully classifies 94 cults. However, four significant gaps remain:

1. **PDF Content for Non-Theist Cults** — Sorcery/animist PDFs may lack spell lists and spirit details
2. **Spirit Stat Blocks** — Currently 12 generic templates; real data exists in Monster Island/Bird in the Hand
3. **Mysticism Implementation** — System detected but unused; no UI for Kralori/Draconic cultures
4. **Sorcery Spell Effects** — 34 spell names exist; full descriptions from Mythras Core p.167-178 not integrated

This document explores approaches for each gap, comparing trade-offs and recommending paths forward.

---

## Gap 1: PDF Content for Non-Theist Cults

### Current State

**What Works:**
- PDF export generates without errors for all cult types
- Theist cults show miracles with rune tags
- Folk magic displays correctly
- Rune affinities appear on sheet

**What's Missing:**
- Sorcery cults: spell names appear in UI but PDF shows only generic "Sorcery (Cult Name) — Magic Points: X"
- Animist cults: bound spirit slots calculated but PDF shows only informational text, no spirit details
- Non-theist cults: no dedicated sections for spell effects, intensity, or spirit abilities

### Root Cause

The PDF export uses a single unified template that branches on `cultType.types`. For non-theist cults, the template falls back to minimal informational text rather than detailed spell/spirit data.

```javascript
// Current PDF export (lines 18945-18960)
if (pdfCultType.types.includes('sorcery') && y > 50) {
  const mp = CharacterData.sorceryResource || CharacterData.characteristics.POW || 0;
  txt(`SORCERY (${CharacterData.cult}) — Magic Points: ${mp}`, L, y, { bold: true, size: 7 });
  y -= 8;
  txt('Casting: Rune Affinity of spell | Shaping: Law Rune affinity | Intensity = Rune/10', L, y, { size: 5.5 });
  y -= 10;
}
```

### Approach A: Unified Enhanced Template

**Concept:** Extend the existing PDF template to include spell/spirit details for all magic types.

**Implementation:**
1. Store selected spells/spirits in `CharacterData.sorcerySpells[]` and `CharacterData.boundSpirits[]`
2. In PDF export, iterate over these arrays and render details:
   - **Sorcery:** spell name + resist type + intensity
   - **Animist:** spirit name + intensity + ability (trait/boost/dominate)
3. Use same 3-column layout as folk magic for consistency

**Pros:**
- ✅ Single PDF template — no duplication
- ✅ Consistent visual language across all magic types
- ✅ Minimal code change: reuse existing `wrapText()` and column logic
- ✅ Scales well if more magic types added later

**Cons:**
- ❌ Spell/spirit details are minimal (name + type only, no full descriptions)
- ❌ Requires populating `CharacterData.sorcerySpells[]` during chargen (currently not stored)
- ❌ Animist spirits need intensity/ability data in CharacterData (currently only names)
- ❌ PDF page space is limited; detailed spell effects would overflow

**Effort:** Medium (1–2 days)

---

### Approach B: Dedicated Magic Type Sections

**Concept:** Create separate PDF sections per magic type, each with its own layout optimized for that system.

**Implementation:**
1. After the unified "MAGIC" section, add type-specific sections:
   - `renderPDFSorcerySpells()` — 2-column table: spell name | resist | intensity
   - `renderPDFAnimistSpirits()` — 2-column table: spirit name | intensity | ability
   - `renderPDFMysticismTalents()` — 2-column table: path | talent | intensity
2. Each section has its own header, layout, and formatting
3. Sections only render if that magic type is present

**Pros:**
- ✅ Optimized layout per magic type (e.g., sorcery table with resist column)
- ✅ Easier to add full spell descriptions later (dedicated section has more space)
- ✅ Clear visual separation: players know where to find sorcery info
- ✅ Scales well for future magic types (Mysticism, Draconic, etc.)

**Cons:**
- ❌ More code duplication (separate render functions)
- ❌ PDF page space still limited; full descriptions won't fit
- ❌ Requires refactoring existing unified MAGIC section
- ❌ More complex to maintain (4+ render functions instead of 1)

**Effort:** Medium–High (2–3 days)

---

### Approach C: Hybrid Template with Spell Effect Tooltips

**Concept:** Keep unified template but add QR codes or footnotes linking to online spell reference.

**Implementation:**
1. Unified template shows spell names as before
2. Add small QR code or footnote reference (e.g., "Sorcery p.167") next to each spell
3. Players scan QR or look up page reference in Mythras Core
4. Optional: generate companion HTML page with full spell descriptions (not PDF)

**Pros:**
- ✅ Minimal PDF changes (just add QR codes)
- ✅ Full spell descriptions available online, not constrained by page space
- ✅ Players can access descriptions during play (QR → phone)
- ✅ Reduces PDF file size

**Cons:**
- ❌ Requires QR code generation library (new dependency)
- ❌ Players must have phone/internet to access descriptions
- ❌ Offline play unsupported
- ❌ Not all tables have page references in current data

**Effort:** Low–Medium (1 day)

---

### Recommendation: **Approach A (Unified Enhanced Template) → Approach B (Dedicated Sections) as Phase 3**

**Rationale:**
- **Short term (Phase 2):** Approach A is fastest and unblocks spell/spirit display. Reuse existing column layout, minimal refactoring.
- **Long term (Phase 3):** Approach B provides better UX and scales for future magic types. Refactor after Approach A is stable.

**Implementation Path:**
1. **Phase 2.1:** Ensure `CharacterData.sorcerySpells[]` and `CharacterData.boundSpirits[]` are populated during chargen
2. **Phase 2.2:** Extend PDF export to iterate over these arrays and render in 3-column layout
3. **Phase 3:** Refactor into dedicated sections per magic type

---

## Gap 2: Spirit Stat Blocks

### Current State

**What Exists:**
- 12 generic spirit templates in UI ("Healing Spirit Int 1", "Healing Spirit Int 2", etc.)
- Monster Island extraction has full NPC stat blocks (INT, POW, CHA, abilities, spectral combat %)
- Bird in the Hand extraction has similar data
- Animist chargen shows spirit slots but no way to assign real spirits

**What's Missing:**
- No UI to select/customize spirits with full stat blocks
- No way to assign Monster Island spirits to a character
- Spirit picker shows only names, not abilities or stats
- PDF export doesn't include spirit details (only slot count)

### Root Cause

Spirit data extraction is complete but not integrated into chargen. The UI currently treats spirits as simple name selections, not as complex entities with stats and abilities.

### Approach A: Simple Spirit Picker (Names Only)

**Concept:** Keep spirits as names; optionally add ability descriptions in a tooltip/modal.

**Implementation:**
1. In Step 9 (Cult Selection), add spirit picker similar to miracle picker
2. Spirits listed by name (e.g., "Healing Spirit", "Protective Spirit")
3. Optional: add "View Details" button → modal showing intensity, ability, typical stats
4. Store selected spirit names in `CharacterData.boundSpirits[]`
5. PDF shows spirit names + intensity (no full stats)

**Pros:**
- ✅ Minimal UI complexity
- ✅ Fast to implement (reuse miracle picker pattern)
- ✅ Suitable for chargen (players don't need full stat blocks at creation)
- ✅ GM can flesh out stats during play

**Cons:**
- ❌ Players don't see spirit abilities until they click "View Details"
- ❌ No stat block on PDF (GM must reference source book)
- ❌ Doesn't leverage Monster Island/Bird in the Hand data
- ❌ Limited for experienced players who want full mechanical detail

**Effort:** Low (1 day)

---

### Approach B: Full Stat Block Picker with Monster Island Data

**Concept:** Populate spirit picker with real stat blocks from Monster Island/Bird in the Hand extractions.

**Implementation:**
1. Parse Monster Island extraction into spirit templates:
   ```javascript
   const SPIRIT_TEMPLATES = [
     {
       name: "Nature Spirit (Trait)",
       ability: "Endowment",
       intensity: 2,
       ins: [9, 15],      // range
       pow: [13, 14],
       cha: [9, 15],
       spectralCombat: "50% + POW + CHA"
     },
     // ... more spirits
   ];
   ```
2. In spirit picker, show grid: Spirit Name | Intensity | Ability | Typical Stats
3. Player selects spirit → system generates random stats within range (or fixed for chargen)
4. Store full stat block in `CharacterData.boundSpirits[]`
5. PDF includes spirit name + ability + stats

**Pros:**
- ✅ Leverages existing Monster Island data
- ✅ Players see full mechanical detail at chargen
- ✅ PDF includes complete spirit stat blocks (GM-ready)
- ✅ Supports both random generation and fixed stats
- ✅ Scales for future spirit sources (Bird in the Hand, etc.)

**Cons:**
- ❌ Significant UI complexity (stat block grid, random generation)
- ❌ Requires parsing Monster Island JSON into usable templates
- ❌ PDF space limited for multiple spirits with full stats
- ❌ May overwhelm new players with mechanical detail
- ❌ Chargen already has 12 steps; adding spirit customization increases complexity

**Effort:** High (3–4 days)

---

### Approach C: Hybrid: Simple Picker + Optional Stat Block Export

**Concept:** Keep simple spirit picker in chargen, but add optional "Export Spirit Stat Blocks" button for GM prep.

**Implementation:**
1. Spirit picker remains simple (names only)
2. After chargen completes, add button: "Export Spirit Details for GM"
3. Button generates separate PDF/HTML with full stat blocks for all selected spirits
4. GM uses this export to flesh out spirits during play prep

**Pros:**
- ✅ Chargen stays simple (no stat block complexity)
- ✅ GM gets full stat blocks when needed
- ✅ Separates player-facing (simple) from GM-facing (detailed) content
- ✅ Leverages Monster Island data without cluttering chargen UI

**Cons:**
- ❌ Requires separate export function (code duplication)
- ❌ Two-step workflow: chargen → export (less integrated)
- ❌ Players don't see spirit abilities during chargen
- ❌ Stat blocks generated at export time (not stored in character)

**Effort:** Medium (2 days)

---

### Recommendation: **Approach A (Simple Picker) → Approach B (Full Stat Blocks) as Phase 3**

**Rationale:**
- **Short term (Phase 2):** Approach A unblocks spirit selection without UI complexity. Players can reference Monster Island for details if needed.
- **Long term (Phase 3):** Approach B provides full mechanical detail for experienced players and GMs. Requires UX refinement.

**Implementation Path:**
1. **Phase 2.1:** Implement simple spirit picker (reuse miracle picker pattern)
2. **Phase 2.2:** Add "View Details" modal showing ability + typical stats from Monster Island
3. **Phase 3:** Refactor into full stat block picker with random generation

---

## Gap 3: Mysticism Implementation

### Current State

**What Exists:**
- Mysticism system detected in `detectCultType()` (checks for Mysticism/Meditation skills)
- `references/mythras-raw/mysticism.json` fully extracted (paths, talents, mechanics)
- No cults currently use Mysticism (per current 94 one-pagers)
- Mysticism will become relevant when Kralori/Draconic cultures arrive

**What's Missing:**
- No UI for mysticism path selection
- No UI for talent selection within a path
- No resource display (Meditation skill, concentration, max intensity)
- PDF export shows only placeholder text

### Root Cause

Mysticism is a future feature. Current 94 cults don't use it, so there's no immediate pressure to implement. However, the system is already detected, so UI is needed for when Kralori/Draconic cults are added.

### Approach A: Placeholder UI (Minimal)

**Concept:** Add informational text to chargen and PDF, but no actual path/talent selection.

**Implementation:**
1. In Step 9 (Cult Selection), if mysticism cult detected:
   - Show message: "Mysticism system detected. Paths and talents will be available in a future update."
   - Disable further mysticism UI
2. PDF shows: "Mysticism (Path Name) — Meditation skill + concentration-based talents"
3. No data stored for mysticism

**Pros:**
- ✅ Minimal code (just informational text)
- ✅ Prepares UI for future mysticism cults
- ✅ No risk of incomplete implementation
- ✅ Fast (< 1 day)

**Cons:**
- ❌ Players can't create mysticism characters
- ❌ Blocks chargen if mysticism cult selected
- ❌ No actual mysticism mechanics implemented
- ❌ Doesn't leverage mysticism.json extraction

**Effort:** Low (< 1 day)

---

### Approach B: Talent Tree UI (Medium Complexity)

**Concept:** Implement path selection + talent picker with visual tree layout.

**Implementation:**
1. Parse `mysticism.json` into path structure:
   ```javascript
   const MYSTICISM_PATHS = [
     {
       name: "Path of Abjuration",
       talents: [
         { name: "Augment Endurance", type: "Augment", intensity: 1 },
         { name: "Augment Survival", type: "Augment", intensity: 1 },
         { name: "Invoke Denial (Food)", type: "Invoke", intensity: 1 },
         // ...
       ]
     },
     // ... more paths
   ];
   ```
2. In Step 9, if mysticism cult detected:
   - Show path selector (dropdown or radio buttons)
   - Show talent grid: Talent Name | Type | Intensity
   - Player selects talents up to Meditation limit
3. Store path name + selected talents in `CharacterData`
4. PDF shows path + talent list + meditation skill

**Pros:**
- ✅ Full mysticism mechanics supported
- ✅ Leverages mysticism.json extraction
- ✅ Scales well for future paths
- ✅ Supports both Mythras Core and AiG mysticism

**Cons:**
- ❌ Moderate UI complexity (path selector + talent grid)
- ❌ Requires understanding of talent intensity mechanics
- ❌ No Kralori/Draconic cults yet to test against
- ❌ May need refinement once real cults arrive

**Effort:** Medium (2–3 days)

---

### Approach C: Simplified Path Selection (Low Complexity)

**Concept:** Allow path selection but defer talent selection to GM/play.

**Implementation:**
1. In Step 9, if mysticism cult detected:
   - Show path selector (dropdown)
   - Show informational text: "Talents will be selected during play based on your Meditation skill"
2. Store path name in `CharacterData`
3. PDF shows path name + Meditation skill + note about talent selection

**Pros:**
- ✅ Minimal UI complexity
- ✅ Supports path selection (core mysticism concept)
- ✅ Defers talent complexity to GM
- ✅ Fast to implement (1 day)

**Cons:**
- ❌ Incomplete mysticism implementation
- ❌ Players don't see talent options at chargen
- ❌ Doesn't leverage mysticism.json extraction
- ❌ Requires GM to manage talent selection

**Effort:** Low–Medium (1 day)

---

### Recommendation: **Approach C (Simplified Path Selection) → Approach B (Talent Tree) as Phase 3**

**Rationale:**
- **Short term (Phase 2):** Approach C is fast and unblocks mysticism cults. Path selection is the core concept; talents can be refined later.
- **Long term (Phase 3):** Approach B provides full mechanical detail once Kralori/Draconic cults arrive and can be tested.

**Implementation Path:**
1. **Phase 2.1:** Implement path selector (dropdown)
2. **Phase 2.2:** Add informational text about talent selection during play
3. **Phase 3:** Refactor into full talent tree picker once real cults exist

---

## Gap 4: Sorcery Spell Effects

### Current State

**What Exists:**
- 34 sorcery spells extracted in `references/mythras-raw/sorcery.json`
- Each spell has name, resist type, and page reference
- Sorcery spell picker in chargen (Step 9)
- PDF export shows spell names only

**What's Missing:**
- Full spell descriptions (from Mythras Core p.167-178) not extracted
- No spell effect details in UI or PDF
- Players must reference source book for spell mechanics
- No integration of spell effects into character sheet

### Root Cause

Spell extraction focused on names and resist types (sufficient for picker). Full descriptions were not extracted due to complexity and space constraints.

### Approach A: Page Reference Links (Minimal)

**Concept:** Add page references to spell names; players look up descriptions in source book.

**Implementation:**
1. Enhance sorcery.json with page references:
   ```javascript
   {
     name: "Abjure (Substance/Process)",
     resist: "Special",
     page: "p.167"
   }
   ```
2. In spell picker, show spell name + page reference as tooltip
3. PDF shows spell name + page reference (e.g., "Abjure (p.167)")
4. Players reference Mythras Core for full descriptions

**Pros:**
- ✅ Minimal code change (just add page references)
- ✅ No need to extract full descriptions
- ✅ Encourages players to engage with source book
- ✅ Fast (< 1 day)

**Cons:**
- ❌ Players must have source book available
- ❌ No offline reference
- ❌ Doesn't provide mechanical clarity at chargen
- ❌ Offline play unsupported

**Effort:** Low (< 1 day)

---

### Approach B: Spell Effect Summaries (Medium Complexity)

**Concept:** Extract and store brief spell effect summaries (1–2 sentences per spell).

**Implementation:**
1. Manually extract spell summaries from Mythras Core p.167-178:
   ```javascript
   {
     name: "Abjure (Substance/Process)",
     resist: "Special",
     summary: "Prevents a specific substance or process from occurring within a defined area. Caster specifies what is abjured (e.g., 'fire', 'healing', 'movement').",
     page: "p.167"
   }
   ```
2. In spell picker, show spell name + summary in tooltip
3. PDF shows spell name + summary (if space allows)
4. Players get mechanical clarity without full descriptions

**Pros:**
- ✅ Players understand spell effects at chargen
- ✅ Offline reference available
- ✅ Summaries fit in PDF space
- ✅ Scales well for future spell lists

**Cons:**
- ❌ Manual extraction required (tedious, error-prone)
- ❌ Summaries may be incomplete or inaccurate
- ❌ Requires verification against source book
- ❌ Maintenance burden if spells updated

**Effort:** Medium (2–3 days for extraction + verification)

---

### Approach C: Companion Spell Reference (Low Complexity)

**Concept:** Generate separate HTML/PDF with full spell descriptions; link from chargen.

**Implementation:**
1. Manually extract full spell descriptions from Mythras Core p.167-178 into JSON
2. Generate companion HTML page: "Sorcery Spell Reference"
3. In chargen, add link: "View Spell Reference (HTML)"
4. PDF includes QR code linking to spell reference

**Pros:**
- ✅ Full spell descriptions available
- ✅ Offline reference (HTML file)
- ✅ Separates reference from chargen (cleaner UI)
- ✅ Reusable for other spell lists (folk magic, miracles)

**Cons:**
- ❌ Manual extraction required
- ❌ Requires separate HTML generation
- ❌ Two-step workflow (chargen → reference lookup)
- ❌ Maintenance burden

**Effort:** Medium–High (2–3 days)

---

### Approach D: Inline Spell Descriptions (High Complexity)

**Concept:** Embed full spell descriptions in chargen UI and PDF.

**Implementation:**
1. Extract full spell descriptions from Mythras Core p.167-178
2. In spell picker, show spell name + full description in expandable section
3. PDF includes spell descriptions (multi-page if needed)
4. Store descriptions in sorcery.json

**Pros:**
- ✅ Full mechanical detail available during chargen
- ✅ Offline reference in PDF
- ✅ No external links or QR codes needed
- ✅ Best UX for experienced players

**Cons:**
- ❌ Significant manual extraction work
- ❌ PDF space limited (may require multiple pages)
- ❌ UI complexity (expandable sections, long descriptions)
- ❌ Maintenance burden (descriptions must stay in sync with source book)
- ❌ Potential copyright issues with full text extraction

**Effort:** High (3–4 days)

---

### Recommendation: **Approach A (Page References) → Approach C (Companion Reference) as Phase 3**

**Rationale:**
- **Short term (Phase 2):** Approach A is fastest and unblocks spell selection. Page references are sufficient for chargen.
- **Long term (Phase 3):** Approach C provides full reference without cluttering chargen UI. Companion HTML is reusable.

**Implementation Path:**
1. **Phase 2.1:** Add page references to sorcery.json
2. **Phase 2.2:** Display page references in spell picker tooltip
3. **Phase 3:** Generate companion spell reference HTML

---

## Cross-Gap Dependencies & Sequencing

### Dependency Map

```
Gap 1 (PDF Content)
  ├─ Depends on: Gap 2 (Spirit Stat Blocks) — need spirit data to display
  └─ Depends on: Gap 4 (Spell Effects) — optional, nice-to-have

Gap 2 (Spirit Stat Blocks)
  ├─ Depends on: Monster Island/Bird in the Hand parsing
  └─ Independent of other gaps

Gap 3 (Mysticism)
  ├─ Independent of other gaps
  └─ Depends on: Kralori/Draconic cults (future)

Gap 4 (Spell Effects)
  ├─ Depends on: Manual extraction (tedious)
  └─ Independent of other gaps
```

### Recommended Sequencing (Phase 2)

1. **Week 1:** Gap 2 (Spirit Stat Blocks) — Approach A
   - Implement simple spirit picker
   - Reuse miracle picker pattern (fast)
   - Unblocks animist chargen

2. **Week 2:** Gap 1 (PDF Content) — Approach A
   - Extend PDF template to show sorcery spells + animist spirits
   - Depends on Gap 2 being complete
   - Reuse existing column layout

3. **Week 3:** Gap 3 (Mysticism) — Approach C
   - Implement path selector
   - Defer talent selection to GM
   - Fast, unblocks future Kralori cults

4. **Week 4:** Gap 4 (Spell Effects) — Approach A
   - Add page references to sorcery.json
   - Display in spell picker tooltip
   - Minimal code change

---

## Risk Assessment

| Gap | Approach | Risk | Mitigation |
|-----|----------|------|-----------|
| 1 | A (Unified Template) | PDF space overflow | Test with multi-spell characters; add page breaks if needed |
| 2 | A (Simple Picker) | Players want full stats | Add "View Details" modal; plan Approach B for Phase 3 |
| 3 | C (Path Selection) | Incomplete mysticism | Document as "Phase 2 placeholder"; plan Approach B for Phase 3 |
| 4 | A (Page References) | Players need offline reference | Plan Approach C (companion reference) for Phase 3 |

---

## Summary: Recommended Phase 2 Roadmap

| Gap | Approach | Effort | Benefit | Sequencing |
|-----|----------|--------|---------|-----------|
| 2 | A (Simple Spirit Picker) | 1 day | Unblocks animist chargen | Week 1 |
| 1 | A (Unified PDF Template) | 1–2 days | Shows sorcery/animist details | Week 2 (depends on Gap 2) |
| 3 | C (Path Selection) | 1 day | Unblocks mysticism cults | Week 3 |
| 4 | A (Page References) | < 1 day | Provides spell context | Week 4 |
| **Total** | | **3–4 days** | **All gaps addressed** | **4 weeks** |

### Phase 3 Roadmap (Future)

| Gap | Approach | Effort | Benefit | Trigger |
|-----|----------|--------|---------|---------|
| 2 | B (Full Stat Blocks) | 3–4 days | Full spirit mechanics | After Phase 2 stable |
| 1 | B (Dedicated Sections) | 2–3 days | Optimized per-magic layouts | After Phase 2 stable |
| 3 | B (Talent Tree) | 2–3 days | Full mysticism mechanics | When Kralori cults arrive |
| 4 | C (Companion Reference) | 2–3 days | Full spell descriptions | After Phase 2 stable |

---

## Conclusion

All four gaps can be addressed in Phase 2 with lightweight, pragmatic approaches that unblock chargen without overengineering. Each approach is designed to be extended in Phase 3 once real-world usage and feedback inform the next iteration.

**Key Principle:** Ship Phase 2 approaches quickly (3–4 days), gather feedback, then refine in Phase 3 with more sophisticated UX.
