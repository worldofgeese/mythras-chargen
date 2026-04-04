# Mythras Chargen — Remediation Plan

## Competitive Landscape Summary

| Tool | Focus | Strength | Weakness |
|------|-------|----------|----------|
| mythras.skoll.xyz (MEG) | NPC/encounter generation | 4500+ templates, community-sourced, AiG-aware | Not a player-facing chargen wizard |
| Notes from Pavis pregens | Gloranthan pregens via MEG | Culture-accurate Sartarite/Praxian/Pavis NPCs | GM tool, not player tool |
| classicfantasy.quest | Classic Fantasy random chargen | VTT import (Roll20/Foundry) | Classic Fantasy only, not core Mythras |
| Wobin/Mythras-Character-Generator | PWA chargen | Installable, offline-capable | C#/Blazor, no Glorantha, seems stale |
| tsinwntas/mythras-tools | Web chargen + combat flow | Combat flow reference | Bug reports in Reddit comments, no tests |
| boiledmouse/mythras-char-gen | Web chargen | Recent (Apr 2025), PDF/markdown export | Missing 5% cultural base (per community feedback) |
| TDM Character Creation Workbook | Official PDF workbook | Official, comprehensive | Static PDF, not interactive |
| **Ours (mythras-chargen)** | **Wizard + Play Mode + PDF** | **Attested data, AiG overlay, dual export** | **Monolithic, half-centralized domain** |

**Our differentiation:**
1. Only tool with attestable provenance chains to specific page numbers
2. Only tool with AiG Glorantha overlay as modular add-on
3. Only tool with both guided wizard AND live play mode
4. Only tool with automated test suite

## Mechanics Spot-Check Results

### ✅ Confirmed Correct
- Action Points: INT+DEX, table lookup (12→1, 13-24→2, 25-36→3)
- Initiative Bonus: (DEX+INT)/2, Math.floor ✅
- Magic Points: = POW ✅
- Movement Rate: 6m ✅
- Healing Rate: CON / 6 bands ✅
- Luck Points: POW / 6 bands ✅
- Experience Modifier: CHA / 6 bands ✅
- Hit location d100 ranges: correct per Mythras p.11
- Folk Magic base: POW+CHA (with +30 from AiG) ✅
- Cultural skill pool: 100 points, max 15 per skill ✅
- Career skill pool: 100 points, max 15 per skill ✅
- Passions base: POW+CHA+30 (AiG cultural passions) ✅
- Dice formulas: 3d6 for STR/CON/DEX/POW/CHA, 2d6+6 for SIZ/INT ✅
- Combat style traits match AiG source ✅

### ⚠️ Issues Found

#### 1. Point-Buy Minimums: INT/SIZ min 8 in UI, but reference JSON says min 6
- **Code (line ~2008):** `min="${pointBuy ? ((stat === 'INT' || stat === 'SIZ') ? 8 : 3) : 3}"`
- **Reference (characteristics.json):** `"minimum": { "default": 3, "INT": 6, "SIZ": 6 }`
- **Mythras Core p.37:** Point-buy says SIZ and INT minimum 8 for humans
- **VERDICT:** Code is correct (8), reference JSON is wrong (6). Fix the JSON.

#### 2. Point-Buy Maximum: reference says 18, code says 18 ✅
- Both correct per Mythras Core p.37

#### 3. Damage Modifier Table: cosmetic formatting drift
- Code: `'0'`, `'1d2'`, `'1d4'` (no + prefix for positive values)
- Reference: `"+0"`, `"+1d2"`, `"+1d4"`
- **VERDICT:** Fix code to include `+` prefix for positive modifiers

#### 4. Damage Modifier Calculation: `Math.ceil((str + siz) / 5)` → index into table
- Reference: Table uses STR+SIZ ranges (1-5, 6-10, 11-15, etc.)
- Code divides by 5 and rounds up, then indexes
- For STR=14, SIZ=11: sum=25, ceil(25/5)=5 → table[5]='0' → correct (range 21-25 = +0)
- **VERDICT:** ✅ Correct

#### 5. Hit Points Per Location Calculation
- Code: `hitPointsPerLocation(con, siz)` uses `Math.ceil((con + siz) / 5)` as base
- Reference: CON+SIZ ranges (1-5→head:1, 6-10→head:2, etc.)
- For CON=12, SIZ=11: sum=23, ceil(23/5)=5 → base=5
- Reference says 21-25: head=5, chest=7, abdomen=6, arm=4, leg=5 ✅
- Code: Head=base, Chest=base+2, Abdomen=base+1, Arm=base-1, Leg=base ✅
- **VERDICT:** ✅ Correct

#### 6. Helpers.getHitLocationHP() uses DIFFERENT formula
- Code: `Math.ceil((siz + con) / 2)` as base, then adds `hpMod`
- HIT_LOCATIONS modifiers: Head=0, Leg=0, Abdomen=+1, Chest=+2, Arm=-1
- For SIZ=11, CON=12: ceil(23/2)=12, Head=12, Chest=14, Abdomen=13, Arm=11, Leg=12
- But Calc.hitPointsPerLocation gives: Head=5, Chest=7, Abdomen=6, Arm=4, Leg=5
- **VERDICT:** 🔴 BUG — Helpers.getHitLocationHP() uses wrong formula. Should use (CON+SIZ)/5 not (CON+SIZ)/2

#### 7. Play Mode HP label shows Healing Rate not total HP
- `<div><strong>HP:</strong> ${attrs.healingRate}</div>` — misleading abbreviation
- Should either say "Heal:" or show total HP across all locations
- **VERDICT:** ⚠️ Cosmetic but confusing

#### 8. Age table ranges don't match reference exactly
- Code: Young 12-16, Adult 17-27, Middle Aged 28-42, Senior 43-57, Old 58+
- Reference age_table: Young uses 1d6+10 (11-16), Adult uses 2d6+15 (17-27)
- The ranges are derived from the dice, so 12-16 vs 11-16 is slightly off for Young
- **VERDICT:** ⚠️ Minor — Young minimum should be 11 not 12

#### 9. Source naming: "Adventures in Glorantha" vs "Adventures in RuneQuest"
- The GenCon 2015 Preview was titled "Adventures in Glorantha"
- Some references may now call it "Adventures in RuneQuest"
- Our code and docs consistently say "Adventures in Glorantha" ✅
- **VERDICT:** Correct for the preview edition we're using

#### 10. Skill base formulas cross-check
- Standard skills all verified against reference JSON ✅
- Professional skills all verified against reference JSON ✅
- But Acting formula: reference says "CHAx2", our SKILLS_DATA says ["CHA","CHA"] ✅ (equivalent)

## Remediation Waves

### Wave 1: Data Integrity & Bug Fixes (Critical)
1. Fix Helpers.getHitLocationHP() formula (BUG — wrong divisor)
2. Fix characteristics.json INT/SIZ minimum (6 → 8)
3. Fix damage modifier table formatting (+0, +1d2, etc.)
4. Fix Young age minimum (12 → 11)
5. Fix Play Mode HP label clarity
6. Add missing `+` prefix to positive damage modifiers in DAMAGE_MOD_TABLE
7. Write tests for ALL calculation functions against reference JSON golden values

### Wave 2: Architecture Hardening
1. Create `normalizeCharacter(rawData)` projection layer
2. Refactor Step 11, Play Mode, and both PDF exports to use normalized model
3. Eliminate duplicate skill compilation paths
4. Standardize weapon data shape (always objects, never bare strings)
5. Standardize passion/equipment data shapes
6. Add CharacterData schema documentation
7. Extract `eval()` from formula evaluation

### Wave 3: Test Expansion & Golden Fixtures
1. Create 4 golden character fixtures (Balazaring, Praxian, Telmori, Sartarite)
2. Add reference-data-driven calculation tests (every formula against every table row)
3. Add PDF content regression tests using golden fixtures
4. Add localStorage round-trip tests with schema versioning
5. Add template PDF field coverage tests against pdf-field-map.json

### Wave 4: Operational Hardening
1. Vendor pdf-lib locally (remove CDN dependency)
2. Add state versioning to localStorage persistence
3. Add migration path for schema changes
4. Branch cleanup and merge to main
5. Release checklist document

### Wave 5: Browser Automation (if playwright available)
1. Playwright smoke tests for wizard flow
2. Playwright tests for play mode state persistence
3. Screenshot capture for visual regression
