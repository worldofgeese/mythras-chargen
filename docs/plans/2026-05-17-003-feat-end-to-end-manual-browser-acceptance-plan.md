# End-to-End Manual Browser Acceptance Tests

Created: 2026-05-17  
Status: active  
Type: feat  

---

## Summary

A comprehensive end-to-end acceptance test suite using `/agent-browser` to manually create characters through the full Wizard Mode — no randomizers, no auto-gen, no scripts — verifying every magic system, culture, combat style, skill disambiguation, and starting equipment selection. Each character is then verified in both Play Mode and PDF export to confirm full-coverage fidelity to all Wizard Mode selections.

This is the **final gate** before the project can be considered feature-complete. It validates that:
1. All 5 magic systems work correctly through the UI
2. All cultures produce valid characters
3. Combat styles resolve correctly
4. Skill disambiguation (placeholder patterns) works
5. Starting equipment is assigned properly
6. Existing fixtures remain valid (regression)
7. PDFs are faithful to Play Mode (fungible)
8. Play Mode is faithful to Wizard Mode selections

---

## Problem Frame

The chargen has 235 unit tests and a 100-character random generation test, but:
- The random test uses `App.generateRandomCharacter()` — it never touches the UI
- No test verifies the full wizard flow step-by-step as a human would use it
- No test verifies Play Mode displays all wizard selections
- No test verifies PDF output matches Play Mode
- The new magic system code (ADR-0006) has never been tested through the actual UI
- Existing fixtures have `cultType: "not set"` — they predate the magic system work

---

## Scope

### In Scope
- Manual step-by-step character creation via agent-browser (clicking through each wizard step)
- One character per magic system type (theist, animist, sorcery, hybrid, mysticism-stub)
- One character per culture (to verify culture-specific skills, equipment, combat styles)
- Verification of Play Mode rendering for each character
- Verification of PDF export for each character (download + content check)
- Regression validation of all 14 existing fixtures (load → verify Play Mode + PDF)
- Skill disambiguation verification (placeholder patterns like "(any)" get resolved)
- Combat style trait verification
- Starting equipment verification against social class
- Magic resource pool verification (Devotional Pool, Bound Spirit Slots, Magic Points)

### Out of Scope (Deferred)
- Performance testing (page load times, PDF generation speed)
- Mobile/responsive layout testing
- Accessibility testing (screen reader, keyboard nav)
- Multi-browser testing (Chrome only via agent-browser)
- Concurrent user testing

---

## Characters to Create

### Coverage Matrix

| # | Character | Culture | Career | Cult | Magic Type | Tests |
|---|---|---|---|---|---|---|
| 1 | Theist baseline | Sartarite | Warrior | Orlanth | Theist | Devotional Pool, miracles, rune casting |
| 2 | Pure Animist | Praxian | Shaman | Daka Fal | Animist | Bound Spirit Slots, Spirit Rune, no miracles |
| 3 | Pure Sorcery | God Forgot | Scholar | Arkat | Sorcery | Magic Points, Law Rune, no miracles |
| 4 | Hybrid (Theist+Animist) | Praxian | Beast Handler | Waha | Hybrid | BOTH pools shown, miracle + spirit sections |
| 5 | Hybrid (different) | Praxian | Warrior | Storm Bull | Hybrid | Verify second hybrid cult works |
| 6 | Esrolian culture | Esrolian | Priest | Ernalda | Theist | Culture-specific skills, equipment |
| 7 | Balazaring culture | Balazaring | Hunter | Foundchild | Theist | Primitive culture, limited equipment |
| 8 | Lunar culture | Lunar Provincial | Warrior | Seven Mothers | Theist | Lunar-specific runes |
| 9 | Telmori culture | Telmori Hsunchen | Scout | Telmor | Theist/Animist? | Hsunchen-specific, shapeshift |
| 10 | Combat specialist | Sartarite | Warrior | Humakt | Theist | Multiple combat styles, weapon selection |

### Per-Character Test Protocol

For each character created:

1. **Wizard Mode (creation)**
   - Step 1: Select culture → verify culture skills populate
   - Step 2: Roll/assign characteristics → verify derived attributes calculate
   - Step 3: Select career → verify career skills populate
   - Step 4: Select combat style(s) → verify traits shown
   - Step 5: Allocate skill points → verify no placeholders remain
   - Step 6: Select folk magic spells → verify spell list matches culture
   - Step 7: Select equipment → verify social class constraints
   - Step 8: Select passions → verify cult-appropriate passions available
   - Step 9: Select cult + magic → verify correct magic system UI appears
   - Final: Complete character → verify summary

2. **Play Mode (verification)**
   - Switch to Play Mode → verify ALL wizard selections appear
   - Check magic section shows correct system (not generic)
   - Check combat styles show with traits
   - Check skills show final calculated values
   - Check equipment is listed
   - Check hit points per location are correct
   - Check action points, strike rank, movement are correct

3. **PDF Export (verification)**
   - Export PDF → verify download completes
   - Check PDF contains all the same data as Play Mode
   - Check magic system section is correct
   - Check no "undefined" or "null" values appear
   - Check layout is readable (no overflow, no missing sections)

---

## Implementation Units

### U1. Set up agent-browser test infrastructure

**Goal:** Establish the agent-browser session, server, and test harness for manual character creation.  
**Dependencies:** None  
**Files:**
- `tests/e2e/README.md` (test protocol documentation)
- `tests/e2e/test-results/` (directory for screenshots + results)

**Approach:**
- Start the chargen server on port 8765
- Initialize agent-browser session with the chargen URL
- Establish screenshot-at-each-step protocol for evidence
- Define the verification checklist format for each character

**Verification:** agent-browser can navigate to the chargen, take a screenshot, and interact with form elements.

### U2. Create Theist baseline character (Orlanth)

**Goal:** Full manual creation of a Sartarite Orlanth warrior — the most common cult type.  
**Dependencies:** U1  
**Files:** `tests/e2e/test-results/01-theist-orlanth.md`

**Approach:**
- Navigate each wizard step manually via agent-browser
- At Step 9 (cult selection): verify Devotional Pool = POW/2 appears
- At Step 9: verify miracle selection is available and required
- At Step 9: verify Rune Affinity casting info shown
- Switch to Play Mode: verify all selections
- Export PDF: verify all selections

**Test scenarios:**
- Devotional Pool displays correct value (POW/2)
- Miracle selection appears and is mandatory
- Rune Affinities show correct runes for Orlanth (Air, Movement)
- Play Mode shows "Rune Magic" section with devotional pool
- PDF contains devotional pool and miracles

### U3. Create Pure Animist character (Daka Fal)

**Goal:** Full manual creation of a Praxian Daka Fal shaman — pure animist, no theist path.  
**Dependencies:** U1  
**Files:** `tests/e2e/test-results/02-animist-daka-fal.md`

**Approach:**
- Navigate wizard with Praxian culture, Shaman career
- At Step 9: select Daka Fal cult
- Verify: NO Devotional Pool shown
- Verify: Bound Spirit Slots = CHA/2 shown
- Verify: Spirit Rune casting info shown
- Verify: NO miracle selection required (can proceed without selecting miracles)
- Play Mode: verify animist section, not theist
- PDF: verify animist resources

**Test scenarios:**
- No "Devotional Pool" appears anywhere
- "Bound Spirit Slots: [CHA/2 value]" displays correctly
- Spirit Rune affinity shown as casting mechanism
- Wizard allows completion without miracle selection
- Play Mode shows "Spirit Magic" or "Animism" section
- PDF shows bound spirit slots, not devotional pool

### U4. Create Pure Sorcery character (Arkat)

**Goal:** Full manual creation of a God Forgot Arkat scholar — pure sorcery, no theist path.  
**Dependencies:** U1  
**Files:** `tests/e2e/test-results/03-sorcery-arkat.md`

**Approach:**
- Navigate wizard with God Forgot culture (if available), Scholar career
- At Step 9: select Arkat cult
- Verify: NO Devotional Pool shown
- Verify: Magic Points resource shown
- Verify: Law Rune / Rune Affinity casting info shown
- Verify: NO miracle selection required
- Play Mode: verify sorcery section
- PDF: verify sorcery resources

**Test scenarios:**
- No "Devotional Pool" appears
- "Magic Points" resource displays
- Law Rune affinity shown as casting mechanism
- Wizard allows completion without miracle selection
- Play Mode shows "Sorcery" section
- PDF shows magic points, not devotional pool

### U5. Create Hybrid character (Waha)

**Goal:** Full manual creation of a Praxian Waha beast handler — hybrid theist+animist.  
**Dependencies:** U1  
**Files:** `tests/e2e/test-results/04-hybrid-waha.md`

**Approach:**
- Navigate wizard with Praxian culture, Beast Handler career
- At Step 9: select Waha cult
- Verify: BOTH Devotional Pool AND Bound Spirit Slots shown
- Verify: Miracle selection IS available (theist path)
- Verify: Animist section also shown (spirit path)
- Play Mode: verify both systems displayed
- PDF: verify both systems in output

**Test scenarios:**
- Both "Devotional Pool: [POW/2]" AND "Bound Spirit Slots: [CHA/2]" display
- Miracle selection is available
- Both theist and animist sections render in Play Mode
- PDF contains both magic resource pools
- UI clearly labels which is theist path vs shaman path

### U6. Create second Hybrid character (Storm Bull)

**Goal:** Verify hybrid detection works for a different cult (not just Waha).  
**Dependencies:** U1  
**Files:** `tests/e2e/test-results/05-hybrid-storm-bull.md`

**Approach:**
- Navigate wizard with Praxian culture, Warrior career
- At Step 9: select Storm Bull cult
- Same hybrid verifications as U5

**Test scenarios:**
- Storm Bull correctly detected as hybrid
- Both resource pools display
- Different from Waha in available miracles but same dual-system structure

### U7. Create Esrolian character (culture coverage)

**Goal:** Verify Esrolian culture-specific skills, equipment, and combat styles work.  
**Dependencies:** U1  
**Files:** `tests/e2e/test-results/06-esrolian-ernalda.md`

**Approach:**
- Navigate wizard with Esrolian culture, Priest career, Ernalda cult
- Verify culture-specific skills populate correctly
- Verify combat style options are Esrolian-appropriate
- Verify starting equipment matches social class + culture
- Full Play Mode + PDF verification

**Test scenarios:**
- Esrolian cultural skills appear (not Sartarite ones)
- Combat styles are culture-appropriate
- Equipment reflects Esrolian social class
- Folk magic spells match Esrolian list (if culture-specific)

### U8. Create Balazaring character (primitive culture)

**Goal:** Verify Balazaring (primitive) culture works — limited equipment, specific skills.  
**Dependencies:** U1  
**Files:** `tests/e2e/test-results/07-balazaring-foundchild.md`

**Approach:**
- Navigate wizard with Balazaring culture, Hunter career, Foundchild cult
- Verify primitive culture constraints (limited metal weapons, specific skills)
- Full Play Mode + PDF verification

**Test scenarios:**
- Balazaring cultural skills are correct (Survival, Track, etc.)
- Equipment options reflect primitive culture (no plate armor)
- Folk magic matches Balazaring list (Beastcall, Bladesharp, etc.)

### U9. Create Lunar character

**Goal:** Verify Lunar Provincial culture and Seven Mothers cult work.  
**Dependencies:** U1  
**Files:** `tests/e2e/test-results/08-lunar-seven-mothers.md`

**Approach:**
- Navigate wizard with Lunar Provincial culture, Warrior career, Seven Mothers cult
- Verify Lunar-specific rune affinities (Moon rune)
- Full Play Mode + PDF verification

**Test scenarios:**
- Lunar cultural skills appear
- Moon rune affinity available
- Seven Mothers miracles accessible
- Theist magic system (Devotional Pool) correct

### U10. Create Telmori character (Hsunchen)

**Goal:** Verify Telmori Hsunchen culture and Telmor cult work.  
**Dependencies:** U1  
**Files:** `tests/e2e/test-results/09-telmori-telmor.md`

**Approach:**
- Navigate wizard with Telmori Hsunchen culture, Scout career, Telmor cult
- Verify Hsunchen-specific features (shapeshifting-related?)
- Full Play Mode + PDF verification

**Test scenarios:**
- Telmori cultural skills appear
- Telmor cult correctly classified (theist or animist?)
- Shapeshifting or beast-related features if applicable

### U11. Create combat-focused character (Humakt)

**Goal:** Verify multiple combat styles, weapon selection, and combat-specific features.  
**Dependencies:** U1  
**Files:** `tests/e2e/test-results/10-combat-humakt.md`

**Approach:**
- Navigate wizard with Sartarite culture, Warrior career, Humakt cult
- Focus on combat style selection: pick multiple styles if available
- Verify weapon traits display correctly
- Verify combat style traits (e.g., Sartarite Warrior = Sword + Shield)
- Full Play Mode + PDF verification

**Test scenarios:**
- Combat style(s) show correct weapons and traits
- Weapon damage, size, reach, AP display correctly
- Multiple combat styles can be selected if career allows
- Play Mode combat section is complete
- PDF combat section matches Play Mode exactly

### U12. Validate existing fixtures (regression)

**Goal:** Load each of the 14 existing fixture files and verify they still work in Play Mode and PDF.  
**Dependencies:** U1  
**Files:** `tests/e2e/test-results/11-fixture-regression.md`

**Approach:**
- For each fixture JSON in `fixtures/`:
  - Load via the chargen's import/load mechanism
  - Switch to Play Mode
  - Verify no errors, no "undefined", no missing sections
  - Export PDF
  - Verify PDF generates without error
- Note: fixtures have `cultType: "not set"` — verify the app handles this gracefully (falls back to detection)

**Test scenarios:**
- All 14 fixtures load without JavaScript errors
- All 14 display correctly in Play Mode
- All 14 generate PDFs without error
- `cultType: "not set"` triggers auto-detection (not a crash)
- Magic sections render appropriately based on detected cult type

### U13. PDF ↔ Play Mode fidelity check

**Goal:** Systematic comparison that PDF output is fungible with Play Mode for every character created.  
**Dependencies:** U2, U3, U4, U5, U6, U7, U8, U9, U10, U11  
**Files:** `tests/e2e/test-results/12-pdf-fidelity.md`

**Approach:**
- For each of the 10 manually-created characters:
  - Screenshot Play Mode
  - Export PDF
  - Compare section-by-section: characteristics, skills, combat, magic, equipment, passions
  - Flag any discrepancy where PDF shows different data than Play Mode
- This is the "fungibility" test — a player should be able to use either interchangeably

**Test scenarios:**
- Characteristics match between Play Mode and PDF
- All skills (with final values) match
- Combat styles + weapons match
- Magic system section matches (correct type, correct resources, correct spells)
- Equipment matches
- Hit points per location match
- Action points, strike rank match
- Passions match
- Rune affinities match
- No "undefined", "null", "NaN" in either output

### U14. Skill disambiguation verification

**Goal:** Verify that placeholder skill patterns (e.g., "(any)", "(local)") are properly resolved during wizard flow.  
**Dependencies:** U2, U3, U4  
**Files:** `tests/e2e/test-results/13-skill-disambiguation.md`

**Approach:**
- During character creation, watch for skills with placeholder patterns
- Verify the wizard prompts for disambiguation (e.g., "Lore (which?)")
- Verify the final character has no unresolved placeholders
- Check against the patterns from test-100-chars.mjs:
  ```
  (any), (local), (any other), (Primary), (Secondary),
  (Primary Catch), (Secondary Catch), (Specific ...), 
  (Hunting Related), (Regional or Specific...), (Shipboard...),
  (Physiological...), (Alchemical...)
  ```

**Test scenarios:**
- No unresolved placeholder patterns in final character data
- Wizard provides disambiguation UI when placeholder skills appear
- Disambiguated skills show the chosen specialization in Play Mode and PDF

### U15. Write final acceptance report

**Goal:** Compile all test results into a single acceptance report with pass/fail summary.  
**Dependencies:** U2, U3, U4, U5, U6, U7, U8, U9, U10, U11, U12, U13, U14  
**Files:** `tests/e2e/acceptance-report.md`

**Approach:**
- Aggregate all per-character test results
- Create a coverage matrix showing what was tested
- List any failures or issues discovered
- Provide go/no-go recommendation

**Verification:** Report exists, all tests have results, coverage matrix is complete.

---

## Key Technical Decisions

- **agent-browser over Playwright scripts** — The user explicitly requires manual browser interaction, not scripted automation. agent-browser provides accessibility-tree snapshots and element refs for reliable click-by-click interaction.
- **No randomizers** — Every selection is deliberate. This tests the UI paths a real player would take, not the random generation API.
- **10 new characters + 14 fixture regression** — Covers all 5 magic systems, all 6 cultures, multiple careers, and validates existing data still works.
- **PDF fungibility** — PDFs must contain identical information to Play Mode. This is a hard requirement, not a nice-to-have.
- **Screenshot evidence** — Each step is screenshotted for human review if needed.

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| God Forgot culture may not exist in chargen data | Fall back to another culture for Arkat; file bug if missing |
| Fixtures with `cultType: "not set"` may crash | Verify graceful fallback to `detectCultType()` |
| PDF generation may timeout for complex characters | Set generous timeouts; retry once |
| agent-browser may not handle all form elements | Fall back to direct DOM interaction via evaluate |
| Some wizard steps may not exist for all cult types | Document which steps are skipped and why |

---

## Sequencing

```
U1 (infrastructure) → U2-U11 (character creation, parallelizable)
                    → U12 (fixture regression, independent)
                    → U13 (PDF fidelity, after U2-U11)
                    → U14 (disambiguation, after U2-U4)
                    → U15 (report, after everything)
```

U2 through U11 can run sequentially in one agent-browser session (same browser, different characters). U12 is independent. U13 and U14 depend on characters being created first.
