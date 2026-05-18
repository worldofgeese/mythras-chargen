# Architecture Guidance — mythras-chargen

## Overview

Single-page HTML application (`index.html`, ~19800 lines) implementing a Mythras TTRPG character generator for Glorantha. No build step, no framework — vanilla JS with inline `<script>` blocks. Served statically.

## Core Modules (all in index.html)

| Module | Lines (approx) | Responsibility |
|--------|----------------|----------------|
| Data Constants | 1–800 | `CULTS_DATA`, `CULTURES_DATA`, `CAREERS_DATA`, `FOLK_MAGIC_DESCRIPTIONS`, `SORCERY_SPELLS`, `STARTING_SPIRITS`, `MIRACLES_DATA` |
| Cult Type Detection | 830–870 | `detectCultType()` — classifies cults by magic system |
| Wizard Steps | 900–15400 | `App.renderStep1()` through `App.renderStep12()` |
| Toggle Functions | 15444–15800 | `App.toggleFolkMagicSpell()`, `App.toggleSorcerySpell()`, `App.toggleBoundSpirit()` |
| Agent API | 19050–19770 | `App.agent.*` — programmatic character building |
| Initialization | 19770–end | `DOMContentLoaded` → `App.init()` |

## State Model

All mutable state lives in the global `CharacterData` object. Wizard steps read/write fields on it. `App.saveToLocalStorage()` persists after every mutation.

Key fields:
- `characteristics` — {STR, CON, SIZ, DEX, INT, POW, CHA} (sum must equal 75)
- `culture`, `career`, `cult` — string names referencing data arrays
- `culturalSkills`, `careerSkills`, `bonusSkills` — {skillName: points} maps
- `miracles[]`, `sorcerySpells[]`, `boundSpirits[]` — magic selections
- `folkMagicSpells[]`, `careerFolkMagic[]` — folk magic selections
- `passions[]`, `combatStyles[]` — narrative/combat choices

## Key Patterns

### 1. Wizard Step Pattern
Each step is a function `App.renderStepN()` that builds DOM, attaches event handlers, and reads/writes `CharacterData`. Steps are navigated via `App.currentStep` and `App.renderCurrentStep()`.

### 2. Data-Driven Rendering
UI is generated from data constants. Cultures, careers, cults, spells — all rendered from arrays/objects. No hardcoded UI per cult.

### 3. Validation Layer
`App.getValidationState()` checks constraints (characteristic sum, skill point totals). The Agent API calls this before applying changes.

### 4. LocalStorage Persistence
Every state mutation calls `App.saveToLocalStorage()`. Page reload restores state. No server.

### 5. Data Attestability (ADR-003)
All game data must trace to a source PDF with page citation. Reference JSONs in `references/` are the single source of truth. Data flows: PDF → reference JSON → inline constant → UI. Never edit inline constants without updating the reference JSON.

## ADR Index

| ADR | Topic | Key Decision |
|-----|-------|--------------|
| 001 | Magic System Architecture | Regex-based cult classification |
| 002 | Rune Affinity Casting Model | House rules for devotional pool |
| 003 | Attestable Data Chain | All data must trace to source PDF with page citation |
| 004 | Language-Homeland Mapping | Culture → homeland → language derivation |
| 005 | Placeholder Skill Disambiguation | How ambiguous skill names resolve |
| 006 | Full Magic System Coverage | Theist + animist + sorcery + mysticism support |
| 007 | Hannu House Rules | Rune casting, devotional pool, rank progression, spell categories |

## File Layout

```
index.html          — The entire application (~19800 lines)
references/         — Source data (JSON) with attestation metadata
  aig-raw/          — Adventures in Glorantha extractions (folk magic, rune magic)
  cults-raw/        — Per-cult JSON from Notes from Pavis PDFs (94 cults)
  cults-upstream/   — Original PDF sources (not committed to git)
  mythras-raw/      — Mythras Core rulebook extractions (sorcery, animism, mysticism)
  spirits-raw/      — Spirit data (Bird in Hand, Monster Island)
fixtures/           — 24 character JSON files for regression testing
test-chargen.js     — 235 unit tests (Node.js, no browser needed)
test-agent-api.mjs  — E2E tests via playwright-cli
docs/adr/           — Architecture Decision Records (ADR-001 through ADR-0007)
docs/handouts/      — Progressive learning handouts (combat, magic, combined paths)
docs/plans/         — Implementation plans
docs/solutions/     — Documented learnings
docs/screenshots/   — Demo screenshots
scripts/            — Extraction/processing scripts
templates/          — PDF export templates
.rpiv/guidance/     — Architecture guidance docs (this directory)
.rpiv/test-cases/   — QA test case outlines
```

## Magic Systems Supported

All 5 Mythras magic systems are implemented:
1. **Folk Magic** — 45 spells from AiG, tooltips with descriptions
2. **Theism (Rune Magic)** — Miracle picker with rune-affinity highlighting, devotional pool
3. **Animism** — Spirit picker with 14 templates, CHA/2 binding limit (Core p.136)
4. **Sorcery** — 53 spells from Mythras Core p.166-177, 3 starting spells (Dedicated rank)
5. **Mysticism** — Implemented in code but no cult data triggers it (awaiting Hannu's data)

See `magic-system.md` for detailed architecture of detection, pickers, and formulas.
