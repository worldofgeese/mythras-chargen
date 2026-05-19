---
date: 2026-05-19T08:32:10+0200
author: worldofgeese
commit: 4df3293
branch: main
repository: mythras-chargen
topic: "Step 9 / Magic Picker Refactoring Opportunities"
confidence: high
complexity: medium
status: ready
tags: [solutions, refactoring, magic-pickers, step9, scroll-preservation]
last_updated: 2026-05-19T08:32:10+0200
last_updated_by: worldofgeese
---

# Solution Analysis: Step 9 / Magic Picker Refactoring Opportunities

**Date**: 2026-05-19T08:32:10+0200
**Author**: worldofgeese
**Commit**: 4df3293
**Branch**: main
**Repository**: mythras-chargen

## Research Question
What is the best approach to improve code quality in renderStep9 and the magic system pickers — covering function extraction, scroll preservation generalization, inline CSS relocation, shared render patterns, and innerHTML replacement?

## Summary
**Problem**: renderStep9 + selectCult + inline pickers span ~400 lines of interleaved logic, duplicated scroll-preservation code, inline `<style>` tags, and three magic pickers with no shared abstraction.
**Recommended**: Extract & Strategy — Extract pickers into named functions with a shared config-driven `renderMagicPicker()`, move CSS to `<style>` block, wrap scroll-preservation as a utility.
**Effort**: Medium (3-4 days)
**Confidence**: High

## Problem Statement

**Requirements:**
- Reduce cognitive load when modifying any single magic system picker
- Eliminate duplicated scroll-preservation boilerplate (3 identical patterns)
- Remove inline `<style>` from `renderMiraclePicker` (violates single CSS block convention)
- Enable easier addition of future magic systems (mysticism data pending)
- Preserve all 235 existing tests passing

**Constraints:**
- Single-file architecture (no build step, no modules) — all changes stay in index.html
- No framework — must remain vanilla JS
- No breaking changes to the Agent API (`App.agent.*`)
- No breaking changes to `CharacterData` shape (fixtures depend on it)
- Must not introduce class-based architecture without clear benefit (YAGNI for a wizard app)

**Success criteria:**
- renderStep9() reduced to ~80 lines (layout + dispatch only)
- Each magic picker in its own named function
- Zero duplicated scroll-preservation code
- All `.miracle-card` CSS in main `<style>` block
- `node test-chargen.js` passes (235 tests)

## Current State

**Existing implementation:**

| Area | Location | Lines | Issue |
|------|----------|-------|-------|
| renderStep9 | `index.html:4409-4592` | 184 | Mixes layout, cult card rendering, magic picker dispatch |
| selectCult | `index.html:4669-4808` | 140 | Does cult logic + renders boost panel + triggers re-render |
| renderMiraclePicker | `index.html:5123-5264` | 142 | Contains inline `<style>` for `.miracle-card` classes |
| Spirit picker | inline in renderStep9 `index.html:4516-4548` | 33 | Inline HTML generation, no named function |
| Sorcery picker | inline in renderStep9 `index.html:4550-4592` | 43 | Same pattern, inline |
| Scroll preservation | `index.html:3913,3934,4813` | 3 instances | Identical 3-line boilerplate |

**Relevant patterns:**
- `adjustCultBoost`: `index.html:4887` — Targeted DOM update pattern already established (no full re-render)
- `refreshStepBudget`: `index.html:3733` — Another targeted update pattern
- `renderCurrentStep()` full re-render: called 54 times across codebase
- `renderMiraclePicker`: already extracted to own function — the model to follow

**Integration points:**
- `App.toggleMiracle('name')` — calls `renderMiraclePicker(pickerDiv)` (line 5264)
- `App.toggleSorcerySpell('name')` — calls `renderCurrentStep()` with scroll-preservation (line 3913)
- `App.toggleBoundSpirit('name')` — calls `renderCurrentStep()` with scroll-preservation (line 3934)
- `App.selectCult(name)` — triggers re-render with scroll-preservation (line 4813)
- `App.autoBoostCultSkills()` — calls `renderCurrentStep()` (from boost panel)

## Solution Options

### Option 1: Extract & Strategy

**How it works:**
Extract animist and sorcery pickers into `renderSpiritPicker(container)` and `renderSorceryPicker(container)` matching the existing `renderMiraclePicker` pattern. Create a shared `App.withScrollPreserve(fn)` utility. Move `.miracle-card` CSS to the main `<style>` block. Optionally create a `renderMagicPicker({type, data, max, toggle, ...})` helper for the shared boilerplate (header, counter, list container).

**Pros:**
- Follows the precedent already set by `renderMiraclePicker` (line 5123) — consistent pattern
- Scroll utility eliminates 3× duplicated boilerplate and makes future scroll-preservation trivial
- Moving CSS to `<style>` block aligns with the rest of the app (all other CSS is in the head block, lines 7-590)
- Each picker becomes independently testable and modifiable
- Strategy config approach means adding mysticism picker later is ~20 lines

**Cons:**
- 3-4 day effort touching sensitive cult-selection code paths
- Slightly more indirection (config object → renderer) — but minimal since no build step

**Complexity:** Medium (~3-4 days)
- Files to create: 0
- Files to modify: 1 (`index.html`)
- Lines added: ~40 (utility + config)
- Lines moved/refactored: ~180 (spirit/sorcery extraction + CSS relocation)
- Net line reduction: ~60
- Risk level: Low-Medium (all existing tests cover the logic; refactoring preserves behavior)

### Option 2: Targeted DOM Updates

**How it works:**
Replace `renderCurrentStep()` calls in `toggleSorcerySpell` and `toggleBoundSpirit` with targeted DOM mutations (update counter text, toggle checkbox state, add/remove class). Follow the proven pattern in `adjustCultBoost` (line 4904). Keep render functions monolithic. Move inline CSS to `<style>`.

**Pros:**
- Eliminates scroll-preservation problem entirely (no re-render = no scroll jump)
- Best UX — no DOM thrash, instant feedback, no flicker
- Proven pattern: `adjustCultBoost` already does this successfully (line 4887-5119)
- Smaller diff than Option 1 for the scroll/CSS parts

**Cons:**
- Requires maintaining DOM state manually — every future change to picker HTML must update both the render function AND the targeted updater
- Doesn't address the renderStep9 size/complexity issue — the function stays monolithic
- Higher maintenance burden long-term (two code paths: initial render + incremental update)
- Testing is harder — must verify both render path AND update path

**Complexity:** Medium (~3 days)
- Files to create: 0
- Files to modify: 1 (`index.html`)
- Lines added: ~80 (per-picker update functions)
- Lines removed: ~20 (scroll boilerplate)
- Net line increase: ~60
- Risk level: Medium (dual-path maintenance risk)

### Option 3: Minimal Extract Only

**How it works:**
Extract spirit and sorcery pickers into `App.renderSpiritPicker(container)` and `App.renderSorceryPicker(container)` — matching the existing `renderMiraclePicker` exactly. No shared strategy, no scroll utility, no CSS moves.

**Pros:**
- Smallest delta — ~50 lines moved, zero new patterns
- Near-zero risk — purely mechanical extraction
- Immediately improves readability of renderStep9 (shrinks from 184 to ~100 lines)
- Can be done in 1 hour

**Cons:**
- Doesn't address scroll duplication (3 identical patterns remain)
- Doesn't fix inline `<style>` in renderMiraclePicker
- No shared abstraction — three pickers diverge further over time
- Leaves the door open for the same "works but messy" accumulation

**Complexity:** Low (~0.5 days)
- Files to create: 0
- Files to modify: 1 (`index.html`)
- Lines moved: ~76 (spirit + sorcery picker blocks)
- Lines added: ~8 (function signatures + calls)
- Net change: ~+8
- Risk level: Very Low

### Option 4: Component Object Model

**How it works:**
Define a `MagicPickerComponent` class with `constructor(config)`, `.render(container)`, `.update(state)`, `.destroy()` methods. Each magic system is an instance with different config. Event delegation via a single listener on the picker container. All magic CSS consolidated into a `/* Magic System Components */` section.

**Pros:**
- Cleanest long-term architecture — true encapsulation
- Event delegation = fewer handler registrations = better memory profile
- `.update()` method could do targeted DOM diffs internally, solving scroll issue
- Most extensible for future magic systems (mysticism, hybrid paths)

**Cons:**
- Overengineering for a wizard-step app with no build step — YAGNI flag
- Introduces class-based patterns not used anywhere else in the codebase (zero existing classes)
- Largest diff: ~200+ lines of new infrastructure
- Breaks the simple function-based pattern the entire app uses
- Test coverage must be significantly expanded to cover class lifecycle

**Complexity:** High (~5-7 days)
- Files to create: 0
- Files to modify: 1 (`index.html`)
- Lines added: ~200+ (class definitions, delegation, lifecycle)
- Lines removed: ~180 (existing picker code)
- Net change: ~+20
- Risk level: High (architectural pattern shift with no precedent in codebase)

## Comparison

| Criteria | Option 1: Extract & Strategy | Option 2: Targeted DOM | Option 3: Minimal Extract | Option 4: Component Model |
|----------|------------------------------|------------------------|---------------------------|---------------------------|
| Complexity | Medium | Medium | Low | High |
| Codebase fit | High | Medium | High | Low |
| Risk | Low-Med | Medium | Very Low | High |
| Solves scroll | Yes (utility) | Yes (eliminates cause) | No | Yes (update method) |
| Solves CSS | Yes | Yes | No | Yes |
| Solves Step9 size | Yes | No | Partially | Yes |
| Solves duplication | Yes | Partially | No | Yes |
| Future extensibility | Good | Fair | Poor | Excellent |
| Effort | 3-4 days | 3 days | 0.5 days | 5-7 days |

## Recommendation

**Selected:** Option 1: Extract & Strategy

**Rationale:**
- Follows the exact precedent set by `renderMiraclePicker` (line 5123) — the codebase already demonstrates this as the right level of extraction
- `adjustCultBoost` (line 4904) proves targeted DOM updates work here, but applying that pattern to ALL pickers (Option 2) creates dual-path maintenance without the simplicity benefit
- The scroll-preservation utility (`withScrollPreserve`) is a 5-line function that eliminates 3 identical code blocks and prevents future scroll bugs
- Moving `.miracle-card` CSS is a mechanical change that consolidates all styling into one block (lines 7-590)
- Option 4's class model is YAGNI — no other part of this 9037-line app uses classes

**Why not alternatives:**
- Option 2 (Targeted DOM): Better UX but higher maintenance cost. Could be adopted incrementally AFTER Option 1 for the miracle picker only (highest interaction frequency).
- Option 3 (Minimal): Too conservative — leaves known pain points (scroll, CSS) unaddressed. However, it's a valid "phase 1" within Option 1.
- Option 4 (Component): Architectural shift not justified by the problem scope. This is a 9K-line single-file app, not a component library.

**Trade-offs:**
- Accepting slight indirection (config object) for elimination of duplication
- Accepting 3-4 day effort for lasting maintainability improvement

**Implementation approach:**
1. **Phase 1** (Option 3 subset): Extract `renderSpiritPicker` and `renderSorceryPicker` into named functions — zero behavior change, pure mechanical move
2. **Phase 2**: Create `App.withScrollPreserve(fn)` utility; replace 3 scroll-preservation sites
3. **Phase 3**: Move `.miracle-card` inline CSS to main `<style>` block (lines 591-624 area)
4. **Phase 4** (optional): Create shared `renderMagicPickerHeader(config)` for the info panel + counter boilerplate common to all three pickers

**Integration points:**
- `index.html:4516-4548` — Extract to `App.renderSpiritPicker(container)`
- `index.html:4550-4592` — Extract to `App.renderSorceryPicker(container)`
- `index.html:3913-3915, 3934-3936, 4813-4816` — Replace with `App.withScrollPreserve(() => this.renderCurrentStep())`
- `index.html:5192-5225` — Move `.miracle-card` styles to main `<style>` block after line 624

**Patterns to follow:**
- `renderMiraclePicker`: `index.html:5123` — function signature and container pattern
- `adjustCultBoost`: `index.html:4904` — targeted DOM update (for future Phase 5)
- Main `<style>` block: `index.html:7-624` — where all CSS lives

**Risks:**
- Scroll-preservation utility must handle SSR/test environment (`typeof window` checks): mitigate by carrying over existing guards
- Moving CSS must not change specificity: mitigate by keeping selectors identical (they're already class-based)

## Scope Boundaries
- Building: Function extraction, scroll utility, CSS relocation for Step 9 magic pickers
- NOT doing: Refactoring renderStep9's cult card rendering (separate concern)
- NOT doing: Class-based component architecture
- NOT doing: Targeted DOM updates for pickers (future enhancement after this)
- NOT doing: Touching Agent API or CharacterData shape

## Testing Strategy

**Unit tests:**
- All 235 existing tests pass unchanged (logic is preserved, only code organization changes)
- No new unit tests needed for Phase 1-3 (behavior-preserving refactor)

**Integration tests:**
- `node test-agent-api.mjs` — verify miracle/spirit/sorcery selection still works via agent API
- Scroll-preservation: manual browser test (toggle spell, verify page doesn't jump)

**Manual verification:**
- [ ] Select a theist cult → miracle picker renders correctly
- [ ] Select an animist cult → spirit picker renders correctly
- [ ] Select a sorcery cult → sorcery spell picker renders correctly
- [ ] Toggle a sorcery spell → page scroll doesn't jump
- [ ] Toggle a bound spirit → page scroll doesn't jump
- [ ] Select cult → page scroll doesn't jump
- [ ] Miracle card hover/selection styles match current behavior
- [ ] PDF export still works after CSS relocation

## Open Questions
**Resolved during research:**
- "How many scroll-preservation sites exist?" — 3 instances (lines 3913, 3934, 4813)
- "Is there precedent for a utility function pattern?" — Yes, `_toggleInList` (line ~3880) is a shared toggle utility
- "Does the app use any class-based patterns?" — No, zero classes; all function-based on the `App` object

**Requires user input:**
- Should Phase 4 (shared header helper) be included or deferred? Default: defer until mysticism data arrives.

**Blockers:**
- None — all information needed is available in the codebase.

## References

- `.rpiv/guidance/architecture.md` — Overall architecture and module map
- `index.html:5123-5264` — renderMiraclePicker (the model to follow)
- `index.html:4887-5119` — adjustCultBoost (targeted DOM update precedent)
- `index.html:7-624` — Main CSS block (destination for relocated styles)
- `docs/adr/ADR-006-full-magic-coverage.md` — Magic system architecture decision
