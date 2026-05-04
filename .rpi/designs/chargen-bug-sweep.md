# Design: Character Generator Bug Sweep (19 Issues)

**Status:** active
**Date:** 2026-05-04
**Upstream:** `.rpi/designs/placeholder-skill-disambiguation.md` (extends)

## Problem

The character creation wizard and PDF export have 19 bugs across three clusters: blocking UI issues (miracles unclickable, specializations unresolvable, rune duplicates), data/logic errors (combat style split, missing skills, blank weapon%, Customs()), and PDF layout collisions (sections overlapping, wasted space).

## Approach: Three Phases

### Phase 1: Blocking UI Fixes (5 issues)

#### 1A. Miracle picker — wrong element passed

**Root cause:** Line 15302 passes `div` (the full Step 9 container) to `renderMiraclePicker()`, which sets `container.innerHTML`, destroying the entire step UI including cult cards.

**Fix:** Pass the nested `#miracle-picker` element:
```javascript
// Line 15302: was this.renderMiraclePicker(div)
const pickerEl = div.querySelector('#miracle-picker') || document.createElement('div');
this.renderMiraclePicker(pickerEl);
```

#### 1B. Rune dropdown duplicate prevention

**Root cause:** Lines 14750-14769 render all RUNES_DATA options for each dropdown with no filtering.

**Fix:** Each dropdown's `<option>` list excludes runes already selected in other slots:
```javascript
const selectedRunes = [runeAffinities.primary, runeAffinities.secondary, runeAffinities.tertiary];
RUNES_DATA.filter(r => r.short_name === currentValue || !selectedRunes.includes(r.short_name))
```

#### 1C. Extend specialization system to Passions and Combat Styles

**Extends:** `placeholder-skill-disambiguation.md` design.

**Passion subjects:**
- When `needsSubject: true`, render a text input with datalist from `subjectSuggestions`
- For "Loyalty (City)" literal: auto-resolve to homeland name (e.g., "Loyalty (Trilus)") with editable override
- `parsePlaceholderSkill()` regex extended to include Passion category

**Combat Style naming:**
- Cultural combat styles already have names from culture data — ensure these propagate to both the COMBAT STYLES section and SKILLS section consistently
- Speciality combat styles: prompt for name via text input (free-text, no datalist needed)

#### 1D. Toast blocker resolution

**Root cause:** Validation fires `needsDisambiguation()` on unresolved placeholders, but no input exists in Step 8 to resolve them.

**Fix:** Move specialization resolution to the career step itself. When a professional skill checkbox is checked and the skill `needsDisambiguation()`, immediately show an inline text input + datalist below the checkbox. The skill is only "selected" once a specialization is provided. This makes the toast unreachable because the user can't have an unresolved placeholder.

#### 1E. Cult passion visibility

**Root cause:** `selectCult()` silently pushes `Loyalty (cultName)` at `POW+CHA` with no UI feedback.

**Fix:**
- After cult selection, show a "Cult Passion Added" notice inline in Step 9: "Loyalty (Yelmalio): 21% has been added to your passions"
- Include it in the passions section of Step 6 if the user navigates back (already in `CharacterData.passions`, just needs rendering)

---

### Phase 2: Data/Logic Fixes (7 issues)

#### 2A. Customs() display name

**Root cause:** `standardSkills` array at line 16990 contains literal `'Customs()'`. The PDF renders `skill.name` verbatim.

**Fix:** In `compileAllSkills()`, when the skill name is `'Customs()'`, replace with `Customs (${CharacterData.culture || ''})`. Same in PDF export.

#### 2B. Combat style unification

**Root cause:** PDF COMBAT STYLES section reads `style.skill` (base-only, set at creation). SKILLS section reads from `compileAllSkills()` which includes career/bonus points. Same style appears twice.

**Fix:**
- In the COMBAT STYLES PDF section, compute the full value: `base + cultural + career + bonus` (same as `compileAllSkills()` does)
- In `compileAllSkills()`, **exclude** skills whose name starts with "Combat Style" (since they're already shown in the dedicated COMBAT STYLES section). Use the actual style name from `CharacterData.combatStyles[].name` instead of the generic "Combat Style (Cultural Style)" label.

#### 2C. Career professional skills shown even at 0 points

**Root cause:** `compileAllSkills()` line 17017 filters to `hasPoints = cultural > 0 || career > 0 || bonus > 0`. Selected professional skills with 0 allocated points are excluded.

**Fix:** Also include skills that are in `CharacterData.selectedProfessionalSkills` (or however career selections are tracked). If a skill was chosen as a professional skill, show it at its base value even with 0 additional points.

#### 2D. Weapon skill% derivation

**Root cause:** `weapon.skill` hardcoded to `0` at creation (line 16410). Never updated from combat style total. PDF uses `w.skill || ''` which is `''` for 0.

**Fix:** In `compileAllSkills()` or at PDF export time, look up each weapon's parent combat style and use that style's total percentage. Store weapon→style mapping (already implied by `combatStyles[].weapons`).

#### 2E. Passion "Loyalty" subject — auto-resolve from homeland

When passion data has `needsSubject: true` but the subject can be inferred:
- "Loyalty (City)" → resolve to `CharacterData.homeland` (e.g., "Loyalty (Trilus)")
- "Loyalty" with `subjectSuggestions: ["Clan", "Citadel", "Chief", "Tribe"]` → still needs user input (show picker in Step 6)

#### 2F. Passion "Loyalty (City)" literal replacement

Same as 2E — specifically, any passion whose `name` contains a placeholder token in parentheses that matches a known category (City, Clan, etc.) gets auto-resolved or prompted.

#### 2G. Cult passion review

Covered by 1E — the passion is surfaced in the UI. No separate data fix needed beyond 1E.

---

### Phase 3: PDF Layout (7 issues)

#### 3A. Inter-section spacing

Add consistent `y -= 5` gap between every major section (after hit locations, after combat styles, after weapons, after skills, etc.). Currently gaps are 2-3px, causing visual collisions.

#### 3B. Hit location / COMBAT STYLES gap

Specific instance of 3A — add `y -= 5` after the hit location table (line 17505).

#### 3C. Concept/Family/Background legibility

Currently rendered at size 6 with no padding. Increase to size 7, add 2px top margin.

#### 3D. Dynamic vertical distribution

After all content is rendered, calculate `remainingSpace = y - 20` (above footer). If `remainingSpace > 100`, redistribute by adding proportional gaps between sections. Implementation: render in two passes — first pass calculates total height, second pass distributes.

Actually, simpler approach: use fixed generous spacing (5-7px between sections) and accept that the bottom may have white space. The current problem is that gaps are too *small*, not that they need to be dynamic.

#### 3E. Section separators

Draw a light horizontal rule (`line(L, y, R)` using the existing `line` helper) between major sections: after characteristics block, after combat/weapons, after skills, before magic, before equipment.

#### 3F. Attribute spacing

Replace hardcoded x-positions for AP/DM/Init/Move/Heal/MP/LP/XP/SR with calculated positions: `L + i * (W / numAttrs)`.

#### 3G. Weapon Skill column populated

Visual consequence of 2D — once weapon.skill is derived from combat style, the column will render correctly.

## Key Implementation Notes

- All changes are in the single `index.html` file
- Phase 1 fixes are independent of each other (can be done in any order)
- Phase 2B and 2D are related (both involve combat style data flow)
- Phase 3 changes are all in `exportSinglePagePDF()` (lines 17354-17719)
- The existing `placeholder-skill-disambiguation` spec should be updated to include Passion and Combat Style categories

## Out of Scope

- Multi-page PDF support (future enhancement if single page proves insufficient)
- Career-specific suggestion lists for Lore (per existing design decision)
- Changing CAREERS_DATA or CULTURES_DATA structure
- Play Mode bugs (focus is wizard + PDF)
