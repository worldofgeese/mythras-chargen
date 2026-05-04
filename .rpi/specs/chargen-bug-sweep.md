---
feature: chargen-bug-sweep
status: approved
design: ../designs/chargen-bug-sweep.md
---

# Spec: Character Generator Bug Sweep

## Scenarios

### Scenario 1: Miracle cards are selectable after cult selection
**Given** a character has selected a cult in Step 9
**When** the miracle picker renders with available miracles
**Then** clicking a miracle card toggles its selection state
**And** the "Selected: X / Y" counter updates accordingly
**And** the user can select up to their devotional pool limit

### Scenario 2: Rune affinity dropdowns enforce uniqueness
**Given** the user is on Step 5 selecting rune affinities
**When** a rune is selected in one slot (e.g., "Luck" as Primary)
**Then** that rune is no longer available in the other two dropdowns
**And** if the user changes their selection, the freed rune becomes available again

### Scenario 3: Passions with subjects are resolved or prompted
**Given** a culture provides a passion "Loyalty" with `needsSubject: true`
**When** the passions step renders
**Then** an editable text input appears for the subject (e.g., "to what?")
**And** the input offers suggestions from the culture data (e.g., "Clan", "Citadel", "Chief")
**And** the user can type any free-text subject

### Scenario 4: "Loyalty (City)" auto-resolves to homeland
**Given** a culture provides a passion "Loyalty (City)" and the character's homeland is "Trilus"
**When** the passions step renders
**Then** the passion displays as "Loyalty (Trilus)" with an editable override
**And** the PDF exports "Loyalty (Trilus)" (not the literal "Loyalty (City)")

### Scenario 5: Career professional skills with placeholders prompt inline
**Given** a career has professional skill "Lore (Primary Catch)" and the user checks it
**When** the checkbox is selected in Step 8
**Then** an inline text input appears immediately below/beside the checkbox
**And** the input shows "Primary Catch" as hint text with Lore category suggestions
**And** the user cannot advance until a specialization is entered
**And** no blocking toast appears for an unresolvable state

### Scenario 6: Cult passion is visible and acknowledged
**Given** a character selects cult "Yelmalio" in Step 9
**When** the cult is selected
**Then** a notice appears confirming "Loyalty (Yelmalio): X% added to your passions"
**And** the passion appears in the passions list if the user navigates back to Step 6

### Scenario 7: PDF shows Customs with culture name
**Given** a character with culture "Balazaring"
**When** the PDF is exported
**Then** the skill appears as "Customs (Balazaring): X%" (not "Customs(): X%")

### Scenario 8: PDF combat style shows correct unified value
**Given** a character has cultural combat style "Pony Cavalry" with base 32 and 15 bonus points allocated
**When** the PDF is exported
**Then** the COMBAT STYLES section shows "Pony Cavalry: 47% (Mounted) — Spear, Bow"
**And** the SKILLS section does not show a duplicate "Combat Style (Cultural Style)" entry

### Scenario 9: PDF weapon skill column shows combat style percentage
**Given** a character has weapons "Spear" and "Bow" belonging to combat style "Pony Cavalry" at 47%
**When** the PDF is exported
**Then** both weapons show "47" in the Skill column

### Scenario 10: PDF career professional skills appear even with 0 bonus points
**Given** a character selected "Craft (Nets)" and "Lore (Fish)" as career professional skills
**When** the PDF is exported
**Then** both skills appear in the skills section at their base characteristic values
**And** they are not filtered out due to having 0 career/bonus point allocation

### Scenario 11: PDF sections do not visually collide
**Given** a character with combat styles, weapons, and skills
**When** the PDF is exported
**Then** each section header has at least 5pt of clear space above it
**And** no text from one section overlaps with text from another section
**And** light separator lines appear between major content blocks

### Scenario 12: PDF uses vertical space effectively
**Given** a character sheet is exported to PDF
**When** the layout is rendered
**Then** the concept/family/background line is legible (minimum 7pt font, with padding)
**And** the gap between the last content section and the footer is less than 40% of page height

## Constraints

- All changes confined to `index.html` (single-file application)
- Existing `(any)` skill disambiguation behavior must not regress
- Rune uniqueness is enforced at selection time, not validation time (no toast needed)
- Auto-resolved passions (e.g., Loyalty (City) → Loyalty (Trilus)) must be editable
- PDF remains single-page A4 — no multi-page support required
- Combat style percentage = STR+DEX base + cultural + career + bonus points (full compiled value)
- Folk Magic spell count (3 culture + 2 career = 5 total) is correct and must not be changed

## Out of Scope

- Multi-page PDF export
- Career-specific Lore suggestion lists (generic category lists are sufficient per existing design)
- Play Mode rendering bugs (focus is wizard flow + PDF export)
- Changing the structure of CAREERS_DATA or CULTURES_DATA JSON
- Adding new skills or passions to the data
