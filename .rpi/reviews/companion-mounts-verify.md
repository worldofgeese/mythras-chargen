# Verification Report: Companion Mounts

**Date:** 2026-05-04
**Spec:** `.rpi/specs/companion-mounts.md`
**Design:** `.rpi/designs/companion-mounts.md`
**Status:** PASS (0 blockers, 1 warning, 1 note)

## Scenario Results

| # | Scenario | Status | Evidence |
|---|----------|--------|----------|
| 1 | Companion stat block displays in Play Mode | PASS | `index.html:17278` — `renderPlayCompanions()` renders name, species, characteristics, hit locations, attacks, armor, movement, damage modifier |
| 2 | Companion HP can be tracked during play | PASS | `index.html:17303-17304` — `<input type="number">` with `onchange` handler updates `CharacterData.companions[ci].hitLocations[loc].current` and calls `App.saveToLocalStorage()` |
| 3 | Companion data persists through JSON save/load | PASS | `index.html:13542` — `toJSON()` deep-clones companions; `index.html:13590` — `fromJSON()` restores `data.companions \|\| []` |
| 4 | Companion appears in PDF export | PASS | `index.html:17687-17708` — PDF export section renders companion name, species, stats, attacks, hit locations, notes |
| 5 | Characters without companions show no section | PASS | `index.html:17282` — early return with empty innerHTML when `companions.length === 0`; PDF at line 17689 gates on `companions.length > 0` |
| 6 | Vasana pre-gen loads with correct bison stats | PASS | `fixtures/vasana.json` — Molon: STR 36, CON 17, SIZ 34, DEX 12, POW 10; Head Butt 50% 2D10+3D6; Trample 50% 6D6; movement 12, armor 3, DM +3D6. Combat style: "Colymar Bison Cavalry" |
| 7 | Ionara pre-gen loads with correct horse stats | PASS | `fixtures/ionara.json` — Etza: STR 30, CON 17, SIZ 30, DEX 20, POW 17; Bite 25% 1D8+3D6; Kick 25% 1D6+3D6; Rear & Plunge 25% 2D6+3D6; Trample 25% 4D6; movement 12, armor 1, DM +3D6. Combat style: "Grazelander Noble" |

## Completeness

- [x] `companions` array field in CharacterData model (`index.html:13437`)
- [x] Play Mode rendering (`renderPlayCompanions` at line 17278)
- [x] PDF export section (line 17687-17708)
- [x] JSON save/load persistence (`toJSON` line 13542, `fromJSON` line 13590)
- [x] Vasana fixture with Molon companion
- [x] Ionara fixture with Etza companion
- [x] Companion HP tracking (interactive inputs in Play Mode)
- [x] `validateLoadedData()` does not reject companions (line 13988 — only checks skill disambiguation)

## Correctness

- All fixture data matches spec assertions exactly
- Skill point totals verified: culturalSkills=100, careerSkills=100, bonusSkills=100 for both fixtures
- Miracles validated against CULTS_DATA: Maran Gor has Blast Earth/Create Fissure/Shake Earth; Orlanth has Lightning/Shield (subcult entries, cleaned of OCR artifacts)

## Coherence

- Companion rendering follows existing Play Mode patterns (inline styles, grid layouts, table formatting)
- PDF export follows existing PDF generation pattern (coordinate-based text placement with jsPDF)
- JSON serialization matches existing deep-clone pattern used by other array fields

## Findings

### Warning (1)

1. **No automated E2E test for companion rendering** — The 100-char generation test validates random character generation but does not load fixtures or test companion display.
   - File: `test-100-chars.mjs`
   - Impact: Regression could go undetected
   - Recommendation: Add fixture-load test scenario

### Note (1)

1. **Ionara's culture field says "Sartarite (Heortling)"** but her homeland says "Grazelands (Pure Horse People)" — acceptable for `charMethod: "pregen"` which bypasses culture validation, but semantically misleading.
   - File: `fixtures/ionara.json:44`
   - Impact: Cosmetic only for pre-gens; would fail if culture-specific logic were applied
   - Decision documented in `.rpi/designs/companion-mounts.md` (out of scope: adding Grazelander culture)

## Test Results

- 100/100 character generation tests: PASS
- No TODO/FIXME/HACK markers found in companion-related code
