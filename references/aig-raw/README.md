# Adventures in Glorantha Reference Extractions

## Status: Partial Extraction Complete

This directory contains structured reference data extracted from **Adventures in Glorantha (GenCon 2015 Preview)**.

### Completed Extractions

The following text extractions have been completed and saved to `/tmp/` for manual curation:

- `/tmp/aig-creation-summary.txt` - Character creation 12-step process (p.23-25)
- `/tmp/aig-cultures.txt` - 8 cultures detailed descriptions (p.26-47)
- `/tmp/aig-equipment.txt` - Equipment lists and prices (p.48-58)
- `/tmp/aig-folk-magic.txt` - Folk magic rules and spells (p.63-68)
- `/tmp/aig-rune-magic.txt` - Rune magic overview (p.69-75)
- `/tmp/aig-monsters-index.txt` - Monsters sample (p.152-160)

### Files Requiring Manual Curation

Due to copyright considerations and complex PDF formatting, the following JSON files need to be manually created from the extracted text:

1. **cultures.json** - 8 cultures (Balazaring, Esrolian, God Forgot, Lunar Heartland, Praxian, Provincial Lunar/Tarsh, Sartarite/Heortling, Telmori)
   - For each: culture type, standard/professional skills, combat styles, passions, folk magic, starting money

2. **careers.json** - All AiG careers by culture
   - Career name, page ref, skills, combat style, income level

3. **rune-affinities.json** - Rune system mechanics
   - Starting runes: 3 at POW×2+30/20/10%
   - All runes with domains/descriptions (p.24 + rune magic chapter)

4. **folk-magic-aig.json** - AiG-specific folk magic
   - Culture-specific spell lists
   - Starting allocation: 3 from culture, 2 from career

5. **combat-styles-aig.json** - Named combat styles
   - Weapons per style, cultural requirements

6. **equipment-aig.json** - Gloranthan equipment
   - Weapons, armour, starting equipment by culture
   - Prices in Lunars/Silver

7. **magic-overview.json** - All magic types
   - Folk magic (p.63-68)
   - Rune magic spell index with page refs (p.69-122)
   - Sorcery overview (p.123-133)
   - Spirit magic overview (p.134-151)

8. **creation-summary-aig.json** - 12-step process verbatim
   - AiG-specific additions vs base Mythras
   - Tradetalk rule (INT+CHA+30%)
   - Starting money multipliers

9. **monsters-index.json** - Creature index
   - Name + page + key stats (STR/CON/SIZ ranges)
   - From p.152-212

### Format Standard

All JSON files must follow the format established in `references/mythras-raw/`:

```json
{
  "source": "Adventures in Glorantha (GenCon 2015 Preview)",
  "extracted_at": "2026-04-02",
  "page": "p.XX-YY",
  "section_name": {
    "data": []
  }
}
```

Every value must cite its page number. No hallucinated data.

### Copyright Notice

Adventures in Glorantha is ©2015 Moon Design Publications and The Design Mechanism.
These reference files contain structured game mechanics data with page citations only.
