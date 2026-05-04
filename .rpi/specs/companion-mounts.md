---
feature: companion-mounts
status: approved
design: ../designs/companion-mounts.md
---

# Spec: Companion Mounts

## Scenarios

### Scenario 1: Companion stat block displays in Play Mode
**Given** a character has a companion mount (e.g., Vasana with bison Molon)
**When** the character is viewed in Play Mode
**Then** a "Companions" section appears below the main character stats
**And** it shows the companion's name, species, characteristics, hit locations with HP, attacks with damage, armor, movement, and damage modifier

### Scenario 2: Companion HP can be tracked during play
**Given** a companion mount is displayed in Play Mode
**When** the user clicks on a companion hit location
**Then** the current HP for that location can be adjusted (damaged/healed)
**And** the change persists in the character data

### Scenario 3: Companion data persists through JSON save/load
**Given** a character with a companion is saved to JSON
**When** the JSON file is loaded back
**Then** the companion data is fully preserved including name, stats, attacks, and current HP

### Scenario 4: Companion appears in PDF export
**Given** a character with a companion exports to PDF
**When** the PDF is generated
**Then** the companion's stat block appears as a dedicated section
**And** it includes name, characteristics, attacks, hit locations, armor, and movement

### Scenario 5: Characters without companions show no companion section
**Given** a character with an empty companions array
**When** viewed in Play Mode or exported to PDF
**Then** no companion section is displayed

### Scenario 6: Vasana pre-gen loads with correct bison stats
**Given** the Vasana fixture is loaded
**When** the companion section is examined
**Then** Molon the bison has STR 36, CON 17, SIZ 34, DEX 12, POW 10
**And** attacks include Head Butt (50%, 2D10+3D6) and Trample (50%, 6D6)
**And** movement is 12, armor is 3, damage modifier is +3D6

### Scenario 7: Ionara pre-gen loads with correct horse stats
**Given** the Ionara fixture is loaded
**When** the companion section is examined
**Then** Etza the riding horse has STR 30, CON 17, SIZ 30, DEX 20, POW 17
**And** attacks include Bite (25%, 1D8+3D6), Kick (25%, 1D6+3D6), Rear & Plunge (25%, 2D6+3D6), Trample (25%, 4D6)
**And** movement is 12, armor is 1, damage modifier is +3D6

## Constraints

- Companions are an optional field — most characters won't have one
- The companion model must be generic enough for any creature type (bison, horse, alynx, etc.)
- Companion hit location names vary by species (quadrupeds differ from humanoids)
- Random character generation does NOT auto-generate companions
- loadCharacter() validation must not reject files with companions (new field is additive)

## Out of Scope

- Classic Fantasy Animal Training skill
- Automatic companion generation
- Companion magic/spell tracking
- Adding Grazelander as a full generator culture
