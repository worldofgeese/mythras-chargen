---
title: "fix: Quick Boost rewrite, Add Hobby Skill dropdown, PDF export collisions"
type: fix
status: active
created: 2026-05-18
origin: user request (session)
---

# Fix: Quick Boost, Add Hobby Skill, and PDF Export Collisions

## Summary

Three UI/UX issues need fixing:
1. **Quick Boost (Step 9)** — janky full re-render on +/− click, no number input, no auto-allocate
2. **Add Hobby Skill (Step 11)** — free-text autocomplete with zero discoverability; should be a dropdown
3. **PDF Export** — text/box collision in header, line running through Equipment section

---

## Problem Frame

### Quick Boost
`App.adjustCultBoost()` calls `App.selectCult()` which calls `App.renderCurrentStep()`, nuking the entire DOM and scrolling to top. The existing skill allocators (Steps 5, 10, 11) use `<input type="number">` with `onchange` that updates state without re-rendering the step.

### Add Hobby Skill
The current autocomplete (`App.addBonusSkill()`) creates a free-text `<input>` with no visible options until you start typing. Users don't know what's available. Other skill selectors in the app use `<select>` or `<datalist>` with visible options.

### PDF Export
1. **Header collision**: The identity box is 20pt tall, but the box Y-anchor is `y - 20` while text is placed at `y - 7` (line 1) and `y - 16` (line 2). With a font size of 7pt, line 1's descenders touch the top border (box top is at `y`). The concept/background text below the box can also overflow into the characteristics row.
2. **Equipment line**: A separator `line(L, y, L + W)` is drawn immediately before the Equipment section. This line visually collides with the text because `y -= 3` provides only 3pt of clearance before the bold header — which is drawn AT `y`, overlapping the line at the same coordinate.

---

## Scope Boundaries

### In Scope
- Rewrite Quick Boost to use inline number inputs (matching Step 11 pattern)
- Add "Auto-boost to 50%" one-click button
- Replace Add Hobby Skill free-text autocomplete with a `<select>` dropdown
- Fix PDF header text/box spacing
- Fix PDF Equipment separator line collision

### Out of Scope
- Redesigning Step 9's cult selection or miracle picker
- Changing the 1-hobby-skill limit rule
- Multi-page PDF support

### Deferred to Follow-Up Work
- Applying the same dropdown improvement to other Add Skill autocompletes (weapons, equipment)

---

## Key Technical Decisions

1. **Quick Boost: inline update without re-render** — `App.adjustCultBoost()` will update only the boost panel DOM (value display + budget counter) instead of calling `App.selectCult()`. Matches how Step 11's `onchange` works.
2. **Quick Boost: number input** — Replace +/− buttons with `<input type="number" min="0" max="N">` and an `onchange` handler, same as Step 5/10/11 skill rows. Keep the per-skill max at `maxPerSkill` (age-dependent, default 15).
3. **Auto-boost button** — A single button that allocates minimum points needed to reach 50% on each cult skill, respecting per-skill max and total pool. Simple greedy algorithm: iterate skills sorted by gap ascending, allocate min(needed, maxPerSkill − current, remaining).
4. **Hobby Skill dropdown** — Replace the autocomplete input with a native `<select>` showing all professional skills. Prefill with the existing `allProfSkills` array. Filter out already-added skills.
5. **PDF fix: increase box height or adjust text Y** — Increase box height from 20 to 24pt and shift text positions down proportionally. This gives 2pt padding top and bottom.
6. **PDF fix: Equipment separator** — Increase clearance from 3pt to 8pt between the separator line and the Equipment header text.

---

## Implementation Units

### U1. Rewrite Quick Boost panel to use number inputs (no full re-render)

**Goal:** Replace +/− button UI with `<input type="number">` rows. Update only the boost panel DOM on value change — no `renderCurrentStep()`.

**Requirements:** Matches Step 5/11 allocator UX. Typing a value and tabbing away applies it. Clamped to [0, maxPerSkill]. Budget counter updates in-place.

**Dependencies:** None

**Files:**
- `index.html` (modify `App.renderCultSkillBoostPanel`, `App.adjustCultBoost`)
- `test-chargen.js` (add tests)

**Approach:**
- `renderCultSkillBoostPanel`: generate rows with `<input type="number" min="0" max="${maxForThis}" value="${currentBonus}" onchange="App.adjustCultBoost('${name}', parseInt(this.value))">`
- `adjustCultBoost(skillName, newValue)`: validate, set `CharacterData.bonusSkills[skillName]`, call `App.saveToLocalStorage()`, then do a **targeted DOM update** — find the budget counter element and update `.textContent`, find the specific row's "needs X more" span and update it. Do NOT call `renderCurrentStep()` or `selectCult()`.
- Keep the panel-level budget display showing `Bonus points remaining: X / Y`.
- Show per-row: skill name, current total %, bonus input, "needs N more to reach 50%".

**Patterns to follow:** Step 11 skill rows at line ~5240 (`<input type="number" min="0" max="..." onchange="App.updateSkillPoints(...)">`)

**Test scenarios:**
- Typing a valid value updates `CharacterData.bonusSkills` without re-rendering the step
- Value clamped to 0 at minimum
- Value clamped to maxPerSkill (age-dependent) at maximum
- Value clamped to remaining budget if budget is less than maxPerSkill
- Budget counter decreases correctly when points allocated
- Points allocated in Quick Boost appear in Step 11 budget as pre-spent

**Verification:** Page does not scroll on input change. Budget counter updates. Test suite passes.

---

### U2. Add one-click "Auto-boost to 50%" button

**Goal:** Single button that distributes minimum bonus points to bring all cult skills to 50%.

**Dependencies:** U1

**Files:**
- `index.html` (modify `App.renderCultSkillBoostPanel`, add `App.autoBoostCultSkills`)
- `test-chargen.js` (add tests)

**Approach:**
- New function `App.autoBoostCultSkills()`:
  1. Get boostable skills (those below 50%)
  2. Sort by gap ascending (smallest gap first — cheapest to fix)
  3. For each: allocate min(needed, maxPerSkill − currentBonus, remainingBudget)
  4. Save, update panel DOM in-place
- Button rendered above the skill rows: "⚡ Auto-boost all to 50%"
- Button disabled if budget is 0 or all skills already ≥ 50%
- After click, update all input values in-place and refresh budget counter

**Test scenarios:**
- Allocates exactly enough to reach 50% per skill (no over-allocation)
- Respects maxPerSkill cap per skill
- Stops when budget exhausted (partial boost is fine)
- Does nothing if all skills already qualify
- Works correctly with pre-existing bonus allocations

**Verification:** After clicking, cult skill qualification warnings update. Budget decremented correctly.

---

### U3. Replace Add Hobby Skill autocomplete with a select dropdown

**Goal:** The "Add Hobby Skill" button opens a `<select>` dropdown showing all available professional skills, replacing the blind free-text autocomplete.

**Dependencies:** None

**Files:**
- `index.html` (modify `App.addBonusSkill`)
- `test-chargen.js` (add tests)

**Approach:**
- Replace the autocomplete `<input>` with a `<select>` element containing all professional skills from `allProfSkills`.
- Filter out skills already present in `CharacterData.bonusSkills`.
- `onchange` of the select: add the skill to `bonusSkills`, re-render the list (same as current behavior after selection).
- Remove the entire autocomplete event-listener machinery.

**Patterns to follow:** The rune affinity dropdowns in Step 5 (native `<select>` with filtering of already-chosen items)

**Test scenarios:**
- Dropdown contains all professional skills minus already-added ones
- Selecting a skill adds it to `bonusSkills` with 0 points
- Hobby skill limit (1 new professional skill) still enforced
- Combat Style options available in dropdown

**Verification:** Dropdown is immediately visible with all options. No typing required.

---

### U4. Fix PDF header text/box collision

**Goal:** Eliminate text clipping at box borders in the identity section.

**Dependencies:** None

**Files:**
- `index.html` (modify PDF export header section around line 7164)
- `test-chargen.js` (add test asserting box height)

**Approach:**
- Increase identity box from 20pt to 26pt: `box(L, y - 26, W, 26)`
- Shift text: line 1 at `y - 9` (was `y - 7`), line 2 at `y - 19` (was `y - 16`)
- Update `y -= 29` (was `y -= 23`) to account for taller box
- Concept/background section: add 2pt extra clearance before characteristics

**Test scenarios:**
- PDF export succeeds without error
- Identity box height is 26 (unit test checking the draw call)

**Verification:** Export PDF and visually confirm no text clipping at borders.

---

### U5. Fix PDF Equipment separator line collision

**Goal:** The horizontal rule before Equipment should not visually overlap with the "EQUIPMENT" text.

**Dependencies:** None

**Files:**
- `index.html` (modify PDF export Equipment section around line 7497)

**Approach:**
- Change `y -= 3` to `y -= 9` after the separator line, giving 9pt clearance before the bold header text.
- This moves the "EQUIPMENT" text down so the line sits clearly above it.

**Test scenarios:**
- PDF export with equipment renders without error
- Equipment text Y position is at least 8pt below the separator line

**Verification:** Export PDF and visually confirm clean separation between line and Equipment header.

---

## Risks

- **Quick Boost targeted DOM update may miss edge cases** — if the cult selection changes after boost points are allocated, the panel needs to reflect new skill lists. Mitigation: the panel is still fully re-rendered when `selectCult()` is called (cult change). Only point-adjustment skips re-render.
- **Dropdown may be long** — 37 professional skills is manageable in a native `<select>`. No virtual scrolling needed.

---

## Deferred Implementation Notes

- Exact pixel padding in PDF may need adjustment after visual testing
- Whether the equipment separator should be removed entirely rather than spaced (stylistic choice, defer to visual test)
