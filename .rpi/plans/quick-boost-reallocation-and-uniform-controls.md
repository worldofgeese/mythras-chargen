---
date: 2026-05-24
topic: "Quick Boost Reallocation and Uniform Controls"
tags: [plan, quick-boost, layout, disambiguation]
status: approved
design: "../designs/quick-boost-reallocation-and-uniform-controls.md"
spec: "../specs/quick-boost-reallocation-and-uniform-controls.md"
---

# Quick Boost Reallocation and Uniform Controls — Implementation Plan

## Overview

Implement the approved Quick Boost design as a phased change to the single-file app. The work adds an atomic planner/applicator for cult initiation reallocation, centralizes ordered specialty dependency enforcement, and replaces ad hoc allocation-row sizing with shared uniform controls.

**Scope**: `index.html`, `test-chargen.js`, `test-agent-api.mjs` if API coverage needs updates, `.rpi/*` design status, `.beads/issues.jsonl`, and player handouts only if button copy or workflow guidance changes materially.

## Source Documents

- **Design**: `../designs/quick-boost-reallocation-and-uniform-controls.md`
- **Spec**: `../specs/quick-boost-reallocation-and-uniform-controls.md`
- **Related spec**: `../specs/placeholder-disambiguation.md`
- **Related plan**: `chargen-bug-sweep.md`

## Phase 1: Atomic Quick Boost Planner

**Bead**: `mythras-chargen-rhs0`
**Spec scenarios**: 1, 2, 3, 4

### Overview

Replace the UI Quick Boost behavior with a planner/applicator that can satisfy initiation with minimum necessary target boosts, legal aggressive reallocation, atomic rollback, and post-apply summary.

### Tasks

#### 1. Planning helpers
**File**: `index.html`
**Changes**:
- Add `App.planCultInitiationBoost(options = {})`.
- Add legal target/donor helpers for cult requirements, pool capacity, donor exclusions, and budget/cap checks.
- Prefer minimum cult targets needed for initiation instead of boosting every cult skill.
- Support aggressive reallocation across remaining bonus, non-cult bonus, career, cultural, and legal earlier selection changes.

#### 2. Transactional applicator
**File**: `index.html`
**Changes**:
- Add `App.applyCultInitiationBoostPlan(plan)`.
- Use existing trusted snapshot/restore helpers.
- Apply moves, normalize higher magic, re-run initiation summary and budget checks, and roll back on any failure.
- Preserve `App.autoBoostCultSkills({ silent, updateUi })` as the public entrypoint by delegating to planner/applicator.

#### 3. UI feedback
**File**: `index.html`
**Changes**:
- Rename button copy to `Quick Boost: satisfy initiation`.
- Show concise success/failure summary in the Step 9 panel.
- Keep manual Quick Boost point inputs working as direct bonus allocations.

#### 4. Tests
**File**: `test-chargen.js`
**Changes**:
- Add planner purity test.
- Add remaining-bonus success test.
- Add full-bonus donor reallocation test.
- Add cultural/career legal donor test.
- Add impossible-plan rollback test.
- Add "minimum necessary targets only" test.
- Preserve existing cap and hidden-allocation regressions where still applicable; update assertions for explicit aggressive Quick Boost.

### Success Criteria

#### Automated Verification
- `node test-chargen.js`
- `node scripts/validate_provenance.js --quiet`
- `./scripts/ingest-cults.py --validate --quiet`
- `git --no-pager diff --check`

### Commit

- Stage: `index.html`, `test-chargen.js`, `.beads/issues.jsonl`
- Message: `feat: add atomic quick boost reallocation`

---

## Phase 2: Ordered Specialty Dependencies

**Beads**: `mythras-chargen-9mbp` for discovery, then `mythras-chargen-8u3n` for enforcement
**Depends on**: Phase 1
**Spec scenarios**: 5, 6, 7

### Overview

Make ordered placeholder dependencies first-class across UI, validation, random generation, imports, and the agent API.

### Tasks

#### 1. Shared dependency helpers
**File**: `index.html`
**Changes**:
- Audit all career/professional skill labels that can appear as Primary/Secondary or Primary Catch/Secondary Catch before implementation.
- Add `getProfessionalSkillDependency(skillName)`.
- Add `validateProfessionalSkillDependencies(selectedSkills, career)`.
- Cover `Craft (Secondary)`, `Lore (Secondary)`, `Lore (Secondary Catch)`, and equivalent primary/secondary placeholder pairs.

#### 2. Step 8 UI enforcement
**File**: `index.html`
**Changes**:
- Render ordered placeholders as specialty 1 / specialty 2 groups.
- Keep secondary disabled until primary is selected.
- When primary is deselected, atomically remove secondary selection and its career skill allocation.
- Prevent duplicate concrete specializations from satisfying both primary and secondary.

#### 3. Non-UI enforcement
**File**: `index.html`
**Changes**:
- Use shared validation in `validateCurrentStep`, `CharacterData.applyPlainObject`, and final character-facing guards.
- Reject invalid agent API Step 8 payloads.
- Ensure random generation never selects/keeps secondary without primary.

#### 4. Tests
**Files**: `test-chargen.js`, `test-agent-api.mjs` if browser-agent API coverage is affected
**Changes**:
- Add manual state validation for secondary-only rejection.
- Add primary deselect removes secondary test.
- Add duplicate concrete specialization rejection test.
- Add agent API Step 8 secondary-only rejection.
- Add import/load secondary-only rejection.

### Success Criteria

#### Automated Verification
- `node test-chargen.js`
- `curl -fsS http://127.0.0.1:8765/index.html >/dev/null && node test-agent-api.mjs`
- `git --no-pager diff --check`

### Commit

- Stage: `index.html`, `test-chargen.js`, `test-agent-api.mjs` if changed, `.beads/issues.jsonl`
- Message: `fix: enforce ordered professional specialties`

---

## Phase 3: Uniform Allocation Controls

**Bead**: `mythras-chargen-qgxv`
**Depends on**: Phase 2
**Spec scenario**: 8

### Overview

Introduce shared CSS/classes for allocation rows, capped controls, and fixed-width point inputs, then apply them to wizard allocation surfaces.

### Tasks

#### 1. Shared CSS
**File**: `index.html`
**Changes**:
- Add `--points-input-width`, `--allocation-control-max`, `.allocation-row`, `.allocation-control`, `.allocation-guidance`, `.points-input`, and responsive variants.
- Keep top-level form fields full-width.

#### 2. Apply to wizard rows
**File**: `index.html`
**Changes**:
- Step 5 cultural skill rows.
- Step 6 Passion rows.
- Step 8 professional specialization inputs.
- Step 10 career skill rows.
- Step 11 bonus/hobby skill rows.
- Quick Boost rows.
- Any touched matching row with inline allocation sizing.

#### 3. Tests and visual checks
**File**: `test-chargen.js`
**Changes**:
- Add DOM/render tests asserting key allocation rows use shared classes and point inputs use `.points-input`.

### Success Criteria

#### Automated Verification
- `node test-chargen.js`
- `git --no-pager diff --check`

#### Manual Verification
- Use `agent-browser` to inspect Steps 5, 6, 8, 9, 10, and 11 with long labels/guidance.
- Capture screenshots showing point boxes aligned and uniformly sized.

### Commit

- Stage: `index.html`, `test-chargen.js`, `.beads/issues.jsonl`
- Message: `style: unify allocation controls`

---

## Phase 4: Integration Review, Publish, and Closeout

**Bead**: `mythras-chargen-oo6k`
**Depends on**: Phase 3
**Spec scenarios**: all

### Overview

Run the full verification pipeline, review the implementation, publish mirrored player-facing files if needed, and close Beads.

### Tasks

#### 1. Full automated proof
**Files**: repository
**Changes**:
- Run the required proof gates and fix regressions.
- Update provenance hash if governed source files change.

#### 2. Review
**Files**: repository
**Changes**:
- Run simplicity, correctness, adversarial, and standards review passes.
- Fix blockers or create follow-up Beads for truly out-of-scope issues.

#### 3. Browser QA
**Files**: session artifacts only
**Changes**:
- Use `agent-browser` to exercise Quick Boost success/failure, Step 8 specialty dependency, and uniform allocation controls.
- Exercise PDF export after Quick Boost.

#### 4. Publish
**Files**: Copyparty mirrored files
**Changes**:
- If `index.html` or handouts changed, inspect live Copyparty tree first.
- Sync `index.html` to `/w/01-Character-Generator.html`.
- Sync handouts only if updated.
- Verify public URLs with `curl -fsSL`.

### Success Criteria

#### Automated Verification
- `node test-chargen.js`
- `node scripts/validate_provenance.js --quiet`
- `./scripts/ingest-cults.py --validate --quiet`
- `git --no-pager diff --check`
- `curl -fsS http://127.0.0.1:8765/index.html >/dev/null && node test-agent-api.mjs`
- `decapod validate` attempted and any unrelated governance failures documented.

#### Manual Verification
- Browser QA screenshots for Quick Boost, Step 8, and uniform controls.
- Published URLs verified if publish occurs.

### Commit

- Stage: all implementation, docs, Beads, and handout changes that are not ignored.
- Message: `feat: satisfy initiation with quick boost`

---

## Coverage Map

- Spec scenario 1: Phase 1
- Spec scenario 2: Phase 1
- Spec scenario 3: Phase 1
- Spec scenario 4: Phase 1
- Spec scenario 5: Phase 2
- Spec scenario 6: Phase 2
- Spec scenario 7: Phase 2
- Spec scenario 8: Phase 3

## References

- Design: `../designs/quick-boost-reallocation-and-uniform-controls.md`
- Spec: `../specs/quick-boost-reallocation-and-uniform-controls.md`
- Beads: `mythras-chargen-c5pw`, `mythras-chargen-rhs0`, `mythras-chargen-8u3n`, `mythras-chargen-qgxv`, `mythras-chargen-oo6k`
