# Agent API Reference

## Overview

`App.agent` provides a programmatic interface for AI agents (via `agent-browser eval`) to build characters, query state, and verify correctness — without DOM scraping or fragile CSS selectors.

## State Query API

### `App.agent.getState()`
Returns the full compiled character state as plain JSON. Never throws.

```js
const state = App.agent.getState();
// → {step, name, concept, culture, homeland, characteristics, attributes,
//    career, cult, miracles, devotionalPool, skills, passions, folkMagicSpells,
//    runeAffinities, culturalSkills, careerSkills, bonusSkills, combatStyles, ...}
```

### `App.agent.getUIState()`
Returns current UI state — which step/mode is active, what pickers are visible.

```js
const ui = App.agent.getUIState();
// → {currentStep, mode, cultPickerVisible, miraclePickerVisible,
//    spiritPickerVisible, sorceryPickerVisible, errors[], toasts[]}
```

### `App.agent.getMagicState()`
Returns all magic-system state in one call. Replaces manual `CharacterData` access.

```js
const magic = App.agent.getMagicState();
// → {cultType, cultName, devotionalPool, boundSpiritSlots, sorceryResource,
//    selectedMiracles[], selectedSpells[], selectedSpirits[],
//    availableMiracles[], availableSpells[], availableSpirits[],
//    limits: {miracles, sorcerySpells, spirits}}
```

### `App.agent.getValidation()`
Returns current validation state from `App.getValidationState()`.

### `App.agent.getOptions(step)`
Returns valid choices for a given step, filtered by current character state.

## Granular Action API

### `App.agent.selectCult(name)`
Select a cult, triggering resource pool calculation. Clears previous magic selections.

```js
App.agent.selectCult('Orlanth');
// → {success: true, magicState: {...}}
```

### `App.agent.toggleSpell(name)`
Toggle a sorcery spell on/off. Enforces the 3-spell limit.

```js
App.agent.toggleSpell('Animate');
// → {success: true, selected: 1, limit: 3, spells: ['Animate']}
```

### `App.agent.toggleSpirit(name)`
Toggle a bound spirit on/off. Enforces the CHA/2 slot limit.

```js
App.agent.toggleSpirit('Whulla');
// → {success: true, used: 1, limit: 4, spirits: ['Whulla']}
```

### `App.agent.selectMiracle(name)`
Toggle a miracle on/off. Enforces the devotionalPool limit.

```js
App.agent.selectMiracle('Shield');
// → {success: true, selected: 1, limit: 6, miracles: ['Shield']}
```

### `App.agent.allocateSkill(skillMap, pool)`
Allocate points to skills. `pool`: 'cultural' | 'career' | 'bonus'.

```js
App.agent.allocateSkill({Athletics: 15, Brawn: 10}, 'cultural');
// → {success: true, pool: 'cultural', allocated: {Athletics: 15, Brawn: 10}}
```

### `App.agent.setCharacteristic(name, value)`
Set a single characteristic (STR/CON/SIZ/DEX/INT/POW/CHA). Value must be 3-18.

```js
App.agent.setCharacteristic('STR', 14);
// → {success: true, characteristics: {STR: 14, ...}}
```

## Bulk Operations

### `App.agent.setStep(step, data)`
Set character data for a given step. Validates before applying.

### `App.agent.buildCharacter(spec)`
Build a complete character in one call. Spec is `{step1: {...}, step2: {...}, ...}`.

### `App.agent.next()` / `App.agent.prev()`
Navigate wizard steps forward/backward.

## Assertion Helpers

### `App.agent.assertSpellCount()`
```js
// → {selected: 3, limit: 3, spells: [...], withinLimit: true}
```

### `App.agent.assertSpiritSlots()`
```js
// → {used: 2, limit: 4, spirits: [...], withinLimit: true}
```

### `App.agent.assertMiracles()`
```js
// → {selected: 6, limit: 6, miracles: [...], available: 12, withinLimit: true, allValid: true}
```

### `App.agent.assertPlayMode()`
```js
// → {ready: true, sections: ['identity','characteristics','skills','magic','combat','culture','career'],
//    errors: [], missing: []}
```

## Event Log

### `App.agent.getEventLog()`
Returns all agent API calls with timestamps and success status.

```js
// → [{action: 'selectCult', args: ['Orlanth'], timestamp: '...', success: true}, ...]
```

### `App.agent.clearEventLog()`
Clear the event log.

## Usage from agent-browser

```bash
# One-liner: query magic state after building a character
agent-browser eval "JSON.stringify(App.agent.getMagicState())"

# Granular actions (no IIFE needed)
agent-browser eval "JSON.stringify(App.agent.selectCult('Orlanth'))"
agent-browser eval "JSON.stringify(App.agent.assertMiracles())"
```
