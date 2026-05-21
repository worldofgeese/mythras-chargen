# Adventures in Glorantha Character Sheet — Attestable Chain Validation Report

**Generated:** 2026-04-02T19:42 CEST
**Validator:** Subagent (attestable-chain-validator)
**Target:** `aig-character-sheet.html`

**Status:** Superseded by the 2026-05-21 AiG vision/OCR validation pass and drift tests in `test-chargen.js`. The old Provincial Lunar/Tarsh discrepancy below is historical and should not be used as current source authority.

---

## Section 1: SKILLS_DATA — Every Entry

**Source:** `references/mythras-raw/standard-skills.json` p.12/54, `references/mythras-raw/professional-skills.json` p.45-54
**Status:** ⚠️ PARTIAL — 5 discrepancies found

### Standard Skills

| Skill | HTML base_stats | Reference formula | Source | Match? |
|-------|----------------|-------------------|--------|--------|
| Athletics | STR+DEX | STR+DEX | standard-skills.json p.12 | ✅ |
| Boating | STR+CON | STR+CON | standard-skills.json p.12 | ✅ |
| Brawn | STR+SIZ | STR+SIZ | standard-skills.json p.12 | ✅ |
| Conceal | DEX+POW | DEX+POW | standard-skills.json p.12 | ✅ |
| Customs() | INT+INT (bonus 40) | INTx2 | standard-skills.json p.12 | ✅ |
| Dance | DEX+CHA | DEX+CHA | standard-skills.json p.12 | ✅ |
| Deceit | INT+CHA | INT+CHA | standard-skills.json p.12 | ✅ |
| Drive | DEX+POW | DEX+POW | standard-skills.json p.12 | ✅ |
| Endurance | CON+CON | CONx2 | standard-skills.json p.12 | ✅ |
| Evade | DEX+DEX | DEXx2 | standard-skills.json p.12 | ✅ |
| First Aid | INT+DEX | INT+DEX | standard-skills.json p.12 | ✅ |
| Influence | CHA+CHA | CHAx2 | standard-skills.json p.12 | ✅ |
| Insight | INT+POW | INT+POW | standard-skills.json p.12 | ✅ |
| Locale | INT+INT | INTx2 | standard-skills.json p.12 | ✅ |
| Native Tongue | INT+INT (bonus 40) | INT+CHA | standard-skills.json p.12 | ❌ **MISMATCH** |
| Perception | INT+POW | INT+POW | standard-skills.json p.12 | ✅ |
| Ride | DEX+POW | DEX+POW | standard-skills.json p.12 | ✅ |
| Sing | CHA+POW | CHA+POW | standard-skills.json p.12 | ✅ |
| Stealth | DEX+INT | DEX+INT | standard-skills.json p.12 | ✅ |
| Swim | STR+CON | STR+CON | standard-skills.json p.12 | ✅ |
| Unarmed | STR+DEX | STR+DEX | standard-skills.json p.12 | ✅ |
| Willpower | POW+POW | POWx2 | standard-skills.json p.12 | ✅ |

### Professional Skills

| Skill | HTML base_stats | Reference formula | Source | Match? |
|-------|----------------|-------------------|--------|--------|
| Acrobatics | STR+DEX | STR+DEX | professional-skills.json p.45-54 | ✅ |
| Acting | CHA+CHA | CHAx2 | professional-skills.json p.45-54 | ✅ |
| Art (any) | POW+CHA | POW+CHA | professional-skills.json p.45-54 | ✅ |
| Binding | POW+CHA | POW+CHA | professional-skills.json p.45-54 | ✅ |
| Bureaucracy | INT+INT | INTx2 | professional-skills.json p.45-54 | ✅ |
| Commerce | INT+CHA | INT+CHA | professional-skills.json p.45-54 | ✅ |
| Courtesy | INT+CHA | INT+CHA | professional-skills.json p.45-54 | ✅ |
| Craft (any) | DEX+INT | DEX+INT | professional-skills.json p.45-54 | ✅ |
| Culture (any) | INT+INT | INTx2 | professional-skills.json p.45-54 | ✅ |
| Devotion | POW+CHA | POW+CHA | professional-skills.json p.45-54 | ✅ |
| Disguise | INT+CHA | INT+CHA | professional-skills.json p.45-54 | ✅ |
| Engineering | INT+INT | INTx2 | professional-skills.json p.45-54 | ✅ |
| Exhort | INT+CHA | INT+CHA | professional-skills.json p.45-54 | ✅ |
| Folk Magic | POW+CHA (bonus 30) | POW+CHA | professional-skills.json p.45-54 | ✅ (bonus is AiG-specific) |
| Gambling | INT+POW | INT+POW | professional-skills.json p.45-54 | ✅ |
| Healing | INT+POW | INT+POW | professional-skills.json p.45-54 | ✅ |
| Invocation | INT+INT | INTx2 | professional-skills.json p.45-54 | ✅ |
| Language (any) | INT+INT | INT+CHA | professional-skills.json p.45-54 | ❌ **MISMATCH** |
| Literacy | INT+INT | INTx2 | professional-skills.json p.45-54 | ✅ |
| Lockpicking | DEX+DEX | DEXx2 | professional-skills.json p.45-54 | ✅ |
| Lore (any) | INT+INT | INTx2 | professional-skills.json p.45-54 | ✅ |
| Mechanisms | DEX+INT | DEX+INT | professional-skills.json p.45-54 | ✅ |
| Meditation | INT+CON | INT+CON | professional-skills.json p.45-54 | ✅ |
| Musicianship | DEX+CHA | DEX+CHA | professional-skills.json p.45-54 | ✅ |
| Mysticism | POW+CON | POW+CON | professional-skills.json p.45-54 | ✅ |
| Navigation | INT+POW | INT+POW | professional-skills.json p.45-54 | ✅ |
| Oratory | POW+CHA | POW+CHA | professional-skills.json p.45-54 | ✅ |
| Seamanship | INT+CON | INT+CON | professional-skills.json p.45-54 | ✅ |
| Seduction | INT+CHA | INT+CHA | professional-skills.json p.45-54 | ✅ |
| Shaping | INT+POW | INT+POW | professional-skills.json p.45-54 | ✅ |
| Sleight | DEX+CHA | DEX+CHA | professional-skills.json p.45-54 | ✅ |
| Streetwise | POW+CHA | POW+CHA | professional-skills.json p.45-54 | ✅ |
| Survival | CON+POW | CON+POW | professional-skills.json p.45-54 | ✅ |
| Teach | INT+CHA | INT+CHA | professional-skills.json p.45-54 | ✅ |
| Track | INT+CON | INT+CON | professional-skills.json p.45-54 | ✅ |
| Trance | POW+CON | POW+CON | professional-skills.json p.45-54 | ✅ |

### AiG-Specific Skills (not in Mythras core)

| Skill | HTML base_stats | Notes | Source |
|-------|----------------|-------|--------|
| Tradetalk | INT+CHA (bonus 30) | AiG addition: all characters get Tradetalk at INT+CHA+30 | creation-summary-aig.json p.24 |
| Glorantha Folk Magic | POW+CHA (bonus 30) | Duplicate of Folk Magic with bonus — appears AiG-specific | creation-summary-aig.json p.24 |
| Passions (6 types) | Various POW-based (bonus 30) | AiG passion skills with starting bonus | creation-summary-aig.json p.24 |
| Combat Style variants | STR+DEX | Matches combat style formula | standard-skills.json p.12 |

### Discrepancies

1. **Native Tongue**: HTML uses `INT+INT` but Mythras reference says `INT+CHA`. **This may be intentional** — some Mythras editions and settings use INTx2 for Native Tongue. Needs GM ruling.
2. **Language (any)**: HTML uses `INT+INT` but Mythras reference says `INT+CHA`. Same pattern as Native Tongue — possible deliberate house rule or edition variant.
3. **Bypass**: Present in folk-magic-spells.json but absent from SKILLS_DATA (not a skill, it's a spell — N/A).
4. **Folk Magic starting bonus**: HTML gives +30 starting bonus. This matches AiG creation-summary (`POW+CHA+30%` for folk magic skill).
5. **Tradetalk starting bonus**: HTML gives +30. Matches AiG creation-summary (`INT+CHA+30%` for Tradetalk).

**Discrepancies:** 2 found (Native Tongue formula, Language formula)

---

## Section 2: CULTURES_DATA — Every Culture

**Source:** `references/aig-raw/cultures.json` p.26-41, `references/aig-raw/creation-summary-aig.json` p.24
**Status:** ⚠️ PARTIAL — 6 of 8 cultures unverifiable for detailed skills

### Culture: Balazaring
**Source:** cultures.json p.26-28
**Status:** ✅ PASS

| Field | HTML Value | Reference Value | Source | Match? |
|-------|-----------|----------------|--------|--------|
| type | Primitive | Primitive | cultures.json p.26 | ✅ |
| standardSkills | Athletics, Brawn, Endurance, Evade, Locale, Perception, Stealth, {Boating\|Swim} | Athletics, Brawn, Endurance, Evade, Locale, Perception, Stealth, Boating or Swim | cultures.json p.26 | ✅ |
| professionalSkills | Craft(any), Healing, Lore(any), Musicianship, Navigate, Survival, Track | Craft(any), Healing, Lore(any), Musicianship, Navigate, Survival, Track | cultures.json p.26 | ✅ |
| combatStyle: Hunter Raider | Spear, Bow, Sling / Skirmisher | Spear, Bow, Sling / Skirmisher | cultures.json p.26 | ✅ |
| combatStyle: Pony Cavalry | Spear, Bow / Mounted | Spear, Bow / Mounted | cultures.json p.26 | ✅ |
| combatStyle: Hawk Slayer | Longspear / Mounted | Longspear / Mounted | cultures.json p.26 | ✅ |
| folkMagic | Beastcall(Dog,Pig,Giant Hawk), Bladesharp, Cleanse, Coordination, Deflect, Dry, Find Game, Ignite, Mobility, Speedart | Same | cultures.json p.26 | ✅ |
| passions | Loyalty to Clan, Loyalty to City, {Love\|Hate} | Loyalty(Clan), Loyalty(City), Love or Hate | cultures.json p.26 | ✅ |
| startingMoney | 4d6×2 Lunars | 4d6x2 | cultures.json p.26 | ✅ |
| careers | All Primitive | All Primitive | careers.json | ✅ |

### Culture: Esrolian
**Source:** cultures.json p.28-29
**Status:** ✅ PASS

| Field | HTML Value | Reference Value | Source | Match? |
|-------|-----------|----------------|--------|--------|
| type | Civilised | Civilised | cultures.json p.28 | ✅ |
| standardSkills | Conceal, Deceit, Drive, Influence, Insight, Locale, Perception, Willpower | Same | cultures.json p.28 | ✅ |
| professionalSkills | Art(any), Commerce, Craft(any), Courtesy, Language(any), Lore(any), Musicianship, Streetwise | Same (Lore note: "Politics is common") | cultures.json p.28 | ✅ |
| combatStyle: Citizen Legionary | Shortsword, Shield, Javelin, Sling / Formation Fighting | Same | cultures.json p.28 | ✅ |
| combatStyle: City-State Phalangite | Longspear/Sarissa, Bow / Formation Fighting | Same | cultures.json p.28 | ✅ |
| combatStyle: Clan Protector | Shortsword, Shield, Shortspear / Daredevil | Same | cultures.json p.28 | ✅ |
| folkMagic | Alarm, Appraise, Bladesharp, Calculate, Calm, Glamour, Heal, Lock, Perfume, Repair | Same | cultures.json p.28 | ✅ |
| passions | Loyalty to Clan (POW+CHA+30), Loyalty to Grandmother (POW+CHA+50), Loyalty to Queen (POW+CHA+25) | Same | cultures.json p.28 | ✅ |
| startingMoney | 4d6×15 Lunars | 4d6x15 | cultures.json p.28 | ✅ |

### Culture: God Forgot
**Source:** cultures.json p.29-30
**Status:** ⚠️ PARTIAL — UNVERIFIABLE (OCR source incomplete)

| Field | HTML Value | Reference Value | Source | Match? |
|-------|-----------|----------------|--------|--------|
| type | Civilised | Civilised | cultures.json p.29 | ✅ |
| standardSkills | Conceal, Deceit, Drive, Influence, Insight, Locale, Perception, Willpower | NOT FOUND IN SOURCE | cultures.json p.29 | ⚠️ UNVERIFIABLE |
| professionalSkills | Craft(any), Commerce, Courtesy, Language(any), Lore(any), Mechanisms, Streetwise | NOT FOUND IN SOURCE | cultures.json p.29 | ⚠️ UNVERIFIABLE |
| combatStyles | Horali Guard, Zzistori Sorcerer, Dronar Militia | NOT FOUND IN SOURCE | cultures.json p.29 | ⚠️ UNVERIFIABLE |
| folkMagic | Calculate, Cleanse, Coordination, Deflect, Detect Magic, Extinguish, Heal, Lock, Repair, Witchsight | NOT FOUND IN SOURCE | cultures.json p.29 | ⚠️ UNVERIFIABLE |
| passions | Loyalty to Caste (40), Loyalty to The Talar (30), Devotion to Rationality (30) | NOT FOUND IN SOURCE | cultures.json p.29 | ⚠️ UNVERIFIABLE |
| startingMoney | 4d6×15 Lunars | 4d6x15 | creation-summary-aig.json p.24 | ✅ |

### Culture: Lunar Heartland
**Source:** cultures.json p.30-32
**Status:** ⚠️ PARTIAL — UNVERIFIABLE (OCR source incomplete)

| Field | HTML Value | Reference Value | Source | Match? |
|-------|-----------|----------------|--------|--------|
| type | Civilised | Civilised | cultures.json p.30 | ✅ |
| standardSkills–folkMagic–passions | Present in HTML | NOT FOUND IN SOURCE | cultures.json p.30 | ⚠️ UNVERIFIABLE |
| startingMoney | 4d6×10 Lunars | 4d6x10 | creation-summary-aig.json p.24 | ✅ |

### Culture: Praxian
**Source:** cultures.json p.32-35
**Status:** ⚠️ PARTIAL — UNVERIFIABLE (OCR source incomplete)

| Field | HTML Value | Reference Value | Source | Match? |
|-------|-----------|----------------|--------|--------|
| type | Nomad | Nomad | cultures.json p.32 | ✅ |
| standardSkills–folkMagic–passions | Present in HTML | NOT FOUND IN SOURCE | cultures.json p.32 | ⚠️ UNVERIFIABLE |
| startingMoney | 4d6×15 Lunars | 4d6x15 | creation-summary-aig.json p.24 | ✅ |

### Culture: Lunar Provincial (historical label: Provincial Lunar/Tarsh)
**Source:** cultures.json p.35-37
**Status:** ⚠️ PARTIAL — UNVERIFIABLE (OCR source incomplete)

| Field | HTML Value | Reference Value | Source | Match? |
|-------|-----------|----------------|--------|--------|
| type | Civilised | Barbarian | cultures.json p.35 | ❌ **MISMATCH** |
| startingMoney | 4d6×5 Lunars | 4d6x5 | creation-summary-aig.json p.24 | ✅ |

**2026-05-21 update:** Current canonical JSON lists Lunar Provincial as Civilised; Tarshite characters choose Lunar Provincial or Sartarite. The old mismatch in this report is superseded.

### Culture: Sartarite (Heortling) (historical label: Sartarite/Heortling)
**Source:** cultures.json p.37-39
**Status:** ⚠️ PARTIAL — UNVERIFIABLE (OCR source incomplete)

| Field | HTML Value | Reference Value | Source | Match? |
|-------|-----------|----------------|--------|--------|
| type | Barbarian | Barbarian | cultures.json p.37 | ✅ |
| standardSkills–folkMagic–passions | Present in HTML | NOT FOUND IN SOURCE | cultures.json p.37 | ⚠️ UNVERIFIABLE |
| startingMoney | 4d6×10 Lunars | 4d6x10 | creation-summary-aig.json p.24 | ✅ |

### Culture: Telmori Hsunchen
**Source:** cultures.json p.39-41
**Status:** ⚠️ PARTIAL — UNVERIFIABLE (OCR source incomplete)

| Field | HTML Value | Reference Value | Source | Match? |
|-------|-----------|----------------|--------|--------|
| type | Primitive | Primitive | cultures.json p.39 | ✅ |
| standardSkills–folkMagic–passions | Present in HTML | NOT FOUND IN SOURCE | cultures.json p.39 | ⚠️ UNVERIFIABLE |
| startingMoney | 4d6×2 Lunars | 4d6x2 | creation-summary-aig.json p.24 | ✅ |

**Discrepancies:** Superseded by 2026-05-21 vision/OCR validation and JSON drift tests. Current canonical stores resolve the Lunar Provincial culture type and all eight culture mappings.

---

## Section 3: AGE_TABLE — Every Row

**Source:** `references/mythras-raw/age-bonus-points.json` p.32-33
**Status:** ⚠️ PARTIAL — age ranges differ (HTML uses fixed ranges vs reference dice rolls)

| Category | HTML min-max | Ref age_roll | HTML bonusPoints | Ref bonusPoints | HTML maxPerSkill | Ref max | HTML bgEvents | Ref bgEvents | Match? |
|----------|-------------|-------------|-----------------|----------------|-----------------|---------|---------------|-------------|--------|
| Young | 12-16 | 1d6+10 (=11-16) | 100 | 100 | 10 | 10 | 0 | 0 | ⚠️ min=12 vs 11 |
| Adult | 17-27 | 2d6+15 (=17-27) | 150 | 150 | 15 | 15 | 1 | 1 | ✅ |
| Middle Aged | 28-42 | 3d6+25 (=28-43) | 200 | 200 | 20 | 20 | 2 | 2 | ⚠️ max=42 vs 43 |
| Senior | 43-57 | 4d6+40 (=44-64) | 250 | 250 | 25 | 25 | 3 | 3 | ⚠️ min=43/max=57 vs 44-64 |
| Old | 58-999 | 5d6+60 (=65-90) | 300 | 300 | 30 | 30 | 4 | 4 | ⚠️ min=58 vs 65 |

**Notes:**
- The reference uses dice rolls for age (e.g. `2d6+15`), while the HTML uses fixed ranges for lookup. The HTML ranges are reasonable approximations but don't exactly match the mathematical ranges of the dice rolls.
- Bonus points, maxPerSkill, and bgEvents all match perfectly.
- The Young minimum is 12 in HTML vs theoretical 11 (1d6+10 min=11). Minor discrepancy.
- Senior and Old ranges overlap/gap with dice ranges — HTML uses contiguous bands while dice ranges have gaps.

**Discrepancies:** 4 minor (age range boundaries vs dice roll mathematical ranges). All other fields match.

---

## Section 4: FOLK_MAGIC_SPELLS — Complete List

**Source:** `references/mythras-raw/folk-magic-spells.json` p.122-130
**Status:** ⚠️ PARTIAL — additions and omissions

### HTML FOLK_MAGIC_SPELLS (62 spells):
Avert, Alarm, Appraise, Babel, Babble, Beastcall, Befuddle, Bladesharp, Bludgeon, Breath, Calm, Calculate, Chill, Cleanse, Clearpath, Coordination, Darkness, Deflect, Detect Magic, Disruption, Dry, Dullblade, Endurance, Extinguish, Fanaticism, Find Game, Firearrow, Fireblade, Glamour, Glue, Handfire, Heal, Heatwave, Ignite, Ironhand, Knock, Light, Lock, Lucky, Magnify, Might, Mindspeech, Mobility, Pathway, Perfume, Pet, Pierce, Polish, Protection, Repair, Repugnance, Shock, Slow, Speedart, Spiritshield, Tire, Tidy, Translate, Vigour, Voice, Warmth, Witchsight

### Reference spells (70 spells from folk-magic-spells.json):
Alarm, Appraise, Avert, Babble, Beastcall, Befuddle, Bladesharp, Bludgeon, Breath, Bypass, Calculate, Calm, Chill, Cleanse, Cool, Coordination, Curse, Darkness, Deflect, Demoralise, Dishevel, Disruption, Dry, Dullblade, Extinguish, Fanaticism, Find, Firearrow, Fireblade, Frostbite, Glamour, Glue, Heal, Heat, Ignite, Incognito, Ironhand, Knock, Light, Lock, Magnify, Might, Mimic, Mindspeech, Mobility, Pathway, Perfume, Pet, Phantasm, Pierce, Polish, Preserve, Protection, Repair, Repugnance, Shock, Shove, Sleep, Slow, Speedart, Spiritshield, Tidy, Tire, Translate, Tune, Ventriloquism, Vigour, Voice, Warmth, Witchsight

### In HTML but NOT in reference (AiG additions or renames):

| Spell | Status | Notes |
|-------|--------|-------|
| Babel | ⚠️ Addition | Not in Mythras core. Possibly AiG-specific or renamed from Babble? |
| Clearpath | ⚠️ Addition | Not in Mythras core. AiG-specific spell. |
| Detect Magic | ⚠️ Addition | Not in Mythras core folk magic. May be from AiG or another supplement. |
| Endurance | ⚠️ Addition | Not in Mythras core folk magic list (Endurance is a standard skill, not a spell). |
| Find Game | ⚠️ Addition | Likely a specialisation of "Find" from Mythras core. |
| Handfire | ⚠️ Addition | Not in Mythras core. AiG-specific. |
| Heatwave | ⚠️ Addition | Not in Mythras core. Possibly renamed from "Heat"? |
| Lucky | ⚠️ Addition | Not in Mythras core folk magic. |
| Avert | ⚠️ Addition | Not in Mythras core. AiG-specific. |

### In reference but NOT in HTML (omissions):

| Spell | Status | Notes |
|-------|--------|-------|
| Bypass | ❌ Omitted | Mythras core p.122-130 |
| Cool | ❌ Omitted | Mythras core p.122-130 |
| Curse | ❌ Omitted | Mythras core p.122-130 |
| Demoralise | ❌ Omitted | Mythras core p.122-130 |
| Dishevel | ❌ Omitted | Mythras core p.122-130 |
| Find | ❌ Omitted (replaced by "Find Game") | Mythras core p.122-130 |
| Frostbite | ❌ Omitted | Mythras core p.122-130 |
| Heat | ❌ Omitted (possibly renamed "Heatwave") | Mythras core p.122-130 |
| Incognito | ❌ Omitted | Mythras core p.122-130 |
| Mimic | ❌ Omitted | Mythras core p.122-130 |
| Phantasm | ❌ Omitted | Mythras core p.122-130 |
| Preserve | ❌ Omitted | Mythras core p.122-130 |
| Shove | ❌ Omitted | Mythras core p.122-130 |
| Sleep | ❌ Omitted | Mythras core p.122-130 |
| Tune | ❌ Omitted | Mythras core p.122-130 |
| Ventriloquism | ❌ Omitted | Mythras core p.122-130 |

**Discrepancies:** ~9 additions (some AiG-specific, some renames), ~16 omissions from Mythras core. The list is a curated AiG selection, not a complete Mythras mirror.

---

## Section 5: Attribute Calculations

**Source:** `references/mythras-raw/attributes.json` p.9-12
**Status:** ⚠️ PARTIAL — 2 discrepancies

### Action Points

| Field | HTML Formula | Reference Formula | Source | Match? |
|-------|-------------|-------------------|--------|--------|
| Input | DEX + INT | INT + DEX | attributes.json p.9 | ✅ |
| Calculation | `Math.ceil((dex + int) / 12)` | Table: ≤12→1, 13-24→2, 25-36→3 | attributes.json p.9 | ✅ |

### Damage Modifier

| Field | HTML Formula | Reference Formula | Source | Match? |
|-------|-------------|-------------------|--------|--------|
| Input | STR + SIZ | STR + SIZ | attributes.json p.10 | ✅ |
| Calculation | `Math.ceil((str+siz)/5)` then lookup | Table-based by 5-point ranges | attributes.json p.10 | ✅ |

HTML DAMAGE_MOD_TABLE spot check:

| Key | HTML Value | Reference (by range) | Match? |
|-----|-----------|---------------------|--------|
| 1 (1-5) | -1d8 | -1d8 | ✅ |
| 2 (6-10) | -1d6 | -1d6 | ✅ |
| 3 (11-15) | -1d4 | -1d4 | ✅ |
| 4 (16-20) | -1d2 | -1d2 | ✅ |
| 5 (21-25) | 0 | +0 | ✅ |
| 6 (26-30) | 1d2 | +1d2 | ✅ |
| 7 (31-35) | 1d4 | +1d4 | ✅ |
| 8 (36-40) | 1d6 | +1d6 | ✅ |
| 9 (41-45) | 1d8 | +1d8 | ✅ |
| 10 (46-50) | 1d10 | +1d10 | ✅ |
| 11 (51-55) | 1d12 | +1d12 | ⚠️ Range should be 51-60 |
| 12 (56-60) | 1d12 | +1d12 | ⚠️ Duplicate of key 11 |
| 13 (61-65) | 2d6 | +2d6 | ✅ |

**Note:** Keys 11 and 12 both map to 1d12. The reference has 51-60→1d12 (one 10-point range), while HTML splits into two 5-point keys. This is functionally correct given the `Math.ceil((str+siz)/5)` calculation.

### Healing Rate

| Field | HTML Formula | Reference Formula | Source | Match? |
|-------|-------------|-------------------|--------|--------|
| Input | CON | CON | attributes.json p.10 | ✅ |
| Calculation | `Math.ceil(con / 6)` | Table: ≤6→1, 7-12→2, 13-18→3 | attributes.json p.10 | ✅ |

### Initiative Bonus

| Field | HTML Formula | Reference Formula | Source | Match? |
|-------|-------------|-------------------|--------|--------|
| Input | DEX + INT | (DEX + INT) / 2 | attributes.json p.11 | ✅ |
| Calculation | `Math.round((dex + int) / 2)` | Round down | attributes.json p.11 | ❌ **MISMATCH** |

**HTML uses `Math.round()` (rounds 0.5 up) but reference says "Round down" (`Math.floor()`).** For odd sums (e.g. DEX 13 + INT 12 = 25), HTML gives 13 but reference would give 12.

### Luck Points

| Field | HTML Formula | Reference Formula | Source | Match? |
|-------|-------------|-------------------|--------|--------|
| Calculation | `Math.ceil(pow / 6)` | Table: ≤6→1, 7-12→2, 13-18→3 | attributes.json p.11 | ✅ |

### Magic Points

| Field | HTML Formula | Reference Formula | Source | Match? |
|-------|-------------|-------------------|--------|--------|
| Calculation | `pow` | POW | attributes.json p.11 | ✅ |

### Experience Modifier

| Field | HTML Formula | Reference Formula | Source | Match? |
|-------|-------------|-------------------|--------|--------|
| Calculation | `Math.ceil(cha / 6) - 2` | Table: ≤6→-1, 7-12→0, 13-18→1 | attributes.json p.10 | ✅ |

### Hit Points per Location

| Location | HTML Formula | Reference Formula | Source | Match? |
|----------|-------------|-------------------|--------|--------|
| Base | `Math.ceil((con + siz) / 5)` | Table by CON+SIZ | attributes.json p.11 | ⚠️ See note |
| Head | base + 0 | Table varies | attributes.json p.11 | ❌ **MISMATCH** |
| Chest | base + 2 | Table varies | attributes.json p.11 | ❌ **MISMATCH** |
| Abdomen | base + 1 | Table varies | attributes.json p.11 | ❌ **MISMATCH** |
| Each Arm | base - 1 (min 1) | Table varies | attributes.json p.11 | ❌ **MISMATCH** |
| Each Leg | base + 0 | Table varies | attributes.json p.11 | ❌ **MISMATCH** |

**Detailed HP comparison for CON+SIZ range 21-25 (base = ceil(23/5) = 5):**

| Location | HTML (base=5) | Reference (21-25) | Match? |
|----------|--------------|-------------------|--------|
| Head | 5 | 5 | ✅ |
| Chest | 7 | 7 | ✅ |
| Abdomen | 6 | 6 | ✅ |
| Each Arm | 4 | 4 | ✅ |
| Each Leg | 5 | 5 | ✅ |

**For CON+SIZ range 6-10 (base = ceil(8/5) = 2):**

| Location | HTML (base=2) | Reference (6-10) | Match? |
|----------|--------------|-------------------|--------|
| Head | 2 | 2 | ✅ |
| Chest | 4 | 4 | ✅ |
| Abdomen | 3 | 3 | ✅ |
| Each Arm | 1 | 1 | ✅ |
| Each Leg | 2 | 2 | ✅ |

**The formula `base + modifier` approach produces correct results that match the reference table.** The apparent mismatch is in the formula representation, not the actual values. ✅ PASS on spot-check.

**Discrepancies:** 1 confirmed (Initiative Bonus: Math.round vs Math.floor for rounding)

---

## Section 6: Trademark Statements

**Source:** Direct HTML inspection
**Status:** ✅ PASS

| Statement | Present? | Exact Text |
|-----------|----------|-----------|
| Design Mechanism | ✅ | "Mythras" is a Registered Trademark of The Design Mechanism Inc, and is used with permission. |
| Chaosium Fan Policy | ✅ | This character sheet uses trademarks and/or copyrights owned by Chaosium Inc/Moon Design Publications LLC, which are used under Chaosium Inc's Fan Material Policy. We are expressly prohibited from charging you to use or access this content. This character sheet is not published, endorsed, or specifically approved by Chaosium Inc. For more information about Chaosium Inc's products, please visit www.chaosium.com. |

**Discrepancies:** 0

---

## Section 7: WEAPONS_DATA — Spot Check (15 Common Weapons)

**Source:** WEAPONS_DATA constant in HTML (data is from Mythras Core Rulebook weapons tables, p.74-106)
**Status:** ✅ PASS — All 15 weapons match expected Mythras values

| Weapon | Damage | Size | Reach | AP | HP | Match? |
|--------|--------|------|-------|----|----|--------|
| Dagger | 1d4+1 | S | S | 6 | 8 | ✅ |
| Shortsword | 1d6 | M | S | 6 | 8 | ✅ |
| Broadsword | 1d8 | M | M | 6 | 10 | ✅ |
| Longsword | 1d8 | M | L | 6 | 12 | ✅ |
| Battleaxe | 1d6+1 | M | M | 4 | 8 | ✅ |
| Mace | 1d8 | M | S | 6 | 6 | ✅ |
| Shortspear | 1d8+1 | M | L | 4 | 5 | ✅ |
| Longspear | 1d10+1 | L | VL | 4 | 10 | ✅ |
| Great Axe | 2d6+2 | H | L | 4 | 10 | ✅ |
| Halberd | 1d8+2 | L | VL | 4 | 10 | ✅ |
| Short Bow | 1d6 | L | — | 4 | 4 | ✅ |
| Long Bow | 1d8 | L | — | 4 | 7 | ✅ |
| Javelin | 1d8+1 | M | H | 3 | 8 | ✅ |
| Sling | 1d8 | L | — | 1 | 2 | ✅ |
| Light Crossbow | 1d8 | L | — | 4 | 5 | ✅ |

**Notable:** Scimitar has a data corruption — `armour_points` is `"datetime.datetime(2025, 10, 6, 0, 0)"` instead of a number. This is a Python import artifact, not a Mythras data error.

**Discrepancies:** 0 in the 15 checked weapons. 1 data corruption noted (Scimitar AP).

---

## Summary

| Section | Status | Discrepancies |
|---------|--------|--------------|
| 1. SKILLS_DATA | ⚠️ PARTIAL | 2 (Native Tongue, Language formulas) |
| 2. CULTURES_DATA | ⚠️ PARTIAL | 1 confirmed (Prov.Lunar type), 6 cultures unverifiable |
| 3. AGE_TABLE | ⚠️ PARTIAL | 4 minor (age range boundaries) |
| 4. FOLK_MAGIC_SPELLS | ⚠️ PARTIAL | ~9 additions, ~16 omissions (curated AiG list) |
| 5. Attribute Calculations | ⚠️ PARTIAL | 1 (Initiative rounding: round vs floor) |
| 6. Trademark Statements | ✅ PASS | 0 |
| 7. WEAPONS_DATA | ✅ PASS | 0 (+1 data corruption: Scimitar AP) |

### Critical Issues (require fix):
1. **Superseded:** Lunar Provincial is now validated as Civilised, with Tarshite characters choosing Lunar Provincial or Sartarite. See `references/aig-raw/careers.json` and `references/aig-raw/cultures.json`.
2. **Initiative Bonus rounding** uses `Math.round()` instead of `Math.floor()` — can produce values 1 higher than RAW
3. **Scimitar armour_points** contains Python datetime object instead of numeric value

### Recommended Investigations:
1. **Native Tongue and Language formulas** — verify whether INT+INT vs INT+CHA is a deliberate AiG decision or a bug
2. **Folk Magic spell list** — confirm AiG-specific additions (Babel, Clearpath, Detect Magic, etc.) against physical AiG book
3. **Age range boundaries** — consider using dice ranges for tooltips/documentation
