---
feature: pregen-pipeline
status: approved
design: ../designs/pregen-pipeline-v2.md
---

# Spec: Pre-gen Conversion Pipeline

## Scenarios

### Scenario 1: All 10 RQG pre-gens load without errors
**Given** each of the 10 fixture JSON files exists
**When** each is loaded into the app via the load character mechanism
**Then** no validation errors occur
**And** the character name, concept, and culture display correctly

### Scenario 2: Skill point budgets sum to 100 per category
**Given** a pre-gen fixture is loaded
**When** the culturalSkills, careerSkills, and bonusSkills are summed
**Then** each category totals exactly 100

### Scenario 3: Characters with animal companions display companion stat blocks
**Given** a character with a Type A companion (Vasana, Ionara, Nathem, Dazarim, Vishi)
**When** the character is viewed in Play Mode
**Then** the companion section shows name, species, characteristics, hit locations with AP and HP, attacks with skill% and damage, movement, armor, and damage modifier

### Scenario 4: Companion HP can be tracked and persists
**Given** a character with a companion is in Play Mode
**When** a companion hit location HP is modified
**Then** the change persists in the character data
**And** survives a JSON save/load round-trip

### Scenario 5: Characters without structured companions show no companion section
**Given** a character without companions (Harmast, Sorala, Vostor, Yanioth, Aranda)
**When** viewed in Play Mode
**Then** no companion section is rendered

### Scenario 6: Miracles validate against CULTS_DATA
**Given** a pre-gen fixture with a cult present in CULTS_DATA
**When** the fixture's miracles are checked against the cult's miracle list
**Then** each miracle name matches an entry in the cult data (by substring match for subcult format)
**And** the exception is Vostor (Seven Mothers not in CULTS_DATA)

### Scenario 7: No unresolved placeholder skills exist in any fixture
**Given** any pre-gen fixture
**When** all skill names are scanned across culturalSkills, careerSkills, bonusSkills, and selectedProfessionalSkills
**Then** none match placeholder patterns like (any), (local), (choose one), or similar generic categories

### Scenario 8: JSON save/load round-trip preserves all data
**Given** a pre-gen fixture is loaded
**When** toJSON() is called and the result is passed back to fromJSON()
**Then** all fields including companions, weapons, armor, skills, miracles, and passions are identical

## Constraints

- Fixtures use `charMethod: "pregen"` which bypasses generator validation
- Characteristics are raw RQG values (not scaled to Mythras 75-point build)
- Combat style names are custom per-character (not from AiG CULTURES_DATA)
- Elementals and non-combat mounts are recorded in `notes` field, not `companions[]`
- The conversion script must be self-contained (no external dependencies beyond Node.js stdlib)
- Seven Mothers cult is not in CULTS_DATA; Vostor's miracles are stored but not validated

## Out of Scope

- Adding Seven Mothers or other Lunar cults to CULTS_DATA
- Scaling characteristics to Mythras 75-point build
- Automated PDF extraction (transcription is manual)
- Companion spell/magic tracking
- Adding new cultures to CULTURES_DATA for pre-gen-specific homelands
