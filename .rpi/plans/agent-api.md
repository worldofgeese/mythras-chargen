---
status: completed
design: .rpi/designs/agent-api.md
spec: .rpi/specs/agent-api.md
adr: docs/decisions/0005-playwright-cli-first-agent-api.md
---

# Implementation Plan: Agent API

## Overview

Add `App.agent` namespace to `index.html` providing programmatic character creation for playwright-cli agents. Insert at line 18685 (after last App method, before INITIALIZATION block).

## Phase 1: Read-Only API

**Goal:** Agents can query state and options without touching the DOM.

### Tasks

1. **`App.agent.getState()`** — returns compiled character state
   - File: `index.html` (insert after line 18685)
   - Reuses: `App.compileAllSkills()` (line 17861), `CharacterData` fields
   - Returns: `{step, name, concept, culture, homeland, characteristics, career, cult, miracles, socialClass, skills: [{name, total}], passions, folkMagic, runeAffinities, equipment}`

2. **`App.agent.getOptions(step)`** — returns valid choices for a step
   - File: `index.html`
   - Reuses: `CULTURES_DATA` (line 725), `CAREERS_DATA` (line 770), `CULTS_DATA` (line 772), `CULTURE_CULT_MAP` (line 830), `FOLK_MAGIC_SPELLS`, `AGE_TABLE`
   - Step 4: cultures with types and homelands
   - Step 5: culture's standard/professional skills, folk magic options, rune list
   - Step 8: careers filtered by current culture type, with professional skill lists
   - Step 9: cults filtered by `CULTURE_CULT_MAP[culture]`, with miracles
   - Step 10: career skill list (standard + selected professional + combat styles)
   - Step 12: social class table for current culture type

3. **`App.agent.getValidation()`** — wraps `App.getValidationState()`
   - File: `index.html`
   - Trivial wrapper: `return App.getValidationState();`

### Success Criteria

- `node test-chargen.js` passes (no regressions)
- `playwright-cli eval "JSON.stringify(App.agent.getState())"` returns valid JSON with all expected fields
- `playwright-cli eval "JSON.stringify(App.agent.getOptions(4))"` returns 8 cultures with homelands
- `playwright-cli eval "JSON.stringify(App.agent.getOptions(8))"` returns careers filtered for current culture type
- `playwright-cli eval "JSON.stringify(App.agent.getValidation())"` matches `App.getValidationState()` output

### Commit

`feat: add App.agent read-only API (getState, getOptions, getValidation)`

---

## Phase 2: Write API — Steps 1-4

**Goal:** Agents can set character concept, characteristics, and culture via API.

### Tasks

1. **`App.agent.setStep(1, data)`** — set name and concept
   - Validates: name is non-empty string
   - Applies: `CharacterData.name`, `CharacterData.concept`

2. **`App.agent.setStep(2, data)`** — set characteristics
   - Validates: all 7 stats present, each 3-21, INT/SIZ min 8, total = 75
   - Applies: `CharacterData.characteristics`
   - Side effect: calls `Calc.calculateAllAttributes()`

3. **`App.agent.setStep(3, data)`** — no-op (attributes are auto-calculated)
   - Returns: `{success: true, state: {attributes: ...}}`

4. **`App.agent.setStep(4, data)`** — set culture and homeland
   - Validates: culture exists in `CULTURES_DATA`, homeland is valid for culture
   - Applies: `CharacterData.culture`, `CharacterData.homeland`
   - Side effect: rolls starting money if not provided, resolves combat styles

5. **Response envelope** — all `setStep` calls return `{success: bool, errors: string[], state: object}`
   - On success: data is applied, `renderCurrentStep()` called, state returned
   - On failure: data is NOT applied, errors explain why

### Success Criteria

- `App.agent.setStep(1, {name: 'Test', concept: 'Test'})` returns `{success: true}`
- `App.agent.setStep(2, {characteristics: {STR:18,CON:18,...}})` with total > 75 returns `{success: false, errors: [...]}`
- `App.agent.setStep(4, {culture: 'Sartarite (Heortling)', homeland: 'Boldhome'})` sets culture and homeland
- `App.agent.setStep(4, {culture: 'INVALID'})` returns `{success: false}`
- `node test-chargen.js` still passes

### Commit

`feat: add App.agent.setStep for Steps 1-4`

---

## Phase 3: Write API — Steps 5-9

**Goal:** Agents can set cultural skills, passions, background, career (with disambiguation), and cult/miracles.

### Tasks

1. **`App.agent.setStep(5, data)`** — cultural skills, runes, folk magic
   - Validates: skill point total = 100, max 15 per skill, 3 runes selected (unique), 3 folk magic spells, choice skills resolved
   - Disambiguation: accepts `{"Craft (any)": 10}` → resolves if `choiceSkill` or `specializations` field provided
   - Applies: `CharacterData.culturalSkills`, `CharacterData.runeAffinities`, `CharacterData.folkMagicSpells`

2. **`App.agent.setStep(6, data)`** — passions
   - Validates: each passion has type and subject
   - Applies: `CharacterData.passions`

3. **`App.agent.setStep(7, data)`** — background details
   - Validates: age is number (optional, defaults to 21)
   - Applies: `CharacterData.age`, `CharacterData.gender`, `CharacterData.family`, `CharacterData.backgroundEvents`

4. **`App.agent.setStep(8, data)`** — career and professional skills
   - Validates: career exists and is valid for culture type, exactly 3 professional skills from career's list
   - **Disambiguation**: accepts `{name: 'Lore (Regional or Specific Species)', specialization: 'Plants'}` → resolves to `'Lore (Plants)'` using `parsePlaceholderSkill` logic
   - Applies: `CharacterData.career`, `CharacterData.selectedProfessionalSkills`, `CharacterData.careerSkills` (standard skills + resolved professional skills)
   - Reuses: `App.selectCareer()` logic (line 15561), `App.resolveCareerCombatStyle()`

5. **`App.agent.setStep(9, data)`** — cult and miracles
   - Validates: cult exists in `CULTS_DATA` (or null for no-cult), miracles are valid initiate miracles for the cult, miracle count = devotional pool
   - Applies: `CharacterData.cult`, `CharacterData.miracles`, `CharacterData.devotionalPool`
   - Reuses: `App.selectCult()` logic (line 15921), cult skill warning (informational only)

### Success Criteria

- `App.agent.setStep(8, {career: 'Hunter', professionalSkills: [{name: 'Lore (Regional or Specific Species)', specialization: 'Plants'}, ...]})` resolves to `Lore (Plants)` in state
- `App.agent.setStep(9, {cult: 'Orlanth', miracles: [...]})` with wrong miracle count returns error
- `App.agent.setStep(9, {cult: null})` succeeds (no-cult path)
- `App.agent.setStep(5, {...})` with total != 100 returns error
- Spec Scenario 2 (disambiguation) passes
- Spec Scenario 3 (validation errors not applied) passes

### Commit

`feat: add App.agent.setStep for Steps 5-9 (disambiguation, cult, miracles)`

---

## Phase 4: Write API — Steps 10-12 + Navigation

**Goal:** Agents can distribute career/bonus points, set social class, and navigate between steps.

### Tasks

1. **`App.agent.setStep(10, data)`** — career skills and career folk magic
   - Validates: point total = 100, max 15 per skill, skills must be from career template, 2 folk magic spells
   - Applies: `CharacterData.careerSkills` (updates point values), `CharacterData.careerFolkMagic`

2. **`App.agent.setStep(11, data)`** — bonus points
   - Validates: point total = age-based pool (150 for Adult), max 15 per skill
   - Applies: `CharacterData.bonusSkills`

3. **`App.agent.setStep(12, data)`** — social class
   - Validates: social class is valid for culture type, OR `rollSocialClass: true`
   - Applies: `CharacterData.socialClass`
   - If `rollSocialClass: true`: rolls d100 against culture's social class table

4. **`App.agent.next()`** — validate current step and advance
   - Calls `App.validateCurrentStep()` (the existing validation)
   - If valid: increments step, calls `renderCurrentStep()`, returns `{success: true, newStep}`
   - If invalid: returns `{success: false, errors: [...], newStep: currentStep}`

5. **`App.agent.prev()`** — go back one step
   - No validation needed
   - Returns `{success: true, newStep}`

### Success Criteria

- `App.agent.setStep(10, {careerSkills: {...}, careerFolkMagic: [...]})` with total != 100 returns error
- `App.agent.setStep(12, {rollSocialClass: true})` sets a valid social class
- `App.agent.next()` on Step 9 without miracles returns `{success: false, errors: [...]}`
- `App.agent.next()` on valid step advances to next step
- Spec Scenario 5 (miracle validation blocks) passes
- Spec Scenario 6 (no-cult skips validation) passes

### Commit

`feat: add App.agent.setStep for Steps 10-12 + next()/prev() navigation`

---

## Phase 5: buildCharacter + E2E Verification

**Goal:** One-call character creation and full end-to-end proof via playwright-cli.

### Tasks

1. **`App.agent.buildCharacter(spec)`** — convenience wrapper
   - Iterates steps 1→12, calling `setStep` for each
   - On any failure: returns immediately with the error and which step failed
   - On success: calls `App.switchMode('play')`, returns `{success: true, character: App.agent.getState()}`
   - Spec format: `{step1: {...}, step2: {...}, ..., step12: {...}}`

2. **E2E test script** — `test-agent-api.mjs`
   - Builds 3 characters using only `App.agent.*` calls via Playwright
   - Verifies Play Mode state matches expectations
   - Tests: Sartarite Warrior (Orlanth), Praxian Shaman (Daka Fal), God Forgot Sorcerer (no cult)
   - Validates Spec Scenarios 1, 7, 8

3. **Unit tests** — add to `test-chargen.js`
   - Test `App.agent.getState()` returns expected fields
   - Test `App.agent.setStep` validation (reject bad data, accept good data)
   - Test disambiguation resolution
   - Test `buildCharacter` with a full spec

4. **AGENTS.md update** — document the agent API
   - Add "Agent API" section with method signatures and examples
   - Update Playwright Testing section to show `App.agent.*` as primary approach

### Success Criteria

- `App.agent.buildCharacter(fullSpec)` produces a complete character in Play Mode
- `test-agent-api.mjs` passes (3 characters built via API, all verified)
- `node test-chargen.js` passes (unit tests for agent API)
- Full character build via playwright-cli uses ZERO `click`/`fill` calls — only `eval`
- Spec Scenario 7 (buildCharacter) passes
- Spec Scenario 8 (API/UI parity) passes for at least one character

### Commit

`feat: add App.agent.buildCharacter + E2E test suite`

---

## Notes

- **Insertion point:** All new code goes after line 18685 in `index.html`, before the `// INITIALIZATION` comment
- **No new dependencies:** Pure inline JavaScript
- **Test command:** `node test-chargen.js` (existing), `node test-agent-api.mjs` (new, requires http server)
- **Total estimated size:** ~400-600 lines of new code across all phases
