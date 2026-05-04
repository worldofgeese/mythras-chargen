---
feature: placeholder-disambiguation
status: approved
design: ../designs/placeholder-skill-disambiguation.md
---

# Spec: Placeholder Skill Disambiguation

## Scenarios

### Scenario 1: Descriptive placeholder shows disambiguation UI in wizard
**Given** a character with career "Crafter" that has skill "Craft (Primary)"
**When** the user reaches the career skills step in Wizard Mode
**Then** the skill renders as a free-text input with datalist suggestions from the Craft category
**And** the hint text "Primary" is visible as guidance

### Scenario 2: User must select specialization before allocating points
**Given** a placeholder skill "Lore (Primary Catch)" is displayed in the wizard
**When** the user has not yet typed or selected a specialization
**Then** the points input is disabled
**And** the user cannot allocate points to the placeholder name

### Scenario 3: User selects a specialization for placeholder skill
**Given** a placeholder skill "Craft (Hunting Related)" is displayed
**When** the user types "Trap Making" or selects from the datalist
**Then** the skill is stored as "Craft (Trap Making)" in character data
**And** the points input becomes enabled
**And** the original placeholder key is not stored

### Scenario 4: Validation blocks progression with unresolved placeholders
**Given** a character has "Lore (Specific Species)" still unresolved in career skills
**When** the user attempts to advance to the next wizard step
**Then** validation fails with a message: "Please select a specialization for Lore (Specific Species)"
**And** the wizard does not advance

### Scenario 5: Validation blocks progression with unresolved (any) skills
**Given** a character has "Language (any)" with points allocated but no specialization selected
**When** the user attempts to advance to the next wizard step
**Then** validation fails with a message identifying the unresolved skill
**And** the wizard does not advance

### Scenario 6: Play Mode never displays placeholder or (any) skill names
**Given** a completed character enters Play Mode
**When** the skills section renders
**Then** no skill name contains "(any)", "(local)", "(any other)", "(Primary)", "(Secondary)", "(Specific", "(Hunting Related)", "(Shipboard", "(Physiological", or "(Alchemical"

### Scenario 7: PDF export never contains unresolved skill names
**Given** a completed character exports to PDF
**When** the PDF is generated
**Then** no skill entry in the PDF contains descriptive placeholder or (any) text

### Scenario 8: Random character generation resolves all placeholders
**Given** the user generates a random character with career "Fisher"
**When** the random generation completes
**Then** "Lore (Primary Catch)" is resolved to a concrete Lore specialization (e.g., "Lore (Animals)")
**And** "Lore (Secondary Catch)" is resolved to a different concrete Lore specialization
**And** no placeholder text remains in the character data

## Constraints

- Free-text entry must always be allowed (player can type any specialization justified by background)
- Datalist suggestions come from existing `DISAMBIGUATION_LISTS[category]` — no career-specific lists
- The descriptor text (e.g., "Primary Catch", "Hunting Related") is shown as guidance, not as an option
- Existing `(any)` skill disambiguation behavior must not change for the happy path
- Skills that are already concrete (e.g., "Craft (Alchemy)" in Alchemist career) must not trigger disambiguation UI

## Out of Scope

- Career-specific suggestion lists (e.g., showing only fish-related lores for Fisher)
- AiG cultural hint text propagation (e.g., "but Politics is common")
- Changing the data structure of CAREERS_DATA
- Modifying existing fixtures (they are already resolved)
