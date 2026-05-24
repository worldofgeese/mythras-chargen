# Design: Quick Boost Reallocation and Uniform Controls

**Status:** active
**Date:** 2026-05-24
**Upstream:** user screenshots `photo_2026-05-24_20-48-02.jpg`, `photo_2026-05-24_20-48-09.jpg`, `photo_2026-05-24_20-48-13.jpg`, `photo_2026-05-24_20-48-16.jpg`

## Problem

Three related wizard issues make character creation feel unsafe and visually unstable:

1. Step 9 Quick Boost can leave initiation unmet because the visible action only spends remaining bonus points. If all easy bonus points are already spent, the user must manually revisit earlier skill steps.
2. Step 8 treats ordered placeholder skills such as `Craft (Primary)` and `Craft (Secondary)` as separate choices. A character selecting only specialty 2 is not making a meaningful "second" specialty choice.
3. Allocation controls use ad hoc inline grid widths. Long specialization guidance stretches dropdowns and makes point inputs appear at different widths/positions across Steps 5, 6, 8, 10, 11, and Quick Boost.

## Evidence

- Global input defaults are broad and minimal: `index.html:36-45` sets all inputs/selects, while number inputs default to `60px`.
- Step 5 allocation rows repeatedly use inline `grid-template-columns: 2fr 1fr`, so long guidance can make point boxes appear detached from the row: `index.html:13065`, `index.html:13098`, `index.html:13123`.
- Step 6 Passion rows use three different inline grids (`2fr 1fr`, `1fr 1fr 60px`, `auto 1fr 60px`), producing inconsistent select/text/point alignment: `index.html:13521`, `index.html:13528`, `index.html:13541`.
- Step 8 renders professional skills in an auto-fill grid and inline specialization inputs with `width: calc(100% - 24px)`: `index.html:14076-14100`.
- Quick Boost currently renders rows with inline `1fr 70px` and number inputs with inline `width: 60px`: `index.html:15069-15084`.
- Quick Boost’s mutation path spends remaining bonus points first, then only reallocates from non-cult bonus donors when called with `allowReallocate: true`; the UI button does not enable this path: `index.html:15303-15395`.
- Random generation already calls Quick Boost with `allowReallocate: true`, proving a reallocation path exists but is hidden from the manual UI: `index.html:16447`.
- Crafter data includes `Craft (Primary)` and `Craft (Secondary)` as ordered placeholders: `index.html:4169`.
- Current Step 8 rendering computes a primary dependency and disables secondary when primary is not selected, but this needs to be centralized for validation, API, and imported state: `index.html:14080-14100`.

## Decision

Quick Boost becomes an aggressive but atomic one-click operation:

- It targets the minimum number of cult skills needed to satisfy initiation, not every cult skill.
- It may reallocate across bonus, cultural, career, and earlier skill selections when necessary.
- It must apply as an all-or-nothing transaction: either the final character satisfies initiation and all budget/cap/disambiguation invariants, or the previous character state is restored unchanged.
- It shows a concise post-apply summary of moved points and changed selections.

Ordered professional placeholders become strict dependencies:

- `Craft (Secondary)` requires `Craft (Primary)`.
- Similar primary/secondary pairs use the same rule (`Lore (Secondary)`, `Lore (Secondary Catch)`, etc.).
- The rule is enforced in UI, validation, agent API, import/load, and random generation.

Form controls use shared CSS classes for allocation rows, capped selects/text inputs, and fixed-size point boxes. Inline width/grid styles should be removed from touched allocation surfaces.

## Design

### 1. Quick Boost planner/applicator split

Add a pure planning helper and a transactional applicator:

```javascript
App.planCultInitiationBoost = function(options = {}) { ... }
App.applyCultInitiationBoostPlan = function(plan) { ... }
```

`planCultInitiationBoost` returns a structured plan without mutating `CharacterData`:

```javascript
{
  success: boolean,
  targetCultSkills: [...],
  moves: [
    { pool: 'bonusSkills', from: 'Stealth', to: 'Courtesy', points: 6 },
    { pool: 'careerSkills', from: 'Streetwise', to: 'Commerce', points: 5 }
  ],
  selectionChanges: [
    { step: 8, action: 'replace-professional-skill', from: 'Streetwise', to: 'Commerce' }
  ],
  impossibleReasons: [],
  warnings: []
}
```

`applyCultInitiationBoostPlan` must:

1. Take a trusted snapshot.
2. Apply point moves and selection changes.
3. Normalize disambiguation and higher-magic state.
4. Recompute initiation requirements.
5. Verify all affected budgets and caps.
6. Roll back and return failure if any invariant fails.

### 2. Candidate selection strategy

Use `App.getCultSkillRequirementDetails(cult)` as the source of truth for cult skill targets.

1. Count qualifying skills and compute `neededCount`.
2. Sort non-qualifying cult skills by cheapest legal gap to 50.
3. Select only enough targets to reach `requiredCount`.
4. Prefer targets that are already selected/available in existing pools.
5. If aggressive selection changes are required, choose the least disruptive path:
   - professional skills that are legal for the current career,
   - cultural choices legal for the current culture,
   - generic cult-bound defaults such as `Lore (Cult)` -> `Lore (${CharacterData.cult})`,
   - never unresolved placeholders.

### 3. Donor selection strategy

Donors are considered in this order:

1. Unspent bonus budget.
2. Non-cult bonus allocations.
3. Non-cult career allocations.
4. Non-cult cultural allocations.
5. Earlier skill selections, only if a legal replacement can be selected and all dependent state remains valid.

Do not steal from:

- a currently qualifying cult skill,
- a planned target cult skill,
- a skill required by a selected higher-magic provider unless provider state can remain valid,
- unresolved placeholder keys,
- a skill whose reduction would violate the pool’s per-skill minimum/maximum or total budget.

### 4. Budget and cap invariants

After applying a plan:

- cultural skill total remains exactly 100;
- career skill total remains exactly 100;
- bonus skill total remains at or below the age-based bonus pool;
- every cultural/career/bonus per-skill allocation stays within the age or step cap;
- no allocation is negative;
- no skill key needs disambiguation;
- selected professional skill count is still 3 when Step 8 is complete;
- Step 9 initiation summary reports success.

The applicator should reuse existing snapshot helpers and validation helpers rather than duplicating state recovery logic.

### 5. User feedback

The Step 9 panel should change copy from "Auto-boost all to 50%" to "Quick Boost: satisfy initiation".

After applying, show a compact summary:

> Quick Boost moved 6 bonus points from Stealth to Courtesy and 5 career points from Streetwise to Commerce. Initiation requirements met: 5/5 cult skills at 50%+.

If no legal plan exists, show:

> Quick Boost could not safely satisfy initiation. Commerce needs 6 more, but no legal donor points or career/culture selections can be changed without breaking budgets or magic requirements.

### 6. Ordered professional skill dependencies

Add a shared dependency helper:

```javascript
function getProfessionalSkillDependency(skillName) { ... }
function validateProfessionalSkillDependencies(selectedSkills, career) { ... }
```

Rules:

- Secondary placeholders require their matching primary placeholder.
- Deselecting a primary removes the dependent secondary selection and its career allocation atomically.
- Agent API and imports reject secondary-only states.
- Duplicate concrete specializations cannot satisfy both primary and secondary.

Step 8 should render ordered groups with clear labels:

- `Craft specialty 1`
- `Craft specialty 2 — requires specialty 1`

### 7. Uniform form controls

Introduce shared CSS:

```css
:root {
  --points-input-width: 4rem;
  --allocation-control-max: 28rem;
}

.allocation-row {
  display: grid;
  grid-template-columns: minmax(12rem, min(100%, var(--allocation-control-max))) var(--points-input-width);
  gap: 0.5rem;
  align-items: start;
}

.allocation-control {
  width: min(100%, var(--allocation-control-max));
  max-width: var(--allocation-control-max);
}

.points-input {
  width: var(--points-input-width);
  min-width: var(--points-input-width);
  text-align: center;
  justify-self: end;
}
```

Apply these classes to:

- Step 5 cultural skill rows;
- Step 6 Passion rows;
- Step 8 professional skill specialization controls;
- Step 10 career skill rows;
- Step 11 bonus/hobby skill rows;
- Quick Boost rows;
- any matching wizard allocation row touched by this work.

Keep full-width layout for normal top-level form fields such as name, concept, culture, career, and cult selectors.

## Rejected Alternatives

### Keep Quick Boost bonus-only

This preserves player choices, but it does not satisfy the user goal: one click should do all safe work needed to meet initiation.

### Always boost every cult skill to 50%

This is predictable, but it creates unnecessary churn and may consume or move more points than required. Initiation only requires a count of cult skills at 50%+, so the default should do the minimum necessary.

### Show a confirmation preview before applying

This is safest from a UI perspective, but the requested interaction is one click. Atomic apply plus a clear post-summary gives the requested one-click behavior without silent partial mutation.

### Fix only the photographed rows

This would leave the same visual bug elsewhere. Shared CSS classes are low-risk and match the single-file architecture better than continuing inline width tweaks.

## Implementation Notes

- Start with pure planning tests before mutating UI.
- Preserve existing `App.autoBoostCultSkills({ silent, updateUi })` API shape by letting it call planner/applicator internally.
- Keep Random’s behavior equivalent or better by using the same planner with aggressive mode.
- Do not create hidden cultural/career allocations for unavailable skills unless the plan also changes the corresponding earlier legal selection.
- Update handouts only if button copy or player-facing behavior changes materially.
