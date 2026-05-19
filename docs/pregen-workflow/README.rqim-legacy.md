# Mythras + Glorantha Starter-Set Conversion Kit

This folder is the GM control packet for running the **RuneQuest Starter Set** with **Mythras** as the rules engine under a strict conversion policy.

## Active policy

- All pregens are rebuilt from a **strict 75-point Mythras Core characteristic base**.
- All finished sheets use **only Mythras Core skills and specialisations**.
- No RuneQuest-era or custom skill names remain on the converted sheets.
- RuneQuest Strike Rank is removed.
- Rune magic follows **Adventures in Glorantha**:
  - the relevant **rune affinity** launches the spell
  - **Devotion** governs intensity or magnitude
  - **Devotional Pools** are the active miracle-use pool
- The **cult one-pagers** are the cult-facing authority for runes, obligations, and spell access.
- The workbook and the automated PDF's embedded calculations are implementation references, not top-level rules authorities.
- The validated template keeps page 3 intact and writes companion or overflow text only into the cloned `P3__More_1..29` fields.
- Generated pregens prepend the original folio cover page as page 1.
  The original art, biography, and left sidebar flavor stay intact.
  Only the stale `How to Play` mechanics text and right-hand rune sidebar are patched.

## Contents

- `conversion-guide.md`: campaign defaults plus the current strict roster summary
- `pregen-template.md`: blank strict conversion template
- `worked-example-vasana.md`: fully updated strict Vasana example
- `spell-conversion-worksheet.csv`: AiG-style rune-spell worksheet
- `adventure-prep-checklists.md`: starter-set scene checklist plus GM skill substitutions
- `PLAN.md`: original implementation plan kept for audit trail

## GM provenance by subsystem

| Subsystem | What this kit uses | Primary source and pages | Supporting source and pages | Project consequence |
| --- | --- | --- | --- | --- |
| Human characteristic point-buy and minima | 75-point human build with `SIZ` and `INT` minimum `6` | *Mythras - TDM - Core Rulebook (3rd Printing, 03-11-2018)* pp. 8-10 | RuneQuest pregens only as relative-priority input | Every starter-set pregen is rebuilt to a legal 75-point Mythras array |
| Character creation sequence | Concept, culture, passions, career, bonus skills, cult membership | *Mythras Core* pp. 13-24 and 26-34 | Cult one-pagers pp. 1-2 | New characters follow Mythras chargen order before the Glorantha layer is added |
| Age categories and bonus skill points | Young, Adult, Middle Aged, Senior, Old | *Mythras Core* p. 32 | none | The generator and README use the printed age table when creating fresh characters |
| Standard and professional skill formulas | Mythras Core formulas only | *Mythras Core* pp. 42-49 and pp. 53-54 | none | `Customs = INT x 2`, `Native Tongue = INT + CHA`, `Language = INT + CHA`, `Folk Magic = POW + CHA` |
| Passions | Printed Passions table | *Mythras Core* p. 23 | cult one-pagers pp. 1-2 | Passion bases are recalculated from type, then carried totals are clamped upward if needed |
| Combat styles and timing | Mythras combat styles, initiative, action points | *Mythras Core* pp. 11-12 and pp. 86-100 | Starter Set Book 1 pp. 21-25 only as the removed RuneQuest procedure | Weapon skills are collapsed into combat styles and Strike Rank is removed |
| Hit locations and damage modifier | Direct `CON + SIZ` hit-location table; printed `STR + SIZ` damage table | *Mythras Core* pp. 9-10 | workbook `datasheet!C26:C33` as a matching implementation check | The scripts now use direct hit-location math rather than a derived total-HP split |
| Movement, climbing, swimming, armour penalty | Mythras movement and encumbrance rules | *Mythras Core* pp. 39, 43, 69-71 | automated PDF only as a widget target | The scripts compute jump, climb, swim, and armour penalty from Mythras rules |
| Theism, Devotion, Exhort | Mythras theism chassis | *Mythras Core* pp. 45 and 179-182 | cult one-pagers pp. 1-2 | `Devotion (Cult)` remains on the sheet as a core cult skill |
| Rune-affinity casting and devotional pools | Rune affinity replaces Exhort for casting; Devotion sets power; initiates cap devotional pool at half `POW`, rounded up | *Adventures in Glorantha* pp. 71-74 | cult one-pagers pp. 1-2 | Finished sheets use rune-affinity casting and devotional pools only |
| Cult identity, runes, obligations, miracle access | Cult one-pager packet | cult one-pagers pp. 1-2 | *Adventures in Glorantha* pp. 71-74 | The cult packet decides which runes stay visible and which miracles remain available |
| Character identity layer | Names, biographies, passions, equipment, current spells, companions, visible rune percentages | *RuneQuest Starter Set - Pregen Folios* pp. 1-20 | Starter Set Book 2 pp. 2-7, 23-28, 50-52 | Folios are source material, not the final play sheet |
| Adventure structure and scene intent | Starter-set scenarios and scene framing | *RuneQuest Starter Set - Book 4 Adventures* pp. 2-76 | *RuneQuest Starter Set - Book 1 Rules* pp. 17-25 and 43-51 | Encounters are rerun with Mythras mechanics and the substitution table below |
| Automated sheet implementation | Widget names, page-3 clone strategy, fill order | `Mythras Sheet - New Version - 1.1.pdf` pp. 1-3 | `templates/Mythras Sheet - RuneQuest-in-Mythras v1.2.pdf` and `pdf-field-map.md` | The PDF is treated as a form target, not a rules authority |
| Folio cover page | Original art, flavor biography, and patched starter guidance | extracted folio covers in `C:\Users\taoha\Downloads\glorantha-starter-extracted-cover-pages` | strict input JSON `rune_affinities` plus this README | Finished pregens are 4-page packets with the original folio cover restored as page 1 |

## Source conflicts resolved here

### 1. Characteristic pool

- The uploaded 2018 printing of *Mythras Core* uses a **75-point** human build on pp. 8-10.
- The workbook also uses **75 points**.

This project now uses **75 points** everywhere.

### 2. Workbook language and folk-magic bonuses

- The workbook adds legacy bonuses such as `Native Tongue = INT + CHA + 40`, `Tradetalk = INT + CHA + 30`, and `Folk Magic = POW + CHA + 30`.
- *Mythras Core* gives `Native Tongue = INT + CHA`, `Language = INT + CHA`, and `Folk Magic = POW + CHA`.

This project uses the **printed core formulas**.

### 3. Exhort versus rune affinity

- *Mythras Core* pp. 179-182 presents **Exhort** inside Theism.
- *Adventures in Glorantha* pp. 71-74 states that the relevant **rune affinity replaces Exhort for casting**.

This project keeps `Exhort` only as a valid core cult skill where appropriate, but the **casting roll for rune spells is the required rune affinity**. `Devotion` remains the power and cult-identity skill.

### 4. Page 3 handling

- The raw source sheet repeats worksheet-style content on page 3.
- The validated project template clones those widgets under `P3__...` names and only fills `P3__More_1..29`.

This project uses page 3 for companion and overflow notes only. It does **not** paint overlays over the page.

## GM skill substitution table

Use this table whenever the starter-set adventures or folios mention a RuneQuest-era skill name that is not present on the strict sheets.

| RuneQuest or legacy term | Use this Mythras skill | GM note |
| --- | --- | --- |
| `Scan`, `Listen`, `Search` | `Perception` | One perception cluster on the strict sheets |
| `Dodge` | `Evade` | Standard Mythras resistance skill |
| `Battle` | `Lore (Strategy and Tactics)` | Battlefield command and reading engagements |
| `Bargain`, `Evaluate` | `Commerce` | Buying, selling, appraisal |
| `Cult Lore (X)` | `Lore (X)` | Myths, doctrine, and temple learning |
| `Farm` | `Craft (Farming)` | Practical agricultural work |
| `Herd` | `Craft (Animal Husbandry)` | Herding, birthing, and stock handling |
| `Homeland Lore (X)` | `Lore (X)` or `Locale` | `Lore` for deep or historical knowledge, `Locale` for immediate familiarity |
| `Intimidate` | `Influence` | Threats and pressure are folded into Influence |
| `Intrigue` | `Deceit` or `Courtesy` | Pick by whether the scene is manipulation or protocol |
| `Manage Household` | `Bureaucracy` | Estates, servants, stores, and records |
| `Orate` | `Oratory` | Public speaking |
| `Peaceful Cut` | `Craft (Butchery)` | Skilled or ritual butchery rather than medicine |
| `Plant Lore` | `Lore (Plants)` | Herbs, crops, or flora lore |
| `Animal Lore` | `Lore (Animals)` | Animal behaviour or identification |
| `Spirit Lore` | `Lore (Spirits)` | Spirit taxonomy or weaknesses |
| `Spirit Dance`, `Spirit Travel` | `Trance` | Spirit-contact state and spirit-world travel |
| `Spirit Combat` | `Binding` for trained animists; otherwise `Willpower` when resisting | Do not leave `Spirit Combat` on the finished sheet |
| `Worship (Cult)` | `Devotion (Cult)` on the sheet; required rune affinity to cast | AiG pp. 71-74 is the casting rule |
| `Read/Write X` | `Literacy (X)` | Language-specific literacy |
| `Play Instrument (...)` | `Musicianship` | Performance skill |

## Step-by-step: creating a RuneQuest-style character in Mythras

Use this when you want a new Gloranthan character built directly on the Mythras sheet.

1. Pick homeland, social identity, and cult.  
   Sources: *RuneQuest Starter Set Book 2* pp. 2-7, 23-28, 50-52; cult one-pager pp. 1-2.

2. Choose a Mythras culture and career that match the concept.  
   Source: *Mythras Core* pp. 13-24 and 26-34.

3. Build characteristics from a strict 75-point base.  
   Source: *Mythras Core* pp. 8-10.  
   Use the human minima from the provenance table above and spend the full 75 points.

4. Apply culture, career, and age-category development.  
   Sources: *Mythras Core* pp. 13-24, 26-34, and 32.  
   Use the culture, career, and bonus-skill stages from the core book rather than importing RuneQuest percentages directly.

5. Add only Mythras Core professional and magical skills.  
   Sources: *Mythras Core* pp. 42-49 and 53-54.  
   Use only core names such as `Lore (...)`, `Craft (...)`, `Devotion (...)`, `Exhort`, `Folk Magic`, `Binding`, `Invocation`, `Shaping`, `Trance`, and so on.

6. Add Passions from the printed Passions table.  
   Source: *Mythras Core* p. 23.  
   Use the correct starting formula by Passion type, then raise or lower for story reasons only when the GM explicitly chooses to.

7. Add the cult layer from the cult one-pager.  
   Source: cult one-pager pp. 1-2.  
   Record cult name, parent cult or subcult if needed, cult obligations, and the three player-facing rune affinities.

8. Build rune magic by AiG.  
   Source: *Adventures in Glorantha* pp. 71-74.  
   Create a devotional pool, cap it at half `POW`, record `Devotion (Cult)`, and note which rune affinities gate which miracles.

9. Convert weapons into combat styles.  
   Sources: *Mythras Core* pp. 11-12 and 86-100.  
   Put actual weapons in the gear rows, but use combat styles as the skill interface.

10. Fill the PDF and validate the result.

```powershell
uv run python C:\Users\taoha\<agent-skills>\mythras-glorantha-conversion\scripts\mythras_glorantha_tools.py compute `
  --input <input.json> `
  --output <computed.json>

uv run python C:\Users\taoha\<agent-skills>\mythras-glorantha-conversion\scripts\mythras_glorantha_tools.py fill-sheet `
  --input <input.json> `
  --template "C:\Users\taoha\OneDrive\Documents\Playground\templates\Mythras Sheet - RuneQuest-in-Mythras v1.2.pdf" `
  --output <sheet.pdf> `
  --computed-output <computed.json>

uv run --with pypdf python C:\Users\taoha\OneDrive\Documents\Playground\scripts\validate_character_sheet.py `
  --pdf <sheet.pdf> `
  --expected-json <computed.json>
```

## Step-by-step: converting an existing RuneQuest pregen to Mythras

Use this for the starter-set folios.

1. Copy the identity layer unchanged.  
   Source: *RuneQuest Starter Set - Pregen Folios* pp. 1-20.  
   Keep name, biography, age, homeland, passions, equipment, companions, spell list, and visible rune percentages.

2. Rebuild the characteristics to a legal 75-point Mythras array.  
   Source: *Mythras Core* pp. 8-10.  
   Use the proportional rescaling method documented in the skill reference.

3. Recalculate every derived value from Mythras Core.  
   Sources: *Mythras Core* pp. 8-12, 23, and 39-49.  
   Do not carry over RuneQuest hit points, Strike Rank, or older hit-location math.

4. Keep standard skill totals only when they are at or above the Mythras base.  
   If a carried-over RuneQuest percentage falls below the new Mythras base, raise it to the Mythras base.

5. Replace every non-core skill name using the substitution table above.  
   Do not leave legacy names on the finished sheet.

6. Collapse weapon skills into 1-2 combat styles.  
   Combat style base is always `STR + DEX`. Keep the actual weapons and armour as equipment rows.

7. Recalculate Passion bases from *Mythras Core* p. 23.  
   Keep the folio's emotional priorities, but do not leave a Passion total below its new base.

8. Convert magic by cult packet plus AiG.  
   Sources: cult one-pager pp. 1-2; *Adventures in Glorantha* pp. 71-74.  
   Keep the spell list and visible rune affinities from the folio, but put the character on a devotional-pool and rune-affinity casting model.

9. Restore the folio cover as page 1.  
   Use the extracted folio cover for that character, keep the left biography and art unchanged, replace the right sidebar with the strict `rune_affinities` list, and rewrite only the stale mechanics bullets under `How to Play`.

10. Fill and validate the final sheet.  
   The project batch script already does this for the full starter-set roster:

```powershell
uv run --with pymupdf --with pypdf python C:\Users\taoha\OneDrive\Documents\Playground\scripts\generate_starter_set_pregens.py
```

## Current strict outputs

The current batch outputs live here:

- strict inputs: `output/inputs`
- computed field maps: `output/json`
- filled four-page PDFs: `output/pdf`
- validation manifest: `output/validation/starter-set-pregen-manifest.json`

The validation manifest now also records:

- `rune_affinities` per character for the cover-page sidebar
- `cover_page_pdf` used to build page 1
- `blank_nonempty_expected_fields`, which should remain empty after a correct run

All ten current starter-set pregens validate successfully under the strict 75-point build rules:

- Vasana
- Yanioth
- Harmast
- Vishi
- Vostor
- Sorala
- Nathem
- Aranda
- Dazarim
- Ionara

## Source-bound interpretation notes

These are not extra subsystems. They are the current tie-breaks where the folio identity layer and the strict cult-source layer do not line up one-to-one.

- Sorala keeps `Invocation` and `Shaping` because her folio introduction and spell list explicitly present her as both a Lhankor Mhy initiate and a trained sorcerous scholar. The cult packet still governs her rune affinities, devotion, and miracles; the sorcery skills stay because they are Mythras Core skills already named in her folio.
- Vostor uses the martial Yanafal Tarnils flavour inside the broader Seven Mothers identity because the cult one-pager set provides subcult packets rather than one undifferentiated Seven Mothers sheet, and his folio presents him as a front-line infantry veteran with martial Lunar magic.
- Dazarim remains primarily Yelmalio-led, but his sheet still surfaces White Bull devotion because his folio explicitly ties him to Argrath and the White Bull movement, and that loyalty remains player-facing even though the primary cult packet and miracle list come from Yelmalio.
