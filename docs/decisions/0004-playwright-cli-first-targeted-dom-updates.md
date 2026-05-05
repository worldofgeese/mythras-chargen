---
status: accepted
date: 2026-05-05
decision-makers: [worldofgeese]
---

# ADR-0004: Adopt Targeted DOM Updates for Playwright-CLI-First Automation

## Context and Problem Statement

The chargen wizard re-rendered the entire step DOM container (`#wizard-steps`) on every single input change — 39 call sites triggered full `innerHTML` wipes. This caused two compounding problems:

1. **Agent automation is fragile**: Every `fill()` or `click()` via playwright-cli invalidates all element references. Agents must re-query after every interaction, making automation sequences unreliable and slow.
2. **Human UX suffers**: Typing in a spinbutton destroys and recreates the input mid-keystroke, causing focus loss, scroll jumps, and flicker.

The root cause: `updateSkillPoints()` and `updateCharacteristic()` both called `renderCurrentStep()` (which does `container.innerHTML = ''` then rebuilds everything) after every value change.

Additionally:
- No stable element identifiers (`data-testid`) on dynamically created skill rows
- Two native `confirm()` dialogs blocked agent automation unless handlers were pre-attached
- Validation errors appeared as 3-second toasts with no programmatic API to query them
- OCR artifacts remained in miracle data from colon-separated associate cult prefixes

## Decision

Replace the "full re-render on every input" pattern with **targeted DOM updates** for value-change operations, while keeping full re-render as a fallback for structural changes (skill add/remove, disambiguation resolution, culture/career change).

Specifically:

1. **`refreshStepBudget(category)`** — new function that updates only the "Points Remaining" text element via `textContent`, never destroys inputs. Called by `updateSkillPoints()` and `updateCharacteristic()` instead of `renderCurrentStep()`.

2. **`data-testid` on all interactive elements** — skill rows, skill inputs, folk magic checkboxes, budget trackers. Convention: `skill-input-{skillName}`, `skill-row-{skillName}`, `spell-{spellName}`, `budget-tracker`.

3. **In-page confirmation modal** replaces `confirm()` — `App.showConfirmation(message, onConfirm, onCancel)` with `data-testid="confirm-panel"`, `confirm-ok`, `confirm-cancel`.

4. **`App.getValidationState()`** — returns `{valid: bool, errors: string[], step: number}`. Agents query this instead of parsing transient toasts.

5. **OCR colon-artifact cleanup** — regex `^[A-Z][a-z ]+:[a-z.]*\s*` strips associate cult prefixes like "Argan Argar:o ", "Flamal:px ", "Lodril:. ".

### Non-Goals

- Full SPA framework adoption (React, Vue, etc.) — monolithic single-file constraint remains
- Event delegation refactor — inline `onclick`/`onchange` handlers remain for now
- Extracting data constants to separate JSON files (future consideration)
- Module bundler or build step

## Consequences

* Good, because agent automation is now reliable — element refs survive after `fill()`/`click()` interactions
* Good, because human users no longer lose focus when typing in spinbuttons
* Good, because agents can programmatically check why "Next" would fail via `getValidationState()`
* Good, because no more browser-native `confirm()` dialogs blocking automation
* Good, because data-testid provides stable selectors regardless of DOM structure
* Bad, because two update paths exist (`refreshStepBudget` vs `renderCurrentStep`) — must correctly choose which to call
* Bad, because Step 11 bonus skill breakdown text doesn't live-update yet (only budget counter does)

## Implementation Plan

* **Affected paths**: `/home/worldofgeese/Downloads/projects/mythras-chargen/index.html`
  - `updateSkillPoints()` (~line 15126) — calls `refreshStepBudget()` instead of `renderCurrentStep()`
  - `updateCharacteristic()` (~line 14594) — calls `refreshStepBudget('characteristics')` instead of `renderCurrentStep()`
  - `refreshStepBudget()` (~line 15158) — new function
  - `getValidationState()` (~line 15180) — new function
  - `showConfirmation()` / `dismissConfirmation()` (~line 14118) — new functions
  - `renderStep5()`, `renderStep10()`, `renderStep11()` — added `data-testid` attributes to rows/inputs
  - Budget tracker divs — added `data-testid="budget-tracker"`
  - CSS (~line 112) — added `.confirm-overlay`, `.confirm-box` styles
  - Miracle cleanup IIFE (~line 13882) — added colon-artifact regex

* **Dependencies**: None added or removed
* **Patterns to follow**:
  - Functions that change point values ONLY → call `refreshStepBudget()`
  - Functions that change the SET of visible skills → call `renderCurrentStep()`
  - All new interactive elements MUST have `data-testid`
  - Agent-facing APIs return plain objects (no DOM dependency)

* **Patterns to avoid**:
  - Never call `renderCurrentStep()` from a spinbutton `onchange` handler
  - Never use `confirm()` — use `App.showConfirmation()` instead
  - Never use transient toasts as the only validation feedback for programmatic consumers

### Verification

- [x] `node test-bug-fixes.mjs && node test-bug-fixes-r2.mjs && node test-bug-fixes-r3.mjs && node test-bug-fixes-r4.mjs && node test-bug-fixes-r5.mjs` — all 44 tests pass
- [x] `document.querySelector('[data-testid="skill-input-Athletics"]')` returns an element after Step 5 renders
- [x] Filling a skill input via Playwright does NOT invalidate the element ref (input survives)
- [x] `App.getValidationState()` returns `{valid: false, errors: [...], step: 5}` when points are unspent
- [x] Budget tracker updates to correct value after `updateSkillPoints()` without full re-render
- [x] `confirm()` is no longer called anywhere in the codebase

## Alternatives Considered

* **Full reactive framework (Lit, Preact)**: Would solve DOM stability completely but requires a build step, breaking the single-file constraint. Rejected: too much architectural change for the current project stage.
* **Virtual DOM diffing (morphdom)**: Library that patches only changed DOM nodes. Would work without a build step. Rejected: adds a dependency, and the targeted-update approach is simpler for the specific problem (budget counters are the only thing that needs updating on value change).
* **Debounced re-render**: Keep full re-render but debounce it (only fire after 300ms of inactivity). Rejected: still destroys DOM and loses focus — just delays it.

## More Information

- This ADR was triggered by the "playwright-cli-first" assessment which scored the app 2/10 for DOM stability
- The `renderCurrentStep()` function remains the nuclear option for structural changes — it is intentionally kept
- Future work: Step 11 breakdown text (`base + culture + career + bonus = X%`) should also update targeted (not just the budget counter)
- Revisit trigger: if a build step is ever adopted, consider morphdom or Lit for full reactive rendering
