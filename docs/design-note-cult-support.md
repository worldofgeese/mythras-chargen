# Design Note: Cult Support for Adventures in Glorantha Character Sheet

## The Case

Practically everyone in Glorantha belongs to a cult. Cult membership is not a post-chargen bolt-on — it's the default state of Gloranthan life.

### Three Tiers of Cult Involvement

1. **Lay members (everyone)** — all Sartarites are lay members of Orlanth, all Praxians of Waha/Eiritha. Born into it. Participate in worship, contribute magic points at ceremonies. No special magic beyond universal folk magic.

2. **Initiates (most adventurers — Phase 1 target)** — formally dedicated to one specific deity. Access to cult-specific folk magic AND rune spells (divine magic). Obligations: tithe 10%, attend holy days, follow behavioral codes. Most Sartarite men initiate into Orlanth, most women into Ernalda.

3. **Devotees/Priests (rare — Phase 2+)** — deep dedication, higher requirements (POW thresholds, skills at 50%+). Full rune magic access. Heavy obligations.

### Magic System Layers

| Layer | Source | Cult Required? | What We Have |
|-------|--------|----------------|---------------|
| Folk/Spirit magic | Universal — bargains with nearby spirits | No | ✅ Already in chargen |
| Cult folk magic | Cult-specific spirit magic for initiates | Yes (initiate) | ❌ New with cult step |
| Rune/Divine magic | God's power via rune affinities | Yes (initiate) | ❌ New with cult step |
| Sorcery | Specialized training, most cults restrict | Special | ❌ Out of scope |

Cult selection is the bridge that connects our existing rune affinities to divine magic. The pieces are half-built — we have rune affinities, we have folk magic. Cults unlock the additional domain.

### Chargen Magic Flow

```
Folk Magic (universal, from culture)     ← already implemented
         +
Cult Selection (initiate)                ← NEW wizard step
         ↓
Cult Folk Magic (cult-specific spells)   ← bonus folk magic pool
         +
Rune Spells (divine magic, from cult)    ← new magic domain
         ↑
Cast via Rune Affinities                 ← already implemented
Intensity via Devotion skill             ← exists as Priest career skill
```

### Why Cult Should Be "Expected but Optional"

A Sartarite who hasn't initiated is like someone who hasn't graduated — it happens, but it's unusual for an adventurer. The step should appear with a default expectation of selection, but allow "No cult" for edge cases (God Forgot atheists, outlaws, etc.).

## Upstream Source

**Primary:** Notes from Pavis Cult One-Pagers (2019 Edition)
- Google Drive: `CultOnePagers2019` folder
- ~160 cults in one-pager PDF format
- Organized by pantheon subdirectories
- Tuned for Mythras/Adventures in Glorantha
- Cross-references: Gods of Glorantha, Cults of Prax, Cults of Terror, RQ Glorantha, RQ Bestiary

**The One-Pager structure per cult:**
1. Name and purpose
2. Runes
3. Requirements to join (initiate)
4. Requirements to join (rune level)
5. Cult skills
6. Folk magic for initiates
7. Theist miracles (rune spells)
8. Pantheons
9. Sources
10. Areas found
11. Personality traits (from runes)
12. Opposite runes
13. Enemy / Hostile / Friendly / Associated cults
14. Holy days and high holy days
15. Spirit societies
16. Totem animals

**Provenance hierarchy for chargen:**
1. Adventures in Glorantha (TDM) — engine of truth for Mythras mechanics
2. CultOnePagers2019 — cult-facing authority, cross-source synthesis
3. Gods of Glorantha / Cults of Prax — lore and spell detail
4. RQ Glorantha — modern canonical rune assignments (some runes changed)

## What Belongs in the Chargen Sheet

### Phase 1: Cult as Reference Data (next)

Add cult selection as a **wizard step** (between career and skills, or after rune affinities).

**Minimum viable cult record:**

```json
{
  "name": "Orlanth Adventurous",
  "pantheon": "Storm",
  "runes": ["Storm", "Movement"],
  "requirements": {
    "initiate": "No special requirements",
    "devotee": "POW 12+, 3 cult skills at 50%+"
  },
  "cultSkills": ["Lore (Mythology)", "Oratory", "Devotion (Orlanth)"],
  "folkMagic": ["Bladesharp", "Coordination", "Fanaticism", "Mobility"],
  "miracles": ["Shield", "Lightning", "Wind Words", "Leap"],
  "personalityTraits": ["Passionate", "Proud", "Unpredictable", "Violent"],
  "enemyCults": ["Lunar cults", "Chaos cults"],
  "friendlyCults": ["Ernalda", "Issaries", "Lhankor Mhy", "Chalana Arroy"],
  "areas": ["Dragon Pass", "Sartar", "Heortland"],
  "source": "CultOnePagers2019/Storm Pantheon/Orlanth Adventurous.pdf",
  "holyDays": ["Windsday of Movement Week"],
  "cultures": ["Sartarite", "Lunar Provincial"]
}
```

**Chargen integration points:**

| Wizard Step | What Cult Adds |
|-------------|---------------|
| Rune Affinities (Step 8) | Cult runes should match or be prominent |
| Cult Selection (NEW Step 8.5) | Pick cult → auto-populate cult skills, folk magic, personality traits |
| Folk Magic (Step 9) | Cult folk magic added to available pool |
| Passions (Step 10) | Loyalty (Cult) passion auto-added |
| Equipment/Notes (Step 11) | Tithe obligations, holy day reminders |

**Play Mode additions:**
- Cult name displayed in identity section
- Devotion skill tracked
- Theist miracles section (if devotee)
- Cult personality traits visible as behavioral guidance

**PDF additions:**
- Cult name in identity block
- Cult rune spells in magic section

### Phase 2: Full Cult Mechanics (later)

- Devotion advancement tracking
- Rune spell casting (magic points, POW matching)
- Spirit society integration
- Cult compatibility checker (enemy/friendly warnings in party)
- Sacrifice mechanics from Storm Tribe / Thunder Rebels

## Data Pipeline

### Step 1: Extract structured JSON from Cult One-Pager PDFs

The upstream is PDFs in Google Drive. We need a pipeline:

```
Google Drive folder (CultOnePagers2019/)
  → download PDFs per pantheon
  → extract text (pdf-to-text or LLM extraction)
  → normalize to JSON schema above
  → store in references/cults-raw/<pantheon>/<cult-name>.json
  → validate against schema
  → generate consolidated references/cults.json
```

### Step 2: Culture-to-cult mapping

Not every cult is available to every culture. We need:

```json
{
  "Sartarite": {
    "primary": ["Orlanth Adventurous", "Ernalda", "Humakt", "Issaries", "Lhankor Mhy"],
    "secondary": ["Chalana Arroy", "Eurmal", "Storm Bull", "Yelmalio"],
    "restricted": ["Seven Mothers"]
  }
}
```

This mapping lives in AiG and pantheon geography. CultOnePagers2019 has "areas found" which helps.

### Step 3: Inline into chargen

Like `CULTURES_DATA` and `CAREERS_DATA`, the cult data gets inlined into `index.html` as `CULTS_DATA`.

Priority order for Phase 1:
1. **Storm Pantheon** — Orlanth, Ernalda, Humakt, Issaries, Lhankor Mhy, Chalana Arroy, Storm Bull (covers Sartarite)
2. **Earth Pantheon** — Ernalda (full), Babeester Gor, Maran Gor, Ty Kora Tek (covers Esrolian)
3. **Solar/Lunar Pantheon** — Seven Mothers, Yelm, Yelmalio (covers Lunar, Balazaring)
4. **Praxian cults** — Eiritha, Waha, Storm Bull (covers Praxian)
5. **Other** — remaining 140+ cults as needed

## File Structure

```
references/
├── mythras-raw/          # existing — Mythras Core
├── aig-raw/              # existing — Adventures in Glorantha
├── cults-raw/            # NEW — per-pantheon cult extraction
│   ├── storm/
│   │   ├── orlanth-adventurous.json
│   │   ├── ernalda.json
│   │   └── ...
│   ├── earth/
│   ├── solar/
│   ├── lunar/
│   ├── darkness/
│   ├── praxian/
│   └── other/
├── cults.json            # NEW — consolidated, validated
├── culture-cult-map.json # NEW — which cults available per culture
└── pdf-field-map.json    # existing
```

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| CultOnePagers2019 is fan synthesis, not single canonical source | Declare provenance per field. Mark campaign-specific items. Use AiG as primary for mechanics |
| 160 cults is too many for inline data | Phase 1: only culture-relevant cults (~30). Full set as reference, not inline |
| PDF extraction quality varies | LLM-assisted extraction with human spot-check on 5 cults |
| Cult mechanics add wizard complexity | Cult step is optional. No cult = no change to existing flow |
| Rune spell lists may conflict between sources | CultOnePagers2019 already resolves this. We inherit their resolution |

## Decisions (Resolved)

1. **Phase 1 scope:** All culture-relevant (~30 cults)
2. **Wizard integration:** New step 8.5 between rune affinities and folk magic. Expected but optional ("No cult" allowed).
3. **Devotee vs initiate:** Initiates only in Phase 1
4. **Cult as requirement:** Expected but optional — most adventurers will have one
5. **Data source:** Google Drive API to pull CultOnePagers2019 PDFs

## Execution Plan

If approved:

1. ✍️ Download cult PDFs from upstream folder
2. ✍️ Extract → normalize → validate → store as `references/cults-raw/`
3. ✍️ Build `culture-cult-map.json`
4. 🏗️ Dispatch worker: add cult wizard step + CULTS_DATA inline
5. 🔍 Architect Lens gate (the new one we just built)
6. 🧪 Golden fixture: Sartarite Orlanth initiate, Esrolian Ernalda initiate
7. 📄 PDF export includes cult identity
8. ✅ Full SDLC pipeline with bounded diff verification
