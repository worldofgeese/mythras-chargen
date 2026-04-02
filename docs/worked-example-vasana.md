# Worked Example: Vasana Farnan's Daughter

This example reflects the **current strict build** that passes the validator.

## Identity

- Name: Vasana Farnan's Daughter
- Homeland: Ernaldori clan of the Colymar Tribe, Sartar
- Concept: scarred heavy cavalry leader and devout Vinga / Orlanth initiate
- Career label on sheet: Heavy cavalrywoman
- Cult packet: `Vinga.pdf` pp. 1-2 with `Orlanth.pdf` pp. 1-2 as the parent cult packet

## Strict 75-Point Characteristics

Original RuneQuest priorities were rescaled to this legal Mythras Core array:

- `STR 12`
- `CON 9`
- `SIZ 9`
- `DEX 8`
- `INT 12`
- `POW 11`
- `CHA 14`

Total: `75`

## Derived Mythras Values

- Action Points: `2`
- Damage Modifier: `+0`
- Experience Modifier: `1`
- Healing Rate: `2`
- Initiative Bonus: `10`
- Luck Points: `2`
- Personal Magic Points: `11`
- Stored Magic Points: `+10` in the storage crystal
- Devotional Pool: `3 / 3`
- Hit locations:
  - Head `4`
  - Chest `6`
  - Abdomen `5`
  - Each Arm `3`
  - Each Leg `4`

## Standard Skills

Key totals on the strict sheet:

- Athletics `27`
- Customs `30`
- Influence `45`
- Locale `35`
- Perception `50`
- Ride `70`
- Sing `50`
- Stealth `22`
- Swim `22`

Notable automatic raises during validation-safe rebuild:

- `Stealth` rose from `15` to its Mythras Core base of `22`
- `Swim` rose from `15` to its Mythras Core base of `22`
- `Tradetalk` rose from `20` to its strict Mythras base of `26`

## Professional Skills

The strict conversion removes every non-core name:

- `Battle` -> `Lore (Strategy and Tactics) 65`
- `Cult Lore (Orlanth)` -> `Lore (Orlanth) 26`
- `Farm` -> `Craft (Farming) 30`
- `Herd` -> `Craft (Animal Husbandry) 22`
- `Homeland Lore (Sartar)` -> `Lore (Sartar) 35`
- `Read/Write Theyalan` -> `Literacy (Theyalan) 30`
- `Orate` -> `Oratory 45`

No custom skills remain.

## Magic Skills And Rune Magic

Magic skills on the strict sheet:

- `Devotion (Orlanth) 80`
- `Exhort 55`
- `Folk Magic 45`
- `Meditation 25`

Player-facing rune affinities:

- Air `90%`
- Movement `75%`
- Death `75%`

Casting policy:

- `Fearless`, `Lightning`, and `Shield` are launched with the relevant rune affinity
- `Devotion (Orlanth)` governs intensity or magnitude
- the devotional pool is the sheet's miracle-use pool

## Combat Styles

- `Vinga Cavalry 90`
  - broadsword
  - lance
  - battleaxe
  - medium shield
- `Sartarite Archer 45`
  - composite bow

## Gear

- Armor ENC total: `9`
- Armor penalty: `2`
- Total ENC: `14`
- Walk `6`
- Run `17.5`
- Sprint `33`
- Rugged Surface Climb `5`
- Steep Surface Climb `4`
- Sheer Surface Climb `2`
- Swim `2`

## Validation

This exact sheet is the current passing output at:

- `output/inputs/vasana-input.json`
- `output/json/vasana-computed.json`
- `output/pdf/vasana-mythras-sheet.pdf`

It passes `scripts/validate_character_sheet.py` with no errors.
