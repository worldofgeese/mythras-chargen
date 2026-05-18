# Magic System Architecture

## Cult Type Detection (`detectCultType()`, index.html ~line 830)

Auto-classifies 94 cults into magic system types by inspecting their `cultSkills[]` array with regex pattern matching.

### Detection Signals

| Regex Pattern | Magic Type | Example Skills |
|---------------|-----------|----------------|
| `/^Devotion/i` | theist | Devotion (Orlanth), Devotion (Ernalda) |
| `/^Trance/i` or `/^Binding/i` | animist | Trance, Binding |
| `/^Invocation/i` or `/^Shaping/i` | sorcery | Invocation, Shaping |
| `/^Mysticism/i` or `/^Meditation/i` | mysticism | Mysticism, Meditation |

### Return Value

```js
{
  primary: 'theist',      // First detected type (drives UI branching)
  types: ['theist'],      // All detected types
  isHybrid: false         // true when types.length > 1
}
```

### Fallback Behavior

If no recognized magic skills are found in `cultSkills[]`, the function defaults to `theist` — the most common cult type in Glorantha and a safe assumption for cults with incomplete data.

### Hybrid Cults

Some cults (e.g., Jakaleel with both Devotion and Trance) return `isHybrid: true`. The UI branches to show multiple magic pickers when this occurs.

## Data Flow

```
CULTS_DATA (94 cults, each with cultSkills[])
  → detectCultType(cult)
    → {primary, types[], isHybrid}
      → selectCult() branches on primary type
        → theist: miracle picker (MIRACLES_DATA)
        → animist: spirit picker (STARTING_SPIRITS)
        → sorcery: sorcery spell picker (SORCERY_SPELLS)
        → mysticism: (blocked — no cult data uses these signals yet)
```

## Picker Pattern (Miracle/Sorcery/Spirit Selection)

All magic pickers share the same structural pattern:

1. **Checkbox list** — rendered from data constant
2. **Limit enforcement** — checked in toggle function before adding
3. **State storage** — pushed to array on `CharacterData`
4. **Re-render** — `App.renderCurrentStep()` called after toggle

### Limits by Magic Type

| Type | Limit | Source | State Field |
|------|-------|--------|-------------|
| Theist (miracles) | POW / 2 (Initiate devotional pool) | ADR-0007, Hannu house rule | `CharacterData.miracles[]` |
| Sorcery (spells) | 3 (Dedicated rank starting spells) | Mythras Core p.165: starting = Invocation/20 ≈ 3 | `CharacterData.sorcerySpells[]` |
| Animist (spirits) | CHA / 2 (Spirit Worshipper rank) | Mythras Core p.136: "Limits to Bound Spirits" table | `CharacterData.boundSpirits[]` |
| Folk Magic | 3 (cultural step) | AiG chargen rules | `CharacterData.folkMagicSpells[]` |
| Career Folk Magic | 2 (career step) | AiG chargen rules | `CharacterData.careerFolkMagic[]` |

**Important notes on formulas:**
- Sorcery limit: Mythras Core p.165 says memorisation max = INT, starting spells = Invocation/20. In AiG adaptation, Invocation → Rune Affinity. Starting Rune Affinity ≈ 60%, so 60/20 = 3.
- Spirit slots: Mythras Core p.136 table gives CHA/4 (Follower), CHA/2 (Spirit Worshipper), CHA×3/4 (Shaman), CHA (High Shaman). Chargen uses CHA/2 for Spirit Worshipper rank.

### Toggle Functions

```
App.toggleFolkMagicSpell(spell, checked, maxCount)  — folk magic (cultural)
App.toggleSorcerySpell(spellName)                   — sorcery spells
App.toggleBoundSpirit(spiritName)                   — animist spirits
App.toggleCareerFolkMagicSpell(spell, checked)      — folk magic (career)
```

Each function:
1. Checks if adding would exceed limit → shows toast error if so
2. Adds/removes from the relevant `CharacterData` array
3. Calls `App.saveToLocalStorage()`
4. Optionally calls `App.renderCurrentStep()` for UI refresh

## Orphan Cleanup on Cult Change

When a user deselects a cult or switches cults, `selectCult()` clears magic arrays that don't apply to the new cult type:
- `CharacterData.boundSpirits = []` if new cult isn't animist
- `CharacterData.sorcerySpells = []` if new cult isn't sorcery

This prevents stale magic selections from persisting across cult changes.

## Data Sources

| Data Constant | Source | Content |
|---------------|--------|---------|
| `MIRACLES_DATA` | `references/theism-miracles.json` | Per-cult miracle lists with rune tags |
| `SORCERY_SPELLS` | `references/mythras-raw/sorcery.json` | 53 spells from Mythras Core p.166-177 |
| `FOLK_MAGIC_DESCRIPTIONS` | `references/aig-raw/folk-magic-aig.json` | 45 AiG folk magic spell descriptions |
| `STARTING_SPIRITS` | `references/spirits-raw/bird-in-hand.json`, `monster-island.json` | 14 spirit templates with POW/CHA/abilities |

## House Rules (ADR-002 + ADR-0007)

### ADR-002: Rune Affinity Casting Model
- Rune affinities replace Exhort skill for casting
- Devotional pool size = POW/2 (Initiate), POW×0.75 (Acolyte), POW (Priest)
- Source: `docs/adr/002-rune-affinity-casting-model.md`

### ADR-0007: Hannu House Rules (comprehensive)
- Full casting rules table (5 situations for rune access)
- Spell learning: 5 XP rolls + 500L + 1 week training
- Spell categories: Any Rune / Normal Cult / Subservient Cult / Associated Cult
- Sorcery adaptation: Invocation → Rune Affinity, Shaping → Law Rune (AiG p.60)
- Rank progression: Proven 1yr, Overseer 1yr, Leader 2yr
- Source: `docs/adr/ADR-0007-hannu-house-rules.md`

## Mysticism Status

Path of Immanent Mastery is the only candidate for mysticism mechanics. Its current published one-pager (notesfrompavis.blog, 2014) uses **theist mechanics** (Exhort, Devotion, Theist Miracles heading). Hannu confirmed (Discord 2026-05-17) it "might" use mysticism in future but hasn't published updated mechanics. The `detectCultType()` mysticism regex is implemented but no cult currently triggers it.
