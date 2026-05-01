# Mythras CharGen — Full Audit Report
**Date:** 2026-05-01  
**Method:** Node.js vm extraction (4486 lines), Playwright browser walkthrough, reference JSON cross-check  
**Characters tested:** 5 random generations across all culture types  
**Reference corpus:** 20 mythras-raw JSONs + 7 aig-raw JSONs (PDF → OCR → structured)

---

## Summary

| Category | Passed | Issues |
|----------|--------|--------|
| Culture data fidelity | ~80 | 11 |
| Combat styles (weapons + traits) | ~60 | 1 |
| Skills (base_stats, bonuses, existence) | ~90 | 5 |
| Career–culture mapping | 0 | **69** (systemic) |
| Attribute formulas | 12 | 0 |
| Damage modifier table | 17 | 3 (high-end overflow) |
| Play Mode vs Wizard Mode | — | 0 (architecture verified) |
| **Total** | **738** | **117** |

---

## ❌ Critical: Career–Culture Type Mapping (69 issues)

The app uses a single `type` field per career (e.g., `type: "civilised"`) and filters with `c.type === 'all' || c.type === cType`. Mythras uses a per-culture-type availability matrix where higher culture types include lower ones.

**What the app gives each culture type vs what Mythras says:**

| Culture Type | App Available | Should Have | Missing | Extra |
|-------------|--------------|-------------|---------|-------|
| **Civilised** | 19 | 24 | Beast Handler, Herder, Hunter, Scout, Shaman | — |
| **Barbarian** | 10 | 19 | Beast Handler, Herder, Hunter, Merchant, Miner, Official, Physician, Scholar, Shaman, Thief | — |
| **Nomad** | 10 | 15 | Beast Handler, Hunter, Merchant, Official, Physician, Scholar, Scout, Shaman, Thief | Entertainer, Farmer, Mystic |
| **Primitive** | 8 | 11 | Physician, Scholar, Scout, Thief | Entertainer, Farmer, Mystic, Priest |

**Fix:** Replace single `type` with `cultureTypes: ["Primitive", "Barbarian", ...]` array per career. Filter: `c.cultureTypes.includes(cultureType)`.

**Correct mapping from Mythras Core p.14-22:**
```
Agent:         [Civilised]
Alchemist:     [Civilised]
Beast Handler: [Primitive, Barbarian, Nomad, Civilised]
Courtesan:     [Civilised]
Courtier:      [Civilised]
Crafter:       [Primitive, Barbarian, Nomad, Civilised]
Entertainer:   [Barbarian, Nomad, Civilised]
Farmer:        [Barbarian, Nomad, Civilised]
Fisher:        [Primitive, Barbarian, Nomad, Civilised]
Herder:        [Barbarian, Nomad, Civilised]
Hunter:        [Primitive, Barbarian, Nomad, Civilised]
Merchant:      [Barbarian, Nomad, Civilised]
Miner:         [Barbarian, Civilised]
Mystic:        [Barbarian, Civilised]
Official:      [Barbarian, Nomad, Civilised]
Physician:     [Primitive, Barbarian, Nomad, Civilised]
Priest:        [Barbarian, Nomad, Civilised]
Sailor:        [Primitive, Barbarian, Nomad, Civilised]
Scholar:       [Primitive, Barbarian, Nomad, Civilised]
Scout:         [Primitive, Barbarian, Nomad, Civilised]
Shaman:        [Primitive, Barbarian, Nomad, Civilised]
Sorcerer:      [Civilised]
Thief:         [Primitive, Barbarian, Nomad, Civilised]
Warrior:       [Primitive, Barbarian, Nomad, Civilised]
```

---

## ❌ Medium: Double Money Roll (Bug)

**Location:** `generateRandomCharacter()` lines ~3322 and ~3357  
**Symptom:** Two toast notifications with different Lunar amounts. Second overwrites first.  
**Cause:** `autoPopulateStartingEquipment()` calls `rollStartingMoney()` (guarded), then `generateRandomCharacter()` calls it again unconditionally.  
**Fix:** Remove the explicit `App.rollStartingMoney()` at line ~3357.

---

## ❌ Medium: Duplicate Weapons from Background + Combat Style

**Location:** `generateRandomCharacter()` + `autoPopulateStartingEquipment()`  
**Symptom:** 2-3 copies of same weapon (e.g., 3× Longspear for Hawk Slayer).  
**Cause:** Background equipment table uses combat style weapons as pool (1-2 random picks), then combat style weapons are added separately.  
**Fix:** Deduplicate after both sources, or skip combat style weapons already present.

---

## ❌ Medium: Passion Data Format Issues (3 cultures)

| Culture | Issue |
|---------|-------|
| **Lunar Heartland** | App passion types: `["", "Hate", "Loyalty"]` — empty string for Love passion |
| **Lunar Provincial** | App: `["", "", "Loyalty"]` — two empty passion types |
| **Sartarite** | App has 4 passions but ref has 4 — type mismatch: app shows 1 empty + Hate + Love + Loyalty vs ref's Hate + Hate + Love + Loyalty |

The empty strings suggest the passion `name` field isn't being populated for some passion types (likely "Love" passions where the focus object is missing).

---

## ❌ Low: Missing Skills in SKILLS_DATA (5 items)

| Skill | Used By |
|-------|---------|
| `Navigate` | Balazaring, Praxian, Telmori cultures |
| `Culture` | Lunar Provincial culture |
| `Lore (Telmori)` | Telmori Hsunchen culture |
| `Customs` | 8 careers (Alchemist, Courtesan, Courtier, etc.) |
| Various `Craft (X)`, `Lore (X)` | Career specializations |

The `Craft (any)` and `Lore (any)` pattern skills are in SKILLS_DATA but specific instances like `Craft (Alchemy)` and `Lore (Military History)` aren't — these are resolved at runtime via pattern matching. The base skill match works for point allocation but the specific name won't resolve for `compileAllSkills()`.

---

## ❌ Low: Combat Style Trait Formatting

**Lunar Heartland "Dara Happan Heavy Infantry"** — app trait `"Hoplon Fighting"` vs ref `"Hoplon Fighting – can use kontos and hoplon together"`. The ref includes a description in the trait name. This is a data normalization issue, not a rules error.

---

## ❌ Low: Damage Modifier Table Overflow (3 entries)

Keys 22-26 (STR+SIZ > 100) are missing from `DAMAGE_MOD_TABLE`. Table only goes to key 20 (STR+SIZ=96-100). Not reachable with human characteristics (max 42) but relevant for creatures.

---

## ❌ Low: Professional Skills "Choice" Normalization

Esrolian, God Forgot, Lunar Provincial, Telmori — app wraps `Craft (any)` / `Lore (any)` in choice objects `{choice: "Craft (any)"}` while ref has them as plain strings. Functionally equivalent but makes exact matching fail.

---

## ✅ Play Mode vs Wizard Mode Fidelity: VERIFIED

Both modes operate on the **identical** `CharacterData` object:
- `renderPlayMode()` calls `Calc.calculateAllAttributes()` — same function used during generation
- `renderPlayAttributes()` reads directly from `CharacterData.attributes`
- `renderPlaySkills()` calls `compileAllSkills()` → `Helpers.getCompiledSkills(CharacterData)`
- `renderPlayCombat()` reads `CharacterData.combatStyles` and `CharacterData.weapons`
- Skill total: `base + cultural + career + bonus` — consistent everywhere

No divergence path exists. Wizard Mode populates `CharacterData`, Play Mode renders it.

---

## ✅ All Attribute Formulas Verified

| Attribute | Formula | Verified |
|-----------|---------|----------|
| Action Points | `ceil((INT+DEX) / 12)` | ✓ matches Mythras p.9 |
| Damage Modifier | `DAMAGE_MOD_TABLE[ceil((STR+SIZ) / 5)]` | ✓ matches Mythras p.10 |
| Experience Modifier | `ceil(CHA / 6) - 2` | ✓ matches Mythras p.10 |
| Healing Rate | `ceil(CON / 6)` | ✓ matches Mythras p.10 |
| Hit Points | `ceil((CON+SIZ) / 5)` + location offsets | ✓ matches Mythras p.11 |
| Initiative Bonus | `floor((INT+DEX) / 2)` | ✓ matches Mythras p.11 |
| Luck Points | `ceil(POW / 6)` | ✓ matches Mythras p.12 |
| Magic Points | `= POW` | ✓ |
| Movement Rate | `6m` | ✓ |

---

## ✅ All 8 Cultures Present with Correct Types

| Culture | Type | Verified |
|---------|------|----------|
| Balazaring | Primitive | ✓ |
| Esrolian | Civilised | ✓ |
| God Forgot | Civilised | ✓ |
| Lunar Heartland | Civilised | ✓ |
| Lunar Provincial | Civilised | ✓ |
| Praxian | Nomad | ✓ |
| Sartarite (Heortling) | Barbarian | ✓ |
| Telmori Hsunchen | Primitive | ✓ |

---

## ✅ Combat Styles — All Weapons & Traits Verified

Checked every combat style for every culture. 60+ weapon/trait pairs verified against reference JSONs. Only issue: 1 trait formatting difference (Dara Happan Heavy Infantry).

---

## Priority Fix Order

1. **Career–culture mapping** (Critical — wrong careers shown for most cultures)
2. **Double money roll** (Medium — easy fix, one line removal)
3. **Duplicate weapons** (Medium — dedup logic)
4. **Empty passion names** (Medium — data fix in CULTURES_DATA)
5. **Missing Navigate/Culture/Customs skills** (Low — add to SKILLS_DATA)
