# Full Attestation & Conformance Audit

**Date:** 2026-05-03
**Scope:** Data attestability, rules conformance, mode fidelity, holistic system state

---

## Multi-Level Perspective

### MACRO: System Integrity Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ATTESTATION COVERAGE                         │
│                                                                 │
│  ████████████████████░░░░░░░░░░  ~60% fully attested           │
│                                                                 │
│  Rules Conformance:  26/27 PASS (96%)                          │
│  Mode Fidelity:      Critical gaps in persistence layer         │
│  Data Chain:         Broken link at cults→miracles propagation  │
└─────────────────────────────────────────────────────────────────┘
```

**Verdict:** The *calculation engine* is solid (26/27 rules pass). The *reference chain* has strong foundations but significant gaps in weapons and combat traits. The *persistence layer* has a critical silent-data-loss bug for theism data.

---

### MESO: Cross-Cutting Concerns

#### A. The Theism Pipeline Is Broken End-to-End

The magic system (ADR-001 + ADR-002) is architecturally sound — formulas are correct, rune affinities calculate properly, devotional pool is right. But the **data never fully connects**:

```
theism-miracles.json (78 cults, attested)
    → CULTS_DATA[].miracles = [] (EMPTY — propagation broken)
        → Play Mode shows miracles (from runtime selection, not CULTS_DATA)
            → PDF exports miracles (but without rune tags)
                → toJSON()/localStorage DROPS cult + miracles + devotionalPool
```

**Impact:** A user who creates a character with cult miracles, saves, and reloads loses their entire theism setup.

#### B. Weapons/Equipment: Large Unattested Surface Area

| Category | Attested | Unattested | % Gap |
|----------|----------|------------|-------|
| Weapons | 64 | ~285 | 82% unattested |
| Combat Traits | 0 | 106 | 100% unattested |
| Equipment/Items | 0 | ~50+ | 100% unattested |
| Folk Magic Spells | 62 | 8 | 11% unattested |

The 285 unattested weapons likely come from AiG equipment tables (p.48-58) or historical supplements, but no extraction has been done.

#### C. Mode Fidelity: The "Save Gap"

Two distinct save mechanisms exist with different behavior:
- `saveCharacter()` → `JSON.stringify(CharacterData)` → **includes everything** (works)
- `saveToLocalStorage()` / `toJSON()` → explicit field list → **excludes cult, miracles, devotionalPool, selectedProfessionalSkills**

Users hitting browser refresh mid-session lose theism data silently.

---

### MICRO: Field-Level Findings

#### Rules Conformance (26 PASS, 1 FAIL)

| Status | Rule | Detail |
|--------|------|--------|
| FAIL | Cult membership requirements | `selectCult()` assigns cult without checking if character has 5 cult skills at 50%+ |
| PASS | All characteristic formulas | 3d6 / 2d6+6, point-buy 75pts, min/max correct |
| PASS | All attribute calculations | AP, DM, XP Mod, Healing, Init, Luck, MP, Movement, HP per location |
| PASS | All skill base values | 22 standard + 33 professional match reference formulas |
| PASS | Skill point budgets | Culture 100, Career 100, Bonus age-dependent (100-300) |
| PASS | Folk Magic (ADR-001) | POW+CHA+30%, 3 from culture, 2 from career |
| PASS | Rune Affinities (AiG) | POW×2+30/20/10 |
| PASS | Devotional Pool (ADR-002) | POW/2 for initiates |
| PASS | Hit Locations | 7 locations, HP formulas match Core p.11 |

#### Mode Fidelity (Field Matrix)

| Field | Wizard | Play | PDF | JSON Save | JSON Load | Issue |
|-------|--------|------|-----|-----------|-----------|-------|
| cult | ✓ | ✓ | ✓ | **✗** | **✗** | CRITICAL: Lost on persist |
| miracles | ✓ | ✓ | ✓ | **✗** | **✗** | CRITICAL: Lost on persist |
| devotionalPool | ✓ | ✓ | ✓ | **✗** | **✗** | CRITICAL: Lost on persist |
| armor | ✓ | **✗** | Partial | ✓ | ✓ | HIGH: Not rendered in Play |
| selectedProfessionalSkills | ✓ | — | — | **✗** | **✗** | MEDIUM: Lost mid-wizard |
| homeland | ✓ | **✗** | ✓ | ✓ | ✓ | LOW: Missing from Play |
| miracle rune tags | ✓ | ✓ | **✗** | — | — | LOW: PDF lacks tags |

#### Data Attestation (ADR-003)

| Status | Data | Source |
|--------|------|--------|
| ✓ Full | Characteristics, Attributes, Standard Skills, Professional Skills | mythras-raw p.7-54 |
| ✓ Full | Cultures (8) | aig-raw p.26-41 |
| ✓ Full | Social Class, Age Table, Background Events | mythras-raw p.18-34 |
| ✓ Full | Special Effects (44) | mythras-raw p.96-101 |
| ✓ Full | Hit Locations, Damage Modifier Table | mythras-raw p.10-11 |
| ⚠ Partial | Weapons (64/349) | mythras-raw p.62-67 |
| ⚠ Partial | Folk Magic (62/70 match, 8 unattested) | mythras-raw p.122-130 |
| ⚠ Partial | Cults (94 present, miracles not propagated) | cults-raw + theism-miracles.json |
| ⚠ Partial | Careers (names attested, skill lists not extracted) | mythras-raw p.28 |
| ✗ None | Combat Traits (106) | No reference file |
| ✗ None | Equipment/Item Prices | No reference file |
| ✗ None | Weapon 2H Stats | No reference file |
| ✗ None | Disambiguation Lists | No reference file (per ADR-004 decisions) |
| ✗ None | Skill Descriptions | No reference file |
| ✗ None | Culture Builds | No reference file |
| ✗ None | Rune personality traits (33) | No cited source |

---

## Priority-Ordered Action Items

### P0 — Critical (Data Loss)

1. **Fix `toJSON()`/`fromJSON()`/`saveToLocalStorage()` to include `cult`, `miracles`, `devotionalPool`**
   - Impact: Users lose entire theism magic system on browser refresh
   - Fix: Add these 3 fields to the explicit serialization lists
   - Effort: ~5 lines of code

2. **Propagate `theism-miracles.json` into `CULTS_DATA[].miracles`**
   - Impact: The attestation chain exists but is disconnected at the final link
   - Fix: Either at build time (script) or runtime (lookup)
   - Effort: Medium (script exists in `scripts/extract-miracles.py`)

### P1 — High (Correctness)

3. **Fix armor display in Play Mode**
   - AP column is hardcoded to 0, never reads `CharacterData.armor`
   - PDF reads armor but uses wrong data shape

4. **Add `selectedProfessionalSkills` to localStorage persistence**
   - Mid-wizard browser refresh loses professional skill selections

5. **Add cult requirement validation (or explicit bypass with warning)**
   - Only rule that fails conformance check
   - Could be "soft" — warn but allow, since GM ultimately decides

### P2 — Attestation Gaps (Correctness Risk)

6. **Extract career skill assignments** → `references/mythras-raw/careers-detail.json`
   - 24 careers with skill lists have no dedicated reference extraction
   - Currently trusting the HTML data without verification path

7. **Extract remaining weapons** → `references/aig-raw/weapons-aig.json` or identify source
   - 285 weapons without attestation is a large unverified surface

8. **Extract combat traits** → `references/mythras-raw/combat-traits.json` or cite supplements
   - 106 entries, many from supplements (Mythic Constantinople, etc.)

9. **Create `references/folk-magic-reconciliation.json`**
   - Document which 8 "extra" spells come from (AiG? House rules?)
   - Document which 16 reference spells are intentionally excluded

### P3 — Polish

10. **Add `homeland` to Play Mode identity section**
11. **Add rune tags to PDF miracle export**
12. **Remove dead code at PDF line ~17281** (`CharacterData.runes` doesn't exist)
13. **Create reference files for Disambiguation Lists and Culture Native Language** (cite ADR-004 as source)

---

## Attestation Score Card

```
                        ATTESTED    UNATTESTED   CONFIDENCE
Calculations/Formulas:  26/27       1/27         96% ████████████████████░
Character Data (core):  8/8         0/8          100% █████████████████████
Character Data (magic): 3/5         2/5          60%  ████████████░░░░░░░░░
Weapons:                64/349      285/349      18%  ████░░░░░░░░░░░░░░░░░
Equipment:              0/50+       50+/50+      0%   ░░░░░░░░░░░░░░░░░░░░░
Combat Traits:          0/106       106/106      0%   ░░░░░░░░░░░░░░░░░░░░░
Folk Magic:             62/70       8/70         89%  ██████████████████░░░
Cults (structure):      94/94       0/94         100% █████████████████████
Cults (miracles):       0/94        94/94        0%   ░░░░░░░░░░░░░░░░░░░░░
Persistence:            19/24       5/24         79%  ████████████████░░░░░

OVERALL WEIGHTED:                                ~58%
```

---

## What "100% Verifiable" Requires

To reach full attestability:

1. Every data value in index.html traces to a `references/*.json` file with page citation
2. Every `references/*.json` cites its extraction method and source document
3. No "orphan" data exists (values in the app with no upstream reference)
4. The chargen produces characters that can be verified against the rules by checking each field against its attested formula/table
5. All modes (Wizard/Play/PDF/JSON) produce identical representations of the same character data

**Current state:** Items 4 and partially 3 are met. Items 1, 2, and 5 have the gaps documented above. The P0 fixes (persistence + miracles propagation) are the minimum to make the tool reliably produce verifiable characters.
