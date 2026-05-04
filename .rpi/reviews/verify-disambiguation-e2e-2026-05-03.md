# Verification Report: Skill/Language Disambiguation E2E

**Date:** 2026-05-03
**Scope:** ADR-004 conformance, disambiguation across Wizard Mode → Play Mode → PDF export
**Overall Status:** PASS with 3 WARNINGS

## Summary

| Severity | Count |
|----------|-------|
| Blocker  | 0     |
| Warning  | 3     |
| Note     | 1     |

---

## Completeness

### ADR-004 Language Resolution Table ✓

All 9 cultures from ADR-004 are implemented in `DISAMBIGUATION_LISTS.Language` (index.html:882-893) and `CULTURE_NATIVE_LANGUAGE` (index.html:902-912):

| Culture | ADR-004 Says | Implementation | Status |
|---------|-------------|----------------|--------|
| Sartarite (Heortling) | Language (Heortling) + Tradetalk | ✓ First option: Heortling, includes Tradetalk | PASS |
| Esrolian | Language (Esrolian) + Tradetalk | ✓ | PASS |
| Lunar Heartland | Language (New Pelorian) + Tradetalk | ✓ | PASS |
| Lunar Provincial | Language (Local) + Tradetalk | ✓ | PASS |
| Praxian | Language (Praxian) + Tradetalk | ✓ | PASS |
| Balazaring | Language (Balazaring), NO Tradetalk | ✓ Only option: Balazaring | PASS |
| Tarshite | Language (Tarshite) + Tradetalk | ✓ | PASS |
| God Forgot | Language (Brithini) + Tradetalk | ✓ | PASS |
| Telmori Hsunchen | Language (Heortling), NO Tradetalk | ✓ Only option: Heortling | PASS |

### Fixtures Audit ✓

All 19 fixture files checked. **Zero** contain `(any)`, `(local)`, or `(any other)`. All skills are fully resolved to concrete specializations (e.g., `Language (Heortling)`, `Lore (Sartar)`, `Craft (Bowyer)`).

### Wizard Mode Disambiguation UI ✓

- `isAnySkill()` at index.html:943-944 correctly detects `(any|local|any other)` patterns
- Cultural skills (line 14589-14613): renders datalist with options from `disambiguateSkill()`
- Career skills (line ~15373): same pattern applied
- Free-text entry allowed per ADR-004: "Player can still type a custom language"

### Random Character Generation ✓

- Lines 15881-15886: `disambiguateSkill(skillName, culture.name, true)` called for `(any)` cultural skills
- Line ~15996: Same for career skills

---

## Correctness

### Scenario 1: Language (any) in Wizard → Play → PDF

**Expected:** User selects culture → `Language (any)` shows datalist → user picks concrete → Play Mode shows concrete → PDF exports concrete
**Actual:** Implementation matches. `disambiguateAndUpdateFreeText()` (line 14698) stores concrete key in `CharacterData.culturalSkills`. `compileAllSkills()` (line ~16641) reads keys verbatim for both Play Mode and PDF.
**Status:** PASS

### Scenario 2: Primitive cultures don't offer Tradetalk

**Expected:** Balazaring and Telmori only show their native language, no Tradetalk
**Actual:** `DISAMBIGUATION_LISTS.Language.Balazaring = ['Balazaring']` and `Telmori Hsunchen = ['Heortling']`
**Status:** PASS

### Scenario 3: Lore/Art/Craft/Culture disambiguation

**Expected:** All `(any)` professional skills show appropriate options
**Actual:** Lists defined at lines 895-898. Lore has 16 options, Art 7, Craft 23, Culture dynamically populated.
**Status:** PASS

---

## Findings

### WARNING 1: Unresolved skill can leak if user allocates points without selecting specialization

**File:** index.html:14610
**Evidence:**
```javascript
onchange="App.updateSkillPoints('cultural', '${currentSelected || skillName}', parseInt(this.value))"
```
When `currentSelected` is empty (user hasn't picked from datalist), this stores points under the raw `skillName` (e.g., `"Language (any)"`). This survives into Play Mode and PDF unchecked.

**Impact:** A user who sets points on a `(any)` skill without first selecting a specialization will see "Language (any)" in Play Mode and PDF.

**Mitigation:** Low probability — the UI shows the datalist prominently, and most users will select before allocating. But no guardrail exists.

**Recommendation:** Either disable the points input until disambiguation is selected, or add a validation check in `validateCurrentStep()` for step 5 that scans `CharacterData.culturalSkills` keys for `isAnySkill()` matches.

---

### WARNING 2: Descriptive placeholder skills not caught by isAnySkill()

**File:** index.html:943-944 (regex), index.html:757 (CAREERS_DATA)
**Evidence:** The regex `/\((any|local|any other)\)/i` does not match these career professional skills:

| Career | Skill | Issue |
|--------|-------|-------|
| Crafter | `Craft (Primary)`, `Craft (Secondary)` | Not disambiguated |
| Fisher | `Lore (Primary Catch)`, `Lore (Secondary Catch)` | Not disambiguated |
| Beast Handler | `Healing (Specific Species)`, `Lore (Specific Species)`, `Teach (Specific Species)` | Not disambiguated |
| Hunter | `Craft (Hunting Related)`, `Lore (Regional or Specific Species)` | Not disambiguated |
| Physician | `Craft (Specific Physiological Speciality)`, `Lore (Specific Alchemical Speciality)` | Not disambiguated |
| Sailor | `Craft (Specific Shipboard Speciality)` | Not disambiguated |
| Scholar | `Lore (Primary)`, `Lore (Secondary)` | Not disambiguated |

**Impact:** These 12 descriptive placeholders render as literal text in wizard, survive into Play Mode display and PDF export as-is. A character who selects "Crafter" career will have `Craft (Primary)` shown on their sheet — not a real skill name.

**Recommendation:** Either:
1. Expand `isAnySkill()` to catch patterns like `(Primary|Secondary|Specific.*|Hunting Related|Regional.*)`, OR
2. Add a `DESCRIPTIVE_PLACEHOLDERS` mapping in CAREERS_DATA that pre-resolves these to datalist options (e.g., `Craft (Primary)` → full Craft list)

---

### WARNING 3: Same gap applies to random character generation

**File:** index.html:~15883-15996
**Evidence:** `generateRandomCharacter()` only calls `disambiguateSkill()` which relies on `isAnySkill()`. Descriptive placeholders from Warning 2 pass through unresolved.

**Impact:** Random characters from careers like Crafter, Fisher, Beast Handler, Hunter, Physician, Sailor, Scholar will have literal `"Lore (Primary Catch)"` or `"Craft (Specific Physiological Speciality)"` in their data.

**Recommendation:** Same fix as Warning 2 — expand detection or pre-resolve in career data.

---

### NOTE 1: validateCurrentStep() has no disambiguation completeness check

**File:** index.html:13618-13654
**Evidence:** Step 5 validation only checks total points = 100 and folk magic spell count. No check for remaining `(any)` or descriptive placeholder keys.

**Recommendation:** Add a final pass over `CharacterData.culturalSkills` + `CharacterData.careerSkills` keys to reject any that match known placeholder patterns before allowing progression to step 6.

---

## Coherence

- Naming conventions: Consistent — all disambiguation functions use `category + ' (' + option + ')'` format
- Error handling: Toast notifications for validation failures — consistent pattern
- Code organization: Disambiguation logic is co-located (lines 878-944) — good separation
- No unnecessary dependencies introduced

---

## Verdict

The **ADR-004 language disambiguation** is correctly and completely implemented for the happy path. All 9 cultures resolve correctly, fixtures are clean, and the Wizard → Play → PDF pipeline works as designed.

The **3 warnings** are edge cases where either user behavior (allocating points without selecting) or career-specific descriptive placeholders bypass the disambiguation system. These are real bugs but low-severity because:
1. Warning 1 requires deliberate user action against the UI flow
2. Warnings 2-3 only affect specific careers (Crafter, Fisher, Beast Handler, Hunter, Physician, Sailor, Scholar)

**No blockers.** Ship-safe for the primary use case (language disambiguation per ADR-004). The descriptive placeholder gap should be addressed before the next release if those careers are actively used in playtesting.
