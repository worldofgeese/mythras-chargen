# RuneQuest Starter Set Book 2 Reference Extractions

## Status: Initial Extraction Complete

This directory contains structured reference data extracted from **RuneQuest Starter Set Book 2: The World of Glorantha (2021)**.

### Completed Extractions

Core setting:
- `glorantha-overview.json` - World concept, Bronze Age setting, social structure, metals, themes, and calendar (pp. 2-15)
- `runes.json` - Elemental, Power, Form, and Condition Runes with attested descriptions (pp. 4-6)
- `gods-cults.json` - Cult structure, major deities, and Rune cults overview (pp. 7-11)
- `elder-races.json` - Aldryami, Dragonewts, Mostali, Merfolk, Trolls, Broo, and other peoples (p. 10)
- `gloranthan-concepts.json` - Unique aspects of Glorantha, heroquesting, passions, and calendar notes (pp. 12-14)
- `dragon-pass.json` - Dragon Pass regional framing, history, and Starter Set relevance (pp. 15-22)

Jonstown regional frame:
- `jonstown-history.json` - Jonstown history and recent background (pp. 23-25)
- `northern-sartar.json` - Northern Sartar frame around Jonstown (pp. 25-26)
- `jonstown-overview.json` - City identity, government, economy, military, quarters, and daily life (pp. 23-31, 43-58)
- `jonstown-city-politics.json` - Citizenship, City Ring, City Rex, security, guilds, and Lunar remnants (pp. 31-32)
- `jonstown-prices-services.json` - Cost of living, shopping examples, and healing-for-hire references (pp. 30, 44, 46)
- `jonstown-locations.json` - Temples, inns, markets, services, and quarter landmarks (pp. 43-52)
- `jonstown-sample-npcs.json` - Typical residents, citizens, guards, militia, sages, merchants, thieves, and Lunar holdouts (pp. 53-56)
- `outside-jonstown.json` - Nearby settlements, sacred sites, roads, forts, ruins, and adventure hooks (pp. 57-61)

Named people and sub-groups (non-statblock decomposition):
- `jonstown-npcs.json` - Major named Jonstown NPC groups and role summaries (pp. 32-42)
- `jonstown-groups/city-government.json`
- `jonstown-groups/issaries-temple-group.json`
- `jonstown-groups/lhankor-mhy-temple-group.json`
- `jonstown-groups/orlanth-temple-group.json`
- `jonstown-groups/other-individuals-of-note.json`

Quarter-by-quarter split:
- `jonstown-quarters/upper-city.json`
- `jonstown-quarters/scholars-quarter.json`
- `jonstown-quarters/merchants-quarter.json`
- `jonstown-quarters/crafters-quarter.json`

Excluded by request:
- Full statblock decomposition for major NPCs is intentionally not split into atomic field-level artifacts.

### Source Information

- **Title:** RuneQuest Starter Set Book 2: The World of Glorantha
- **Publisher:** Chaosium Inc. (Publication 4035)
- **First Printing:** 2021
- **Authors:** Greg Stafford, Jeff Richard, Jason Durall
- **Credits:** Based on materials by Ian Cooper, Steve Perrin, Sandy Petersen

### Format Standard

All JSON files follow the format established in `references/mythras-raw/`:

```json
{
  "source": "RuneQuest Starter Set Book 2: The World of Glorantha (2021)",
  "extracted_at": "2026-04-10",
  "page": "p.XX-YY",
  "section_name": {
    "data": []
  }
}
```

Every value cites its page number. No hallucinated data.

### Copyright Notice

RuneQuest Starter Set is ©2021 Moon Design Publications LLC. RuneQuest and Glorantha are registered trademarks of Moon Design Publications LLC. These reference files contain structured game setting data with page citations only.