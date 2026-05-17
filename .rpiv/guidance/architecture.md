# Architecture Guidance — mythras-chargen

## Overview

Single-page HTML application (`index.html`, ~19800 lines) implementing a Mythras TTRPG character generator for Glorantha. No build step, no framework — vanilla JS with inline `<script>` blocks. Served statically.

## Core Modules (all in index.html)

| Module | Lines (approx) | Responsibility |
|--------|----------------|----------------|
| Data Constants | 1–800 | `CULTS_DATA`, `CULTURES_DATA`, `CAREERS_DATA`, `FOLK_MAGIC_DESCRIPTIONS`, `SORCERY_SPELLS`, `MIRACLES_DATA` |
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

## ADR Index

| ADR | Topic | Key Decision |
|-----|-------|--------------|
| 001 | Magic System Architecture | Regex-based cult classification |
| 002 | Rune Affinity Casting Model | House rules for devotional pool |
| 003 | Attestable Data Chain | All data must trace to source PDF with page citation |
| 004 | Language-Homeland Mapping | Culture → homeland → language derivation |
| 005 | Placeholder Skill Disambiguation | How ambiguous skill names resolve |
| 006 | Full Magic System Coverage | Theist + animist + sorcery + mysticism support |

## File Layout

```
index.html          — The entire application
references/         — Source data (JSON) with attestation metadata
  aig-raw/          — Adventures in Glorantha extractions
  cults-raw/        — Per-cult JSON from Notes from Pavis PDFs
  cults-upstream/   — Original PDF sources (not committed to git)
  mythras-raw/      — Mythras Core rulebook extractions
  spirits-raw/      — Spirit data
fixtures/           — 24 character JSON files for regression testing
test-chargen.js     — 235 unit tests (Node.js, no browser needed)
test-agent-api.mjs  — E2E tests via playwright-cli
docs/adr/           — Architecture Decision Records
scripts/            — Extraction/processing scripts
templates/          — PDF export templates
```
