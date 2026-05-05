---
status: active
spec: .rpi/specs/agent-api.md
adr: docs/decisions/0005-playwright-cli-first-agent-api.md
---

# Design: Playwright-CLI-First Agent API

## Problem

Agents building characters via playwright-cli spend 60%+ of interactions on DOM mechanics rather than character decisions. The 13-step wizard with conditional validation, disambiguation prompts, and full DOM rebuilds creates a hostile automation surface.

## Solution

Add an `App.agent` namespace that provides step-level semantic operations. Agents pass data (culture names, skill choices, point allocations) and receive structured JSON responses. The API operates on `CharacterData` directly, using the same validation and resolution logic as the UI handlers.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  CharacterData                    │
│         (single source of truth)                 │
└──────────────┬──────────────────┬───────────────┘
               │                  │
    ┌──────────▼──────────┐  ┌───▼────────────────┐
    │   UI Event Handlers  │  │   App.agent.*       │
    │   (onclick/onchange) │  │   (eval interface)  │
    │                      │  │                     │
    │  Human interaction   │  │  Agent interaction  │
    │  DOM ↔ State sync    │  │  Data ↔ State sync  │
    └──────────┬───────────┘  └───┬────────────────┘
               │                  │
               ▼                  ▼
    ┌─────────────────────────────────────────────┐
    │           renderCurrentStep()                │
    │        (DOM sync — called once)              │
    └─────────────────────────────────────────────┘
```

Both paths write to `CharacterData`. The UI path does it incrementally (one field at a time). The agent path does it in bulk (one step at a time). Both use the same validation functions.

## API Surface

### Core Methods

| Method | Input | Output | Side Effects |
|--------|-------|--------|--------------|
| `getState()` | none | Full compiled character state | None (read-only) |
| `getOptions(step)` | step number | Valid choices for that step | None (read-only) |
| `getValidation()` | none | `{valid, errors, step}` | None (read-only) |
| `setStep(step, data)` | step + data object | `{success, errors, state}` | Writes CharacterData, calls renderCurrentStep() |
| `next()` | none | `{success, errors, newStep}` | Advances step if valid |
| `prev()` | none | `{success, newStep}` | Retreats step |
| `buildCharacter(spec)` | Full character spec | `{success, errors, character}` | Builds entire character |

### setStep Data Schemas

```javascript
// Step 1
{name: "Korlmar", concept: "Warrior seeking vengeance"}

// Step 2
{characteristics: {STR: 13, CON: 11, SIZ: 12, DEX: 12, INT: 10, POW: 10, CHA: 7}}

// Step 4
{culture: "Sartarite (Heortling)", homeland: "Boldhome"}

// Step 5
{
  culturalSkills: {"Athletics": 15, "Brawn": 10, ...},  // must total 100
  runeAffinities: {primary: "Storm", secondary: "Movement", tertiary: "Death"},
  folkMagicSpells: ["Bladesharp", "Protection", "Fanaticism"],
  choiceSkill: "Ride"  // for "Ride or Swim" type choices
}

// Step 6
{passions: [
  {type: "Loyalty", subject: "Clan", value: 47},
  {type: "Hate", subject: "Chaos", value: 47}
]}

// Step 7
{age: 25, gender: "Male", family: "Blackspear clan", backgroundEvents: "..."}

// Step 8
{
  career: "Hunter",
  professionalSkills: [
    {name: "Lore (Regional or Specific Species)", specialization: "Plants"},
    {name: "Craft (Hunting Related)", specialization: "Trapmaking"},
    {name: "Track"}  // no specialization needed
  ]
}

// Step 9
{cult: "Orlanth", miracles: ["Shield", "Lightning", "Thunderbolt", "Wind Words", "Leap"]}
// OR
{cult: null}  // no cult

// Step 10
{
  careerSkills: {"Athletics": 10, "Brawn": 10, ...},  // must total 100
  careerFolkMagic: ["Disruption", "Vigour"]
}

// Step 11
{bonusSkills: {"Athletics": 15, "Combat Style (Hill Clan Levy)": 15, ...}}  // must total 150

// Step 12
{socialClass: "Freeman"}
// OR
{rollSocialClass: true}  // random roll
```

### getOptions Response Examples

```javascript
// getOptions(4)
{
  cultures: [
    {name: "Sartarite (Heortling)", type: "Barbarian", homelands: ["Sartar", "Boldhome", ...]},
    {name: "Praxian", type: "Nomad", homelands: ["Prax", "Pavis", ...]},
    ...
  ]
}

// getOptions(8)
{
  careers: [
    {name: "Warrior", cultureTypes: ["Barbarian", "Civilised", ...], standardSkills: [...], professionalSkills: [...]},
    ...
  ],
  filteredForCulture: ["Warrior", "Hunter", "Scout", ...]  // only careers matching current culture type
}

// getOptions(9)
{
  primaryCults: [{name: "Orlanth", pantheon: "Storm", cultSkills: [...], miracles: [...]}],
  secondaryCults: [{name: "Storm Bull", ...}]
}
```

## Implementation Strategy

### Phase 1: Read-Only Methods (Low Risk)
- `App.agent.getState()` — compile and return CharacterData
- `App.agent.getOptions(step)` — query CULTURES_DATA, CAREERS_DATA, CULTS_DATA
- `App.agent.getValidation()` — wrap existing `App.getValidationState()`

### Phase 2: Write Methods (Core Value)
- `App.agent.setStep(step, data)` — one method per step, with:
  - Input validation (type checks, range checks, total checks)
  - Disambiguation resolution (transparent to caller)
  - State application (write to CharacterData)
  - UI sync (call renderCurrentStep() once at end)

### Phase 3: Navigation + Convenience
- `App.agent.next()` / `App.agent.prev()` — validate and advance
- `App.agent.buildCharacter(spec)` — iterate all steps

## Key Design Decisions

1. **Sync, not async** — everything returns immediately. No callbacks, no Promises. This makes `playwright-cli eval` usage trivial.

2. **Validate-then-apply** — if validation fails, state is unchanged. Agents never end up in a half-applied state.

3. **Render once at end** — `setStep` applies all data, THEN calls `renderCurrentStep()` once. This avoids the 42-rebuild problem entirely.

4. **Disambiguation is internal** — the API accepts placeholder names with a `specialization` field and resolves them using existing `parsePlaceholderSkill`/`resolveProfessionalSkill` logic.

5. **getOptions is culture/career-aware** — it filters based on current state (e.g., careers filtered by culture type, cults filtered by culture).

## Testing Strategy

- **Unit tests in `test-chargen.js`** — test each `App.agent.*` method in the Node.js sandbox
- **E2E test via playwright-cli** — build a character using only `eval` calls, verify Play Mode state
- **Parity test** — build same character via UI and API, compare `getState()` output
- **Fuzz test** — generate random valid specs, verify `buildCharacter` handles them all

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| API and UI diverge over time | Both use same validation functions; parity test catches drift |
| API adds maintenance burden | API is thin wrapper over existing logic, not a parallel implementation |
| Breaking single-file constraint | API is pure JS, inlined like everything else |
| Performance with large getOptions | Lazy evaluation — only compute what's asked for |
