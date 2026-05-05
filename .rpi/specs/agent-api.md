---
feature: agent-api
status: accepted
design: docs/decisions/0005-playwright-cli-first-agent-api.md
---

# Agent API Behavioral Spec

## Summary

The agent API provides a programmatic interface for building characters without DOM interaction. Agents pass semantic data (culture names, skill choices, point allocations) and receive structured responses (success/failure, errors, compiled state).

## Scenarios

### Scenario 1: Build a character step-by-step via API

**Given** a fresh page load with no character data  
**When** an agent calls `setStep` for each step in sequence (1 through 12) with valid data  
**Then** each call returns `{success: true}` and `getState()` reflects the accumulated data  
**And** calling `next()` after the final step transitions to Play Mode  

### Scenario 2: Disambiguation is handled transparently

**Given** a character on Step 8 with career "Hunter"  
**When** an agent calls `setStep(8, {career: 'Hunter', professionalSkills: [{name: 'Lore (Regional or Specific Species)', specialization: 'Plants'}, {name: 'Craft (Hunting Related)', specialization: 'Trapmaking'}, {name: 'Track'}]})`  
**Then** the response is `{success: true}` and `getState()` shows `selectedProfessionalSkills` containing `"Lore (Plants)"`, `"Craft (Trapmaking)"`, and `"Track"`  
**And** no placeholder names remain in the character data  

### Scenario 3: Validation errors are returned, not applied

**Given** a character on Step 2  
**When** an agent calls `setStep(2, {characteristics: {STR: 18, CON: 18, SIZ: 18, DEX: 18, INT: 18, POW: 18, CHA: 18}})` (total exceeds 75)  
**Then** the response is `{success: false, errors: ['Point total exceeds 75']}` (or similar)  
**And** `getState()` shows characteristics unchanged from before the call  

### Scenario 4: getOptions returns valid choices for the current state

**Given** a character with culture "Sartarite (Heortling)" and career "Warrior"  
**When** an agent calls `getOptions(9)` (cult selection step)  
**Then** the response includes `primaryCults` and `secondaryCults` arrays filtered for Sartarite culture  
**And** each cult entry includes `name`, `pantheon`, and `cultSkills`  

### Scenario 5: Miracle validation blocks progression

**Given** a character on Step 9 with cult "Orlanth" selected and devotional pool of 5  
**When** an agent calls `next()` with only 2 miracles selected  
**Then** the response is `{success: false, errors: ['Please select all your initiate miracles (2/5 chosen)'], newStep: 9}`  

### Scenario 6: No-cult path skips miracle validation

**Given** a character on Step 9 with no cult selected  
**When** an agent calls `next()`  
**Then** the response is `{success: true, newStep: 10}`  

### Scenario 7: buildCharacter creates a complete character in one call

**Given** a fresh page load  
**When** an agent calls `buildCharacter` with a full specification covering all steps  
**Then** the response is `{success: true}` and the app is in Play Mode  
**And** `getState()` returns a complete character with all skills compiled, equipment assigned, and magic resolved  

### Scenario 8: API and UI produce identical results

**Given** two fresh page loads  
**When** one character is built entirely via the agent API and another is built via UI interactions with identical choices  
**Then** `getState()` returns identical data for both characters  

## Constraints

- All API methods must be synchronous (return plain objects, no Promises)
- API methods must never throw — errors are always returned in the response object
- The API must work in both browser context (via `playwright-cli eval`) and Node.js sandbox (via `test-chargen.js`)
- `setStep` must be idempotent — calling it twice with the same data produces the same result
- The API must not break existing UI event handlers or test suites
- Response objects must be JSON-serializable (no DOM references, no functions, no circular refs)

## Out of Scope

- Real-time observation of UI changes (the API is command/query, not reactive)
- Multi-character sessions or party management
- Undo/redo history
- PDF export via the API (existing `Export PDF` button remains the only path)
- Modifying the wizard step order or adding new steps
