# Worked Example: Vasana Farnan's Daughter

This example reflects the **current strict build** that passes the validator.

## Identity

- Name: Vasana Farnan's Daughter
- Homeland: Ernaldori clan of the Colymar Tribe, Sartar
- Concept: scarred heavy cavalry leader and Orlanth/Vinga future-initiation path
- Career label on sheet: Heavy cavalrywoman
- Cult packet: `Vinga.pdf` pp. 1-2 with `Orlanth.pdf` pp. 1-2 as the parent cult packet

## Strict 75-Point Characteristics

Original RuneQuest priorities were rescaled to this legal Mythras Core array:

- `STR 14`
- `CON 10`
- `SIZ 8`
- `DEX 10`
- `INT 9`
- `POW 12`
- `CHA 12`

Total: `75`

## Derived Mythras Values

- Action Points: `2`
- Damage Modifier: `+0`
- Experience Modifier: `1`
- Healing Rate: `2`
- Initiative Bonus: `9`
- Luck Points: `2`
- Personal Magic Points: `12`
- Stored Magic Points: `+10` in the storage crystal (RQG folio narrative item)
- Devotional Pool: `0 / 0` under strict ADR-0015 chargen baseline
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

## Passion Values

The RQG folio's passion targets are preserved, but active fixture values are reconciled to the app's strict chargen passion value (`54`) rather than importing RQG percentages such as Hate (Lunar Empire) 90. This keeps the active fixture wizard-possible while retaining the source identity.

## Magic Skills And Strict ADR-0015 Rune Magic

The RQG folio presents Vasana as an initiate with Fearless, Lightning, and Shield. The current app fixture follows strict ADR-0015 chargen policy instead:

- Orlanth/Vinga is recorded as a future-initiation path.
- No cult-backed miracles are active at chargen.
- `devotionalPool` is `0`.
- The folio's spirit/Rune magic requires GM conversion or later advancement.

RQG folio spirit magic reconciliation:

| RQG folio spell | Mythras app spelling | Fixture status |
| --- | --- | --- |
| Demoralize | Demoralise | Withheld under strict ADR-0015; not in general picker, requires cult/GM advancement. |
| Heal 2 | Heal | Present as `Heal`; RQG intensity 2 is not encoded in fixture spell names. |
| Mobility | Mobility | Withheld under strict ADR-0015; not in general picker, requires cult/GM advancement. |

See `references/folk-magic-reconciliation.json` → `vasana_rqg_spirit_magic_mapping`.

Player-facing rune affinities retain the app's compressed top-three identity:

- Air primary
- Movement secondary
- Death tertiary

## Combat Styles

- `Colymar Bison Cavalry` (fixture/test contract; source-blocked CSE exception documented in `references/combat-style-exceptions.json` and bead `mythras-chargen-m1rv`)
  - broadsword
  - battleaxe
  - lance
  - medium shield
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

## Companion

Vasana's companion block is preserved in `fixtures/vasana.json` rather than summarized into the worked-example math above. The fixture's `Molon` object carries the game-stat block plus provenance fields:

- `source`: RQG Starter Set Pregen Folios
- `sourcePages`: PDF page 2
- `sourceCitation`: Vasana/Molon folio companion block

Keep companion stat changes source-backed and update those fields alongside any future Molon refresh.

## Validation

This exact sheet is the current passing output at:

- `output/inputs/vasana-input.json`
- `output/json/vasana-computed.json`
- `output/pdf/vasana-mythras-sheet.pdf`

It passes `scripts/validate_character_sheet.py` with no errors.
