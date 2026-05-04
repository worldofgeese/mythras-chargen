# Attestation Ledger

**Date:** 2026-05-04
**Scope:** Data Fidelity Hardening implementation

## Field Attestations

| Output Field | Rule/Data Source | Precedence | Code Path | Tests | Type | Wizard | Play | JSON | PDF |
|---|---|---|---|---|---|---|---|---|---|
| Native Language | ADR-004 + AiG p.26-41 | Primary | CULTURE_NATIVE_LANGUAGE → autoPopulateStartingEquipment:16127 | 200-char test | Canonical | ✓ | ✓ | ✓ | ✓ |
| Tradetalk (non-primitive) | ADR-004 | Primary | generateRandomCharacter:16132 | 200-char test | Canonical | ✓ | ✓ | ✓ | ✓ |
| Folk Magic (culture) | AiG p.26-41 | Primary | CULTURES_DATA[].folkMagic | 200-char test | Canonical | ✓ | ✓ | ✓ | ✓ |
| Folk Magic (master list) | Mythras Core + AiG | Primary+Secondary | FOLK_MAGIC_SPELLS:17304 | Alphabetical sort | Canonical | ✓ | ✓ | ✓ | ✓ |
| Combat Style Weapons | AiG p.26-41 | Primary | CULTURES_DATA[].combatStyles[].weapons | No "or" test | Canonical | ✓ | ✓ | ✓ | ✓ |
| Armour AP Cap | AiG p.26-41 | Primary | CULTURE_ARMOUR → autoPopulateStartingEquipment:16559 | 100-char AP check | Canonical | ✓ | ✓ | ✓ | ✓ |
| Weapon Tech Level | AiG p.26-41 | Primary | CULTURE_WEAPON_POOLS + CULTURE_TECH_TYPE | 50 Balazaring test | Derived | ✓ | ✓ | ✓ | ✓ |
| Cult Skills | Notes from Pavis | Supplementary | CULTS_DATA[].cultSkills (post-OCR-clean) | cleanCultsData() | Canonical | ✓ | ✓ | ✓ | ✓ |
| Cult Folk Magic | Notes from Pavis | Supplementary | CULTS_DATA[].folkMagic (post-OCR-clean) | cleanCultsData() | Canonical | ✓ | ✓ | ✓ | ✓ |
| Devotion (Cult) | Mythras Core p.28 | Primary | selectCult:15415 / generateRandomCharacter:16290 | Cult resolution test | Derived | ✓ | ✓ | ✓ | ✓ |
| Binding (Cult) | Mythras Core p.28 | Primary | selectCult:15415 / generateRandomCharacter:16290 | Cult resolution test | Derived | ✓ | ✓ | ✓ | ✓ |
| Invocation (Cult) | Mythras Core p.28 | Primary | selectCult:15415 / generateRandomCharacter:16290 | Cult resolution test | Derived | ✓ | ✓ | ✓ | ✓ |
| Disambiguation (any) | ADR-004 | Architecture | disambiguateSkill:1025 | 200-char test | User-selected | ✓ | ✓ | ✓ | ✓ |
| Disambiguation (placeholder) | ADR-005 | Architecture | parsePlaceholderSkill:1089 | 200-char test | User-selected | ✓ | ✓ | ✓ | ✓ |
| Load validation | Design decision | Architecture | validateLoadedData:13990 | playwright-cli test | Guard | ✓ | N/A | ✓ | N/A |

## Legend

- **Precedence**: Primary = AiG/Mythras Core, Supplementary = Notes from Pavis, Architecture = ADR
- **Type**: Canonical = directly from source, Derived = computed from source data, User-selected = player choice, Guard = validation only
- **✓** = verified present and consistent in this representation

## House Rule Overrides

| Override | Source | ADR | Rationale |
|----------|--------|-----|-----------|
| Rune Affinity casting model | Hannu (Notes from Pavis, Discord 2026-03-29) | ADR-002 | AiG uses POW-based devotional pool; Hannu's house rules refine casting mechanics |
| No sorcery/mysticism/animism | AiG missing chapters + design decision | ADR-001 | AiG GenCon 2015 preview never published these chapters |
| Language (Tarshite) for Lunar Provincial | AiG p.31 context + design decision | ADR-004 | "Local" is ambiguous; Tarshites are the provincial population |

## Unattested Data (Known Gaps)

| Data | Gap | Risk | Mitigation |
|------|-----|------|-----------|
| Combat Traits (106) | 0% source page citations | Low | Functional data present; mechanics match Mythras Core descriptions |
| Weapons (285/349) | 18% unattested | Low | Core weapons all attested; gap is in obscure/variant weapons |
| Theism Miracles | Pipeline broken | High | CULTS_DATA[].miracles empty; separate initiative needed |
| Gorgorma cult data | OCR garbage | Low | Cleaned to minimal state; needs manual re-extraction |
