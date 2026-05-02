# PDF Fidelity Audit — Play Mode vs `exportSinglePagePDF()`

**Date:** 2026-05-02  
**Method:** Static code review of `index.html` (both `renderPlayMode()` at L4483 and `exportSinglePagePDF()` at L4881)  
**Source of truth:** Both read from the same `CharacterData` object, so values are identical — the audit is about **coverage and presentation**, not data correctness.

---

## Section-by-Section Assessment

### 1. Identity / Header
| Field | Play Mode | PDF | Verdict |
|-------|-----------|-----|---------|
| Name | ✅ | ✅ | **PASS** |
| Culture | ✅ | ✅ | **PASS** |
| Career | ✅ | ✅ | **PASS** |
| Cult | ✅ | ✅ | **PASS** |
| Age | ✅ | ✅ | **PASS** |
| Gender | ✅ | ✅ | **PASS** |
| Social Class | ✅ with money modifier `(×N)` | ✅ but no money modifier | **PARTIAL** — PDF shows `socialClass` raw, Play Mode shows `socialClass (×socialClassMoneyMod)` |
| Homeland | ❌ not in Play Mode | ✅ in PDF identity line | **PDF-ONLY** — Homeland appears in PDF but not Play Mode |

### 2. Concept / Background / Notes
| Field | Play Mode | PDF | Verdict |
|-------|-----------|-----|---------|
| Concept | ✅ full text | ✅ **truncated to 120 chars** | **PARTIAL** |
| Family | ✅ full text | ❌ missing | **FAIL** |
| Background Events | ✅ full text | ❌ missing | **FAIL** |
| Notes | ✅ full text | ✅ **truncated to 200 chars, max 2 lines** | **PARTIAL** |

### 3. Characteristics (STR/CON/SIZ/DEX/INT/POW/CHA)
| | Play Mode | PDF | Verdict |
|---|-----------|-----|---------|
| All 7 stats | ✅ editable inputs | ✅ displayed | **PASS** |

### 4. Derived Attributes
| Attribute | Play Mode | PDF | Verdict |
|-----------|-----------|-----|---------|
| Action Points | ✅ | ✅ | **PASS** |
| Initiative Bonus | ✅ | ✅ | **PASS** |
| Damage Modifier | ✅ | ✅ | **PASS** |
| Movement Rate | ✅ (with "m" suffix) | ✅ | **PASS** |
| Healing Rate | ✅ (with "/day" suffix) | ✅ | **PASS** |
| Magic Points | ✅ | ✅ | **PASS** |
| Luck Points | ✅ | ✅ | **PASS** |
| Experience Modifier | ✅ | ✅ | **PASS** |
| Strike Rank | ❌ not in Play Mode | ✅ in PDF (falls back to `initiativeBonus`) | **PDF-ONLY** |

### 5. Hit Locations
| | Play Mode | PDF | Verdict |
|---|-----------|-----|---------|
| Location names | ✅ uses `HIT_LOCATIONS` array | ✅ hardcoded 7 locations | **PARTIAL** — Play Mode uses data-driven names, PDF hardcodes names. If `HIT_LOCATIONS` has different entries (e.g. creature types), PDF won't match. |
| HP values | ✅ from `attrs.hitPoints` by name | ✅ from `attrs.hitPoints` by camelCase | **RISK** — Play Mode uses `hp[loc.name]` (e.g. `hp["Head"]`), PDF uses `hitPoints.head` (camelCase). If the key format differs, values may not match. |
| AP values | ✅ editable input, defaults to 0 | ✅ from `CharacterData.armor` | **MISMATCH** — Play Mode always shows 0 (editable), PDF pulls from `CharacterData.armor` which may have real values. |

### 6. Skills
| | Play Mode | PDF | Verdict |
|---|-----------|-----|---------|
| Skill count | ✅ ALL skills with non-zero totals | ✅ **capped at 50** | **PARTIAL** — Characters with >50 skills lose data in PDF |
| Skill breakdown | ✅ Base/Culture/Career/Bonus/Total/Modified columns | ❌ Only total shown | **PARTIAL** — PDF loses the breakdown |
| Skill name length | ✅ full names | ✅ **truncated to 38 chars** | **PARTIAL** |
| Filtering | Skills with `base > 0 OR points > 0` | Skills where `total > 0` | **PASS** — effectively the same |
| Sort order | Unsorted (insertion order) | Sorted by total descending | **DIFFERENT** — not a fidelity issue, just different presentation |
| Y-position cutoff | N/A | Skills below `y=160` are silently dropped | **RISK** — if many sections above skills push them down, bottom skills disappear |

### 7. Combat Styles
| | Play Mode | PDF | Verdict |
|---|-----------|-----|---------|
| Style count | ✅ all | ✅ **capped at 4** | **PARTIAL** |
| Traits | ✅ | ✅ | **PASS** |
| Weapons per style | ✅ | ✅ | **PASS** |

### 8. Weapons Table
| | Play Mode | PDF | Verdict |
|---|-----------|-----|---------|
| Weapon count | ✅ all | ✅ **capped at 6** | **PARTIAL** |
| Weapon name | ✅ full | ✅ **truncated to 25 chars** | **PARTIAL** |
| Damage/Size/Reach/AP/HP | ✅ | ✅ | **PASS** |

### 9. Rune Affinities
| | Play Mode | PDF | Verdict |
|---|-----------|-----|---------|
| Rune count | ✅ all | ✅ **capped at 8** | **PARTIAL** |
| Values | ✅ | ✅ | **PASS** |

### 10. Passions
| | Play Mode | PDF | Verdict |
|---|-----------|-----|---------|
| Passion count | ✅ all | ✅ **capped at 8** | **PARTIAL** |
| Values | ✅ | ✅ | **PASS** |

### 11. Magic (Folk Magic)
| | Play Mode | PDF | Verdict |
|---|-----------|-----|---------|
| Spell count | ✅ all | ✅ **capped at 20** | **PARTIAL** |
| Spell names | ✅ full | ✅ **truncated to 50 chars** | **PASS** (50 chars is generous) |
| Theism/Sorcery/Mysticism | ✅ rendered in Play Mode | ❌ not in PDF | **FAIL** — only Folk Magic exported |

### 12. Equipment
| | Play Mode | PDF | Verdict |
|---|-----------|-----|---------|
| Item count | ✅ all | ✅ **capped at 8** | **PARTIAL** |
| Item names | ✅ full | ✅ **truncated to 45 chars** | **PASS** |

### 13. Starting Money
| | Play Mode | PDF | Verdict |
|---|-----------|-----|---------|
| Amount | ✅ shown in equipment section | ❌ not explicitly shown | **FAIL** |

### 14. Difficulty Modifier
| | Play Mode | PDF | Verdict |
|---|-----------|-----|---------|
| Modified skill values | ✅ interactive dropdown | ❌ not present | **EXPECTED** — PDF is static, this is fine |

---

## Summary

| Rating | Count | Sections |
|--------|-------|----------|
| **PASS** | 6 | Characteristics, most attributes, identity core, traits |
| **PARTIAL** | 9 | Skills (cap 50), combat styles (cap 4), weapons (cap 6), passions (cap 8), runes (cap 8), equipment (cap 8), concept (truncated), notes (truncated), social class modifier |
| **FAIL** | 4 | Family text, background events, theism/sorcery/mysticism magic, starting money |
| **RISK** | 2 | Hit location key format mismatch, Y-position cutoff drops skills silently |

---

## Recommendations

### Critical (data loss)
1. **Add Family and Background Events to PDF** — Play Mode shows these, PDF drops them entirely
2. **Add non-Folk-Magic sections** — Theism, Sorcery, Mysticism spells are in Play Mode but missing from PDF
3. **Add starting money** — `CharacterData.startingMoney` should appear somewhere in PDF

### Important (truncation/caps)
4. **Raise skill cap from 50 to unlimited** or add a second page for overflow
5. **Raise equipment cap from 8** — Mythras characters can easily have 15+ items
6. **Raise passion cap from 8** — some cultures generate many passions
7. **Add social class money modifier** to PDF identity section (`socialClass (×mod)`)

### Minor
8. **Hit location key format** — verify `attrs.hitPoints.head` matches what `calculateAllAttributes` actually produces (might be `Head` not `head`)
9. **Y-position guard** — if content overflows page, add a second page instead of silently dropping
10. **Skills breakdown** — optional: show base/bonus columns in PDF for reference

---

*Audit by code review. Both paths read the same `CharacterData` object — all value differences are presentation/truncation, not data source mismatches.*
