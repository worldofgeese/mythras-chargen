# Agent API (`App.agent.*`)

## Purpose

Programmatic interface for AI agents (and tests) to build characters without DOM interaction. Located at index.html lines 19050–19770.

## API Surface

### `App.agent.getState()` → object

Returns the full compiled character state as plain JSON. Never throws.

Fields include: `step`, `name`, `concept`, `culture`, `homeland`, `characteristics`, `attributes`, `career`, `cult`, `miracles`, `devotionalPool`, `socialClass`, `skills` (compiled with totals), `passions`, `folkMagicSpells`, `careerFolkMagic`, `runeAffinities`, `culturalSkills`, `careerSkills`, `bonusSkills`, `selectedProfessionalSkills`, `combatStyles`, `age`, `gender`, `startingMoney`, `equipment`, `weapons`, `armor`.

### `App.agent.getOptions(step)` → object

Returns valid choices for a given step, filtered by current character state.

| Step | Returns |
|------|---------|
| 4 | `{cultures: [{name, type, homelands, startingMoney}]}` |
| 5 | `{standardSkills, professionalSkills, folkMagicOptions, runes, combatStyles}` |
| 6 | `{passions}` |
| 7 | `{ageTable}` |
| 8 | `{careers, filteredForCulture}` |
| 9 | `{primaryCults, secondaryCults, note}` |
| 10 | `{careerSkills, folkMagicOptions}` |
| 11 | `{totalPoints, maxPerSkill}` |
| 12 | `{socialClassTable, cultureType}` |

### `App.agent.getValidation()` → object

Returns `{valid, errors[], step}` — wraps `App.getValidationState()`.

### `App.agent.setStep(step, data)` → `{success, errors[], state}`

Sets character data for a single step. Validates before applying — on failure, state is unchanged.

**Validation constraints by step:**
- Step 2 (Characteristics): Sum must equal 75
- Step 5 (Cultural Skills): Must allocate exactly 100 points
- Step 10 (Career Skills): Must allocate exactly 100 points
- Step 11 (Bonus Skills): Must allocate exactly 150 or 200 points (age-dependent)

### `App.agent.buildCharacter(spec)` → `{success, errors[], character?, failedStep?}`

Builds a complete character in one call. The `spec` object has keys `step1` through `step12`, each containing the data for that step.

```js
const result = App.agent.buildCharacter({
  step1: { name: "Vargast", concept: "Storm warrior" },
  step2: { STR: 14, CON: 12, SIZ: 13, DEX: 11, INT: 10, POW: 8, CHA: 7 },
  step4: { culture: "Sartarite (Heortling)", homeland: "Boldhome" },
  step5: { culturalSkills: {...}, folkMagic: [...], runes: {...} },
  step8: { career: "Warrior" },
  step9: { cult: "Orlanth" },
  step10: { careerSkills: {...} },
  step11: { bonusSkills: {...} },
  step12: { /* social class */ }
});
```

**Behavior:**
- Iterates steps 1–12 sequentially
- Calls `App.agent.setStep()` for each step with data
- Step 3 is auto-calculated (skipped)
- Steps without data in spec are skipped (optional steps like 6, 7)
- On first failure: returns immediately with error and `failedStep`
- On success: switches to Play Mode, returns final state

**Error format:** Errors are human-readable strings (e.g., "Character name is required", "Characteristics must sum to 75").

## Testing

- `test-agent-api.mjs` — 30 E2E assertions using playwright-cli
  - Opens browser, navigates to app, calls `App.agent.buildCharacter()` with 4 different character specs
  - Verifies magic system mechanics (miracles, sorcery, spirits)
  - Self-manages browser lifecycle (open/close)
  - Requires: `python3 -m http.server 8765 --directory .`
