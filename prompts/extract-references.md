# Task: Extract attestable JSON references from Mythras equipment chapters + Adventures in Glorantha

## Context
We're building a character creation tool for Adventures in Glorantha (Mythras system). We already have 7 attestable JSON files for Mythras core rules in `references/mythras-raw/`. Now we need:

1. **Mythras equipment tables** (still missing)
2. **Full Adventures in Glorantha** attestable reference chain

## Source PDFs
- Mythras Core Rulebook: extract equipment from pages 55-78
- Adventures in Glorantha (GenCon 2015 Preview): `/tmp/adventures_in_glorantha.pdf` — 212 pages

## Output Format
Follow the EXACT format used in existing reference files. Example:

```json
{
  "source": "Mythras Core Rulebook, 3rd Printing (2018)",
  "extracted_at": "2026-04-02",
  "section_name": {
    "page": "p.XX",
    "data": [...]
  }
}
```

Every single value MUST cite its page number.

## Part 1: Mythras Equipment (write to `references/mythras-raw/`)

### File: `melee-weapons.json`
Extract from p.62-65. For each weapon:
- Name, type (1H/2H), damage dice, size category (S/M/L/H/E), reach (T/S/M/L/VL), AP/HP, ENC, cost, special notes
- Combat style traits if any are listed

### File: `ranged-weapons.json`
Extract from p.62, 66-67. For each weapon:
- Name, damage dice, damage modifier (Y/N/H), range, load turns, combat effects, force, size, AP/HP, ENC, cost

### File: `armour.json`
Extract from p.58. For each armour type:
- Name, AP value, ENC, cost, locations covered

### File: `encumbrance.json`
Extract from p.78. The ENC rules, SIZ thresholds, movement penalties.

## Part 2: Adventures in Glorantha (write to `references/aig-raw/`)

Extract the entire character-creation-relevant content. Create these files:

### File: `cultures.json`
For EACH of the 8 cultures (Balazaring, Esrolian, God Forgot, Lunar Heartland, Praxian, Provincial Lunar/Tarsh, Sartarite/Heortling, Telmori):
- Culture type (Primitive/Barbarian/Civilised/Nomad)
- Page reference
- Standard skills available for cultural skill points
- Professional skills available for cultural skill points
- Combat styles with names and weapon lists
- Passions (with specific values where given)
- Folk magic spells available
- Starting money (Silver standard, multiplier)

### File: `careers.json`
For EACH career listed in AiG:
- Career name
- Page reference
- Standard skills available
- Professional skills available
- Combat style (if any)
- Income level

### File: `homelands.json`
If AiG has homeland-specific data (it does for some cultures):
- Homeland name
- Associated culture
- Specific variations

### File: `rune-affinities.json`
- How runes work (p.24 + rune magic chapter)
- Starting rune affinities: 3 runes at POW×2+30/20/10%
- List ALL runes with their domains/descriptions

### File: `folk-magic-aig.json`
- AiG-specific folk magic spells (if different from Mythras core)
- Culture-specific spell lists
- Starting allocation: 3 from culture, 2 from career (full chapter)

### File: `combat-styles-aig.json`
- Every named combat style in the AiG book
- Associated weapons for each style
- Cultural/career requirements

### File: `equipment-aig.json`
From p.48-58:
- Weapons table (if different from/additions to Mythras core)
- Armour table (if different from/additions to Mythras core)
- Starting equipment by culture
- Price lists in Lunars/Silver

### File: `magic-overview.json`
- Folk magic rules summary (p.63-68)
- Rune magic overview (p.69-122): spell list with page refs
- Sorcery overview (p.123-133)
- Spirit magic overview (p.134-151)

### File: `creation-summary-aig.json`
- The 12-step creation process from p.23-25 verbatim
- All AiG-specific additions/overrides vs base Mythras
- Tradetalk rule (INT+CHA+30%)
- Starting money multipliers

### File: `monsters-index.json`
- Just an index: creature name + page reference + key stats (STR/CON/SIZ ranges)
- From p.152-212

## Rules
1. Use pdfplumber for text extraction: `pip install pdfplumber` if needed
2. Every JSON value must trace back to a specific page
3. If a table is ambiguous, include the raw text and note the ambiguity
4. Spell names must be EXACT as printed
5. Skill formulas must match exactly (e.g., "STR+DEX" not "Strength+Dexterity")
6. Where AiG overrides Mythras, note both values with page citations
7. Write clean, minified-but-readable JSON (2-space indent)
8. Do NOT hallucinate data — if a page is unreadable, note it and skip
