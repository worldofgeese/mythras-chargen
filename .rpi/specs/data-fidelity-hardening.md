---
feature: data-fidelity-hardening
status: approved
design: ../designs/data-fidelity-hardening.md
---

# Spec: Data Fidelity Hardening

## Scenarios

### Scenario 1: Loading a JSON file with unresolved placeholder skills is blocked
**Given** a saved JSON file contains a skill key "Lore (any)" or "Craft (Primary)"
**When** the user loads that file via the Load Character button
**Then** the application shows an error message identifying the unresolved skill
**And** the character data is not modified
**And** the user is told to open the character in Wizard Mode to fix it

### Scenario 2: AiG-specific folk magic spells are available in career spell selection
**Given** a character has reached the career folk magic selection step
**When** the spell list is displayed
**Then** Gloranthan-specific spells like "Find Truth", "Preserve", "Incognito", and "Heat" appear as selectable options
**And** these spells have the same selection behavior as Mythras Core spells

### Scenario 3: Sartarite Hill Clan Levy combat style includes both ranged weapons
**Given** a Sartarite character with the Hill Clan Levy combat style
**When** the combat style weapons are displayed
**Then** both "Longbow" and "Javelin" appear as separate weapons in the style
**And** neither renders as the literal text "Longbow or Javelin"

### Scenario 4: Cult skill names do not contain OCR corruption
**Given** a character selects any cult from the cult list
**When** the cult's skills and spells are displayed
**Then** no skill or spell name contains line breaks, unicode superscript digits, or obviously corrupted text
**And** all skill names follow the standard "Skill (Specialization)" format

### Scenario 5: Primitive culture characters cannot receive metal weapons from background equipment
**Given** a Balazaring or Telmori character
**When** background equipment is generated based on social class
**Then** no weapon requiring metal (Broadsword, Longsword, Greatsword, Mace, Halberd, Scimitar) appears in starting equipment
**And** weapons are drawn from stone/bone/wood appropriate options (Club, Hatchet, Knife, Shortspear, Sling, Javelin, Battleaxe, Longbow)

### Scenario 6: Devotion skill resolves to the chosen cult name
**Given** a character with a Priest career has "Devotion (Pantheon, Cult or God)" in their skill list
**When** the character selects the cult "Humakt" in the cult selection step
**Then** the skill becomes "Devotion (Humakt)" in the character data
**And** Play Mode displays "Devotion (Humakt)"
**And** PDF export shows "Devotion (Humakt)"

### Scenario 7: Random character generation respects culture technology for equipment
**Given** 100 random characters are generated
**When** any Balazaring character's equipment is examined
**Then** no metal weapons appear in their starting equipment
**And** armor does not exceed AP 2

### Scenario 8: Save/load round-trip preserves resolved skill names
**Given** a character with all skills fully resolved (no placeholders)
**When** the character is saved to JSON and then loaded back
**Then** all skill names remain exactly as they were before saving
**And** no placeholder text is introduced during the round-trip

## Constraints

- loadCharacter() validation must not break existing valid save files (only reject files with actual placeholder text)
- Folk magic additions must be alphabetically sorted in the master list
- OCR cleanup must be idempotent (running it twice produces the same result)
- Tech-level filtering must not remove weapons that appear in a culture's combat style definitions (those are attested by AiG)
- Cult skill resolution only applies to the three known patterns: Devotion, Binding, Invocation

## Out of Scope

- Theism miracle pipeline (separate initiative)
- Combat trait attestation (separate initiative)
- Re-importing cult data from source PDFs (one-time fix sufficient)
- Career-specific suggestion lists for placeholder disambiguation
- Multi-cult characters (not supported in current system)
