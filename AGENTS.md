# AGENTS.md — Adventures in Glorantha Character Sheet

## What This Is
A single-file HTML character generator for Adventures in Glorantha (Mythras engine). Creates Gloranthan characters through a 12-step wizard and provides a Play Mode for at-the-table use.

## Design Rules

1. **Single-file delivery.** `index.html` is one self-contained HTML file. No external calls. No CDN fallbacks. No `<script src="...">` references. All JavaScript — including pdf-lib — is inlined. The file must work when opened from a local filesystem with no server, no internet, no companion files.

2. **Glorantha data stays inline.** `CULTURES_DATA`, `CAREERS_DATA`, `CULTS_DATA`, `WEAPONS_DATA`, and all other reference constants are embedded directly in `index.html`. Do not externalize them.

3. **Workers must not break inlining.** Any worker editing `index.html` must verify the file remains self-contained after their changes. `lib/pdf-lib.min.js` exists for the test harness and build pipeline — it is NOT a runtime dependency.

## Source Hierarchy
1. **Mythras Core Rulebook** (TDM, 3rd Printing 2018) — engine of truth
2. **Adventures in Glorantha** (TDM, GenCon 2015 Preview) — Gloranthan overlay
3. **Cult One-Pagers** (CultOnePagers2019) — cult-facing authority

## Attestable Provenance Chains
Every data field traces back to a source PDF through a reference JSON:

### Mythras Core (references/mythras-raw/)
| File | Source Pages | Contents |
|------|-------------|----------|
| characteristics.json | p.9-12 | 7 characteristics, formulas |
| standard-skills.json | p.12, p.54 | 22 standard skills |
| professional-skills.json | p.45-54 | 36 professional skills |
| attributes.json | p.9-12 | Derived attributes |
| age-bonus-points.json | p.32-33 | Age categories, bonus points |
| folk-magic-spells.json | p.122-130 | 70 folk magic spells |
| creation-summary.json | p.7-34 | Character creation steps |
| melee-weapons.json | p.74-106 | Melee weapon stats |
| ranged-weapons.json | p.74-106 | Ranged weapon stats |
| armour.json | p.57-58 | Armour stats |
| encumbrance.json | p.69-71 | Encumbrance rules |
| careers-by-culture.json | p.28 | Careers per culture type |
| social-class.json | p.31 | Social class table |
| passions.json | p.23-27 | Passion types, values, intensity |
| background-events.json | p.18-22 | Background events tables |
| community.json | p.22-23 | Family/allies/contacts generation |
| equipment-starting.json | p.33-34 | Starting equipment by culture type |
| cultures.json | p.14-18 | Generic culture templates |
| magic-overview.json | p.34-37 | Magic types and chargen allocation |

### AiG (references/aig-raw/)
| File | Source Pages | Contents |
|------|-------------|----------|
| cultures-mistral.json | p.26-41 | 8 cultures (Mistral OCR) |
| creation-summary-aig.json | p.23-25 | 12-step process |
| rune-affinities.json | p.24 | Rune affinity system |
| careers.json | p.24 | Career types by culture |

### Extraction Methods
- **pdftotext**: Mythras Core (text-layer pages)
- **Mistral OCR API**: AiG p.29-41 (image-embedded pages)
- **pypdf**: Cult One-Pagers (286 PDFs, extracted via `scripts/extract-cults.py`)

### Cults (references/cults-raw/ + references/cults-upstream/)
| Pantheon | Cults | Coverage |
|----------|-------|----------|
| Storm | 32 | Orlanth, Ernalda, Humakt, Issaries, Chalana Arroy, Storm Bull, etc. |
| Yelm | 17 | Yelm, Yelmalio, Buserian, Lodril, etc. |
| Lunar | 12 | Seven Mothers (7), Etyries, Crimson Bat, etc. |
| Praxian | 14 | Eiritha, Waha, Storm Bull, Foundchild, Daka Fal, etc. |
| Darkness | 19 | Zorak Zoran, Kyger Litor, Argan Argar, Xiola Umbar, etc. |

Upstream: Notes from Pavis Cult One-Pagers (2019 edition, v5.2)
Culture-to-cult mapping: `references/culture-cult-map.json`
- **Image + vision model**: AiG p.31 (God Forgot stats)
- **web_search**: Trademark statements

## Active Rules
- 75-point characteristic build (Mythras Core p.9-10)
- INT/SIZ minimum 8 for point-buy
- Cultural/career skills: max 15 per skill, 100 total budget
- 1 hobby professional skill in bonus points
- Initiative Bonus: Math.floor((DEX+INT)/2) — rounds down
- Folk magic list curated for Glorantha (62 spells)
- Rune affinities: 3 elemental runes at POW×2 + 30/20/10%

## Magic System Rules (ADR-001, ADR-002)

**Two magic systems only:** Folk Magic + Theist Miracles via Rune Affinities.

### Folk Magic (implemented)
- Skill: Folk Magic (POW+CHA+30% at creation)
- Spells: 3 from culture + 2 from career
- Source: `CULTS_DATA[].folkMagic` + culture folk magic lists

### Theist Miracles (implementation in progress)
- **Casting skill: Rune Affinity replaces Exhort** (AiG p.24)
- Intensity/Magnitude: Devotion skill
- Resource: Devotional Pool (Initiate = POW/2, Acolyte = POW×0.75, Priest = POW)
- Data source: Cult Spell Catalogue PDFs → `references/theism-miracles.json` → `CULTS_DATA[].miracles`
- Each miracle tagged with required rune(s) for casting

### Casting Rules (Hannu house rules, adopted as canonical)
| Cult Access | Your Rune | Rule |
|---|---|---|
| Allowed for all Runes | Any | Use any Rune Affinity you possess |
| Allowed for specific Rune | Have it | Must use that Rune Affinity |
| Allowed for specific Rune | Don't have it | Cannot cast (cult mystery) |
| Cult doesn't have Rune | Have it | Can cast using your Rune Affinity |
| Cult has spell, not Rune | Don't have it | Must learn that rune |

### Common Theist Spells (all cults, by rank)
- **Initiate (Any rune):** Command Cult Spirit, Extension, Find (Specific Thing), Summon Cult Spirit, Divination
- **Initiate (specific runes):** Multispell (Magic+Mastery), Soul Sight (Magic+Spirit), Spirit Block (Spirit), Warding (Magic+Stasis), Dismiss Magic (Magic)
- **Priest (Any):** Excommunication, Mindlink, Sanctify, Summon Spirit of Reprisal
- **Priest (specific):** Heal Wound (Harmony), Find Enemy (Magic)

### What We Do NOT Implement
- Sorcery (no cult data supports it for our 8 cultures)
- Mysticism (Kralorela not in our cultures)
- Animism as separate system (folded into Theist Miracles in one-pagers)

### Source Authority for House Rules
- Hannu (Notes from Pavis author, Cult One-Pagers creator)
- Artifact: `docs/adr/artifacts/hannu-casting-rules-2026-03-29.md`
- ADRs: `docs/adr/001-magic-system-architecture.md`, `docs/adr/002-rune-affinity-casting-model.md`
- **Passions always have a specific object** — "Hate (Chaos)" not "Hate". All passion types: Loyalty, Love, Hate, Fear, Desire, Devotion, Despise. Starting value: POW+CHA+30 unless culture specifies otherwise (e.g. Esrolian Loyalty to Grandmother at POW+CHA+50).
- **Combat styles auto-apply from culture** — the first unrestricted style is granted at STR+DEX. When multiple unrestricted styles exist, player chooses via dropdown.
- **Careers filter by culture type** — Primitive cultures see Primitive + "all" careers only. Civilised see Civilised + "all". Etc.
- **Career combat style placeholders resolve** — "Combat Style (Cultural Style)" maps to the character's actual cultural combat style.
- **Starting money is rolled** — "4d6×2 Lunars" is parsed and evaluated, not displayed as a string.

## Trademark Compliance
Both statements are in the HTML footer:
- Design Mechanism: "Mythras" is a Registered Trademark of The Design Mechanism Inc
- Chaosium Fan Policy: Full statement with www.chaosium.com link

## Key File
- `index.html` — single self-contained file (HTML + CSS + JS)

## Agent API (ADR-0005)

The primary programmatic interface for character creation. Agents pass semantic data and receive structured JSON responses — zero DOM interaction required.

### Methods

| Method | Input | Output | Side Effects |
|--------|-------|--------|--------------|
| `App.agent.getState()` | none | Full compiled character state | None (read-only) |
| `App.agent.getOptions(step)` | step number | Valid choices for that step | None (read-only) |
| `App.agent.getValidation()` | none | `{valid, errors, step}` | None (read-only) |
| `App.agent.setStep(step, data)` | step + data object | `{success, errors, state}` | Writes CharacterData, renders |
| `App.agent.next()` | none | `{success, errors, newStep}` | Advances step if valid |
| `App.agent.prev()` | none | `{success, newStep}` | Retreats step |
| `App.agent.buildCharacter(spec)` | Full character spec | `{success, errors, character}` | Builds entire character |

### Key Behaviors

- **Synchronous** — all methods return plain objects, no Promises
- **Never throws** — errors are always in the response envelope
- **Validate-then-apply** — failed calls leave state unchanged
- **Disambiguation is transparent** — pass `{name: 'Lore (any)', specialization: 'Plants'}` and it resolves internally

### Usage via playwright-cli

```bash
# Build a character in one call
playwright-cli eval "(() => {
  var spec = {
    step1: {name: 'Korlmar', concept: 'Warrior'},
    step2: {characteristics: {STR:15, CON:13, SIZ:12, DEX:11, INT:9, POW:8, CHA:7}},
    step4: {culture: 'Sartarite (Heortling)', homeland: 'Boldhome'},
    step5: {culturalSkills: {Athletics:15, Brawn:15, Endurance:15, Evade:10, Locale:10, Perception:10, Willpower:15, Ride:10}, runeAffinities: {primary:'Air', secondary:'Movement', tertiary:'Death'}, folkMagicSpells: ['Bladesharp','Fanaticism','Protection']},
    step6: {passions: [{type:'Loyalty', subject:'Clan', value:47}]},
    step7: {age: 21, gender: 'Male'},
    step8: {career: 'Warrior', professionalSkills: [{name:'Lore (any)', specialization:'Strategy'}, {name:'Craft (any)', specialization:'Weaponsmithing'}, {name:'Survival'}]},
    step9: {cult: 'Orlanth', miracles: ['Shield','Lightning','Wind Words','Leap']},
    step10: {careerSkills: {Athletics:15, Brawn:15, Endurance:15, Evade:10, Unarmed:10, 'Combat Style (Hill Clan Levy)':15, 'Lore (Strategy)':10, Survival:10}, careerFolkMagic: ['Disruption','Vigour']},
    step11: {bonusSkills: {Athletics:15, Brawn:15, Endurance:15, Evade:15, Willpower:15, Unarmed:15, 'Combat Style (Hill Clan Levy)':15, 'Lore (Strategy)':15, Survival:15, Perception:15}},
    step12: {socialClass: 'Freeman'}
  };
  return JSON.stringify(App.agent.buildCharacter(spec));
})()"

# Query available options
playwright-cli eval "JSON.stringify(App.agent.getOptions(4))"  # 8 cultures
playwright-cli eval "JSON.stringify(App.agent.getOptions(8))"  # careers for current culture
playwright-cli eval "JSON.stringify(App.agent.getOptions(9))"  # cults for current culture
```

### setStep Data Schemas

```javascript
// Step 1: {name: "Korlmar", concept: "Warrior"}
// Step 2: {characteristics: {STR:15, CON:13, SIZ:12, DEX:11, INT:9, POW:8, CHA:7}}
// Step 4: {culture: "Sartarite (Heortling)", homeland: "Boldhome"}
// Step 5: {culturalSkills: {...}, runeAffinities: {primary, secondary, tertiary}, folkMagicSpells: [...]}
// Step 6: {passions: [{type: "Loyalty", subject: "Clan", value: 47}]}
// Step 7: {age: 21, gender: "Male", family: "...", backgroundEvents: "..."}
// Step 8: {career: "Warrior", professionalSkills: [{name: "Lore (any)", specialization: "Strategy"}]}
// Step 9: {cult: "Orlanth", miracles: [...]} OR {cult: null}
// Step 10: {careerSkills: {...}, careerFolkMagic: [...]}
// Step 11: {bonusSkills: {...}}
// Step 12: {socialClass: "Freeman"} OR {rollSocialClass: true}
```

## Playwright Testing
The HTML is fully testable with playwright-cli. Mode switching uses CSS `display:none` (no offscreen positioning tricks that break automation).

**Preferred approach: Use `App.agent.*` for all programmatic character creation** (see Agent API above). The legacy DOM-based approach below still works for UI testing.

```bash
# Start server + open browser
python3 -m http.server 8765 &
playwright-cli open http://localhost:8765/index.html

# Preferred: Agent API (zero DOM interaction)
playwright-cli eval "JSON.stringify(App.agent.buildCharacter({step1: {name: 'Test'}}))"

# Legacy: DOM-based approach (for UI testing only)
playwright-cli eval "void(App.generateRandomCharacter())"
playwright-cli eval "''+CharacterData.cult+'/'+CharacterData.culture"
playwright-cli eval "void(App.switchMode('play'))"
playwright-cli screenshot --filename=play-mode.png
```

## Data Constants
| Constant | Entries | Source |
|----------|---------|--------|
| SKILLS_DATA | 75 | Mythras Core p.12, p.45-54 |
| CULTURES_DATA | 8 cultures, 44 combat styles | AiG p.26-41 |
| SOCIAL_CLASS_TABLE | Social classes | Mythras Core p.31 |
| WEAPONS_DATA | 284 weapons | Mythras Core p.74-106 |
| AGE_TABLE | 5 rows | Mythras Core p.32-33 |
| FOLK_MAGIC_SPELLS | 62 spells | Mythras Core p.122-130 + AiG |
| CAREERS_DATA | 24 careers | Mythras Core p.28-34 |
| CULTS_DATA | 94 cults | Notes from Pavis CultOnePagers2019 |
| CULTURE_CULT_MAP | 8 cultures | Derived from cult areas + AiG cultures |
| COMBAT_TRAITS_DATA | 114 traits | Mythras Core + AiG |
| DAMAGE_MOD_TABLE | 20 entries | Mythras Core p.10 |

## Validation History
- validation-report.md — field-by-field attestable chain validation
- 6 cook runs with review gates, all passed
- 15 original request bullets validated and remediated

## Governance Pipeline

Every PR/merge on this project goes through:

1. **ADR gate** — verify no ADR is violated (magic system, attestable chain, casting model)
2. **Architect Lens** — holistic fit: single-file constraint, data flow integrity, ADR compliance
3. **Model Council** — 5-model adversarial review for substantial changes (>150 LOC, >3 files, or ADR-governed domain)
4. **PDF export test** — mandatory when character data or export paths change
5. **QA pass** — full end-to-end Playwright run (wizard + Play Mode)
6. **ADR-first rule** — house rules/gameplay decisions get an ADR BEFORE implementation. Use [adr-skill](https://github.com/skillrecordings/adr-skill) format. No attestable artifact = no merge.

The `autonomous-swe.md` prompt encodes these as Gate 2.7 (Architect Lens), Gate 3.5 (QA + PDF), and Gate 4 (Council with ADR-governed threshold).

## What NOT to use
- RuneQuest Weapons & Equipment (Chaosium, RQ7) — different engine, incompatible stats
- Any RQ7/Chaosium-era stat blocks — this is Mythras (TDM), not RuneQuest (Chaosium)
