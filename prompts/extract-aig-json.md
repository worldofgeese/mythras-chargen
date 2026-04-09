# Task: Structure AiG raw extractions into attestable JSON

## Context
A previous worker extracted raw text from the Adventures in Glorantha PDF but didn't structure most of it into JSON. The Mythras equipment files are DONE — don't touch `references/mythras-raw/`. 

Your job: create structured JSON files in `references/aig-raw/` from the AiG PDF at `/tmp/adventures_in_glorantha.pdf`.

Some raw text was already extracted to `/tmp/aig-cultures.txt` (553 lines) and `/tmp/aig-creation-summary.txt` (304 lines). Use these as starting points but go back to the PDF for anything missing or unclear.

The RQ: Weapons & Equipment PDF at `/tmp/rq-weapons-equipment.pdf` has Gloranthan price lists — extract equipment prices from there too.

## Output Format
Follow the EXACT format of existing files in `references/mythras-raw/`. Example:
```json
{
  "source": "Adventures in Glorantha (GenCon 2015 Preview)",
  "extracted_at": "2026-04-02",
  "page": "p.XX",
  "data": [...]
}
```

Every value MUST cite its page number.

## Files to Create (in `references/aig-raw/`)

### Priority 1 — Character creation critical

1. **cultures.json** — For EACH of the 8 cultures (Balazaring p.26-28, Esrolian p.28-29, God Forgot p.29-31, Lunar Heartland p.31-33, Praxian p.33-35, Provincial Lunar/Tarsh p.35-37, Sartarite/Heortling p.37-39, Telmori p.39-41):
   - `culture_type`: Primitive/Barbarian/Civilised/Nomad
   - `standard_skills`: array of skill names available for cultural distribution
   - `professional_skills`: array of professional skills unlocked by culture
   - `combat_styles`: array of {name, weapons: [], traits: []}
   - `passions`: array of {type, focus, base_value}
   - `folk_magic_spells`: array of spell names available
   - `starting_money`: {currency, amount_formula}

2. **careers.json** — For EACH career in AiG (p.42-47):
   - `name`, `page`
   - `standard_skills`: array
   - `professional_skills`: array
   - `combat_style`: string or null
   - `income`: {amount, currency}

3. **creation-summary-aig.json** — The 12-step creation process from p.23-25:
   - Each step with exact text and page
   - AiG-specific overrides vs base Mythras
   - Tradetalk: INT+CHA+30% for all characters
   - Starting money multipliers by culture
   - Rune affinities: 3 runes at POW×2+30%, POW×2+20%, POW×2+10%
   - Folk magic: POW+CHA+30%, 3 spells from culture (step 5), 2 from full list (step 9)

4. **combat-styles-aig.json** — Every named combat style:
   - `name`, `culture`, `weapons`, `traits`, `page`

### Priority 2 — Magic and equipment

5. **folk-magic-aig.json** — from p.63-68:
   - Culture-specific spell lists (cross-ref with cultures.json)
   - Full spell list with effects if different from Mythras core
   - Starting allocation rules

6. **rune-affinities.json** — from p.24 + rune chapter:
   - List of all runes with names and domains
   - Starting rune mechanic

7. **equipment-aig.json** — from AiG p.48-58 + RQ:W&E:
   - Starting equipment by culture
   - Weapon prices in Lunars
   - Armour prices in Lunars
   - General equipment prices

### Priority 3 — Reference

8. **magic-overview.json** — Spell indexes with page refs only:
   - Rune magic spell names + page numbers (p.69-122)
   - Sorcery spell names + page numbers (p.123-133)
   - Spirit magic abilities + page numbers (p.134-151)

9. **monsters-index.json** — Name + page + creature type only (p.152-212)

## Tools
- Install pdfplumber if needed: `pip install pdfplumber`
- Use Python scripts to extract tables
- Existing raw text in `/tmp/aig-cultures.txt` and `/tmp/aig-creation-summary.txt`

## Rules
- Do NOT hallucinate data. If text extraction is unclear, note the ambiguity
- Every value must trace to a specific page
- Overwrite the placeholder files already in `references/aig-raw/`
- Delete the README.md placeholder when done
- Spell names must be EXACT as printed
- Skill names must match Mythras conventions exactly
