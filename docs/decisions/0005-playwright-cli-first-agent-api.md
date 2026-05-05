---
status: proposed
date: 2026-05-05
decision-makers: [worldofgeese]
supersedes: []
extends: [0004]
---

# ADR-0005: Adopt Playwright-CLI-First Agent API Architecture

## Context and Problem Statement

ADR-0004 fixed the worst DOM stability issues (budget counters survive after `fill()`), but agents still spend the majority of their interaction time on DOM gymnastics. A full end-to-end character build via playwright-cli requires:

- **42 remaining `renderCurrentStep()` calls** that destroy all element references after structural interactions (selecting a culture, checking a professional skill, resolving a disambiguation)
- **Mixed interaction modes** — agents must alternate between `playwright-cli click/fill` (for UI) and `playwright-cli eval` (for state manipulation) because the 13-step wizard with conditional validation creates too many branching paths for pure UI automation
- **Event handler inconsistency** — some inputs use `oninput` (fires on fill), others use `onchange` (fires only on blur/Tab), requiring agents to know which pattern each element uses
- **No stable selectors** on Steps 6-9, 12-13 — professional skill checkboxes, cult cards, miracle buttons, passion dropdowns all lack `data-testid`
- **Disambiguation is fragile** — agents must check a checkbox, wait for re-render, find the new specialization input, fill it, press Tab to trigger `onchange`, then verify the state updated correctly

Evidence from testing session (2026-05-05): Building 4 characters with playwright-cli required ~60% `page.evaluate()` calls vs ~40% actual UI interactions. The "playwright-cli first" promise of ADR-0004 is partially delivered but not yet realized.

## Decision

Introduce a **dual-interface architecture**: the wizard UI remains for humans, and a new `App.agent` namespace provides a programmatic API for agents that operates at the **semantic level** (steps, skills, choices) rather than the DOM level (elements, events, selectors).

### The Agent API Contract

```javascript
// Step-level operations — validate and apply data in one call
App.agent.setStep(stepNumber, data) → {success: bool, errors: string[], state: object}

// Query operations — read compiled state without DOM dependency
App.agent.getState() → {step, characteristics, culture, career, skills, cult, miracles, ...}
App.agent.getOptions(stepNumber) → {cultures: [...], careers: [...], cults: [...], ...}
App.agent.getValidation() → {valid: bool, errors: string[], step: number}

// Navigation — advance/retreat with validation
App.agent.next() → {success: bool, errors: string[], newStep: number}
App.agent.prev() → {success: bool, newStep: number}

// Convenience — full character in one call (for test harnesses)
App.agent.buildCharacter(spec) → {success: bool, errors: string[], character: object}
```

### Design Principles

1. **Semantic, not mechanical** — `setStep(8, {career: 'Hunter', professionalSkills: [{name: 'Lore (Regional or Specific Species)', specialization: 'Plants'}]})` instead of "click checkbox, wait, find input, fill, tab"
2. **Validate-and-apply** — every `setStep` call validates the data and returns structured errors. No silent failures.
3. **Idempotent** — calling `setStep(5, data)` twice with the same data produces the same result
4. **DOM-independent** — the agent API reads/writes `CharacterData` directly, then optionally calls `renderCurrentStep()` once at the end to sync the UI
5. **Disambiguation is transparent** — the API accepts `{name: 'Craft (any)', specialization: 'Pottery'}` and handles the resolution internally
6. **Backward-compatible** — existing UI event handlers continue to work unchanged; the agent API is additive

### Interaction Model for Agents

```bash
# Agent builds a character using only eval calls
playwright-cli eval "JSON.stringify(App.agent.getOptions(4))"
# → {cultures: [{name: 'Sartarite (Heortling)', type: 'Barbarian', ...}, ...]}

playwright-cli eval "JSON.stringify(App.agent.setStep(4, {culture: 'Sartarite (Heortling)', homeland: 'Boldhome'}))"
# → {success: true, errors: [], state: {culture: 'Sartarite (Heortling)', ...}}

playwright-cli eval "JSON.stringify(App.agent.next())"
# → {success: true, errors: [], newStep: 5}

# Visual verification via snapshot (not required for correctness)
playwright-cli snapshot
```

### What Stays the Same

- The wizard UI and all inline event handlers remain unchanged
- `renderCurrentStep()` continues to be the DOM rendering engine
- Existing test suites (`test-chargen.js`, `test-100-chars.mjs`, `test-fixtures.mjs`) continue to work
- `App.getValidationState()` from ADR-0004 remains (the agent API wraps it)

### Non-Goals

- Rewriting the wizard rendering engine or adopting a framework
- Breaking the single-file HTML constraint
- Removing inline event handlers or adding event delegation
- Making the UI itself more automatable (that's ADR-0004's domain)
- Supporting concurrent agent sessions (single-user app)

## Consequences

* Good, because agents can build characters in 13 `eval` calls instead of 50+ mixed interactions
* Good, because disambiguation is handled internally — agents pass `{specialization: 'Plants'}` and the API resolves it
* Good, because validation errors are always structured and synchronous — no toast parsing
* Good, because the API is testable in Node.js (via `test-chargen.js` sandbox) without a browser
* Good, because `getOptions()` lets agents discover valid choices without scraping the DOM
* Bad, because two paths to modify state exist (UI handlers vs agent API) — must stay in sync
* Bad, because the agent API must be maintained alongside UI changes — new wizard steps need API support
* Neutral, because the API adds ~200-400 lines to `index.html` — acceptable for a single-file app

## Implementation Plan

### Affected Paths

- **`index.html`** — add `App.agent` namespace (~line 18600, after all existing App methods)
- **`AGENTS.md`** — document the agent API with examples
- **`test-chargen.js`** — add unit tests for `App.agent.*` methods in the Node.js sandbox

### Implementation Order

1. **`App.agent.getState()`** — read-only, returns compiled character state
2. **`App.agent.getOptions(step)`** — returns valid choices for each step (cultures, careers, cults, spells, etc.)
3. **`App.agent.getValidation()`** — wraps `App.getValidationState()`
4. **`App.agent.setStep(step, data)`** — the core write operation, one per step:
   - Step 1: `{name, concept}`
   - Step 2: `{characteristics: {STR, CON, SIZ, DEX, INT, POW, CHA}}`
   - Step 4: `{culture, homeland}`
   - Step 5: `{culturalSkills: {skillName: points, ...}, runeAffinities: {primary, secondary, tertiary}, folkMagicSpells: [...]}`
   - Step 6: `{passions: [{type, subject, value}, ...]}`
   - Step 7: `{age, gender, family, backgroundEvents}`
   - Step 8: `{career, professionalSkills: [{name, specialization?}, ...]}`
   - Step 9: `{cult, miracles: [...]}`
   - Step 10: `{careerSkills: {skillName: points, ...}, careerFolkMagic: [...]}`
   - Step 11: `{bonusSkills: {skillName: points, ...}}`
   - Step 12: `{socialClass}` or `{rollSocialClass: true}`
5. **`App.agent.next()` / `App.agent.prev()`** — navigation with validation
6. **`App.agent.buildCharacter(spec)`** — convenience wrapper that calls `setStep` for each step in sequence

### Patterns to Follow

- All agent API methods return plain JSON objects (no DOM references, no Promises)
- Errors are always arrays of human-readable strings
- `setStep` validates BEFORE applying — if validation fails, state is unchanged
- After successful `setStep`, call `renderCurrentStep()` once to sync UI (optional — can be deferred)
- Disambiguation is handled by the API: `{name: 'Craft (any)', specialization: 'Pottery'}` → internally calls the same resolution logic as `resolveProfessionalSkill`

### Patterns to Avoid

- Never expose DOM elements through the agent API
- Never require agents to know about `onchange` vs `oninput` behavior
- Never require agents to call `renderCurrentStep()` directly
- Never return `undefined` — always return a structured response object

### Verification

- [ ] `App.agent.setStep(1, {name: 'Test', concept: 'Test'})` returns `{success: true, ...}`
- [ ] `App.agent.setStep(8, {career: 'Hunter', professionalSkills: [{name: 'Lore (Regional or Specific Species)', specialization: 'Plants'}]})` resolves to `Lore (Plants)` in state
- [ ] `App.agent.next()` returns `{success: false, errors: [...]}` when validation fails
- [ ] `App.agent.getOptions(4)` returns all 8 cultures with their types and homelands
- [ ] `App.agent.getOptions(9)` returns available cults filtered by current culture
- [ ] `App.agent.buildCharacter({...fullSpec...})` produces a complete character reachable in Play Mode
- [ ] Full character build via playwright-cli uses zero `click`/`fill` calls — only `eval` with `App.agent.*`
- [ ] Existing `test-chargen.js` still passes (no regressions)
- [ ] `App.agent.getState()` returns consistent data whether character was built via UI or API

## Alternatives Considered

### Option 2: Full DOM Stability (Replace All 42 renderCurrentStep Calls)

Replace every `renderCurrentStep()` with targeted DOM patches. Each structural change (add skill row, show disambiguation input, update cult card selection) gets its own surgical update function.

**Rejected because:**
- Extremely high effort (42 unique DOM mutation paths to write and maintain)
- Fragile — any new feature that adds DOM elements needs a new targeted update
- Doesn't solve the fundamental problem: agents still need to know which selectors to use, which events to trigger, and what order to interact in
- Doesn't help with the 13-step validation maze

### Option 3: Selector-Only Approach (Add data-testid Everywhere)

Add `data-testid` to every interactive element across all 13 steps. Accept that agents must re-query after structural changes.

**Rejected as primary approach because:**
- Doesn't reduce the number of interactions needed (still 50+ per character)
- Doesn't solve event handler inconsistency
- Doesn't make disambiguation transparent
- Still requires agents to understand the wizard's validation flow
- Useful as a complement (for visual verification via `snapshot`) but not as the primary interface

**Adopted as secondary measure:** Steps 6-9, 12-13 should still get `data-testid` attributes for cases where agents need to verify visual state via snapshots.

## More Information

- This ADR extends ADR-0004 — it builds on the foundation of `getValidationState()` and `data-testid` conventions
- The agent API is inspired by the "Ports and Adapters" pattern — the wizard UI is one adapter (for humans), the agent API is another (for automation), both operating on the same core domain (`CharacterData`)
- Revisit trigger: if the app ever adopts a reactive framework, the agent API should become the canonical state management layer (the UI becomes a pure view)
- The `buildCharacter` convenience method enables property-based testing: generate random valid specs and verify the app handles them
