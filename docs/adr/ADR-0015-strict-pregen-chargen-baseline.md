---
title: "Strict Pregen Chargen Baseline"
adr: ADR-0015
status: Accepted
date: 2026-05-27
prd: "N/A"
decision: "Treat active RQG Starter Set pregens as strict chargen fixtures with cult affiliation only; no cult-backed miracles or devotional pool at fixture/PDF generation time"
---

# ADR-0015: Strict Pregen Chargen Baseline

## Status

Accepted

## Date

2026-05-27

## Requirement Source

* **PRD**: N/A
* **Beads**: `mythras-chargen-7030`, `mythras-chargen-oddo`, `mythras-chargen-paxs`, `mythras-chargen-m1rv`, `mythras-chargen-cdm8`
* **Decision Point**: User explicitly selected strict ADR-0015 chargen baseline over initiated-pregen exceptions when asked whether Ionara and Vasana should retain RQG Starter Set initiation/Rune magic or be converted to the generator's future-initiation model.
* **Evidence Artifact**: `verification-artifacts/pregen-refresh/ionara-vasana-strict-adr0015-audit.md`

## Context

The RQG Starter Set pregen folios present characters such as Vasana and Ionara as already-initiated characters with Rune points, Rune magic, and spirit magic. The Mythras chargen application now uses a stricter chargen model: cult selection in the wizard records future initiation intent/affiliation rather than granting cult-backed magic immediately.

Before this decision, active pregen fixtures could drift between two incompatible meanings:

1. **Imported initiated character**: faithful to RQG folio state, including Rune magic/Rune points.
2. **Strict chargen fixture**: faithful to this generator's Step 9 model, with cult affiliation but no cult-backed magic until later initiation.

The same PDF export and remote active pregen paths are used by players, so fixture semantics must be unambiguous.

## Decision Drivers

* Keep generated active-pregen PDFs consistent with the normal wizard/chargen rules.
* Avoid granting cult-backed miracles or devotional resources before the character has completed initiation in the Mythras flow.
* Preserve RQG folio identity, passions, mounts, gear notes, and source evidence without importing RQG Rune point mechanics into initial Mythras chargen state.
* Make future pregen refreshes testable: fixtures must state whether they are strict chargen records or post-initiation imports.

## Considered Options

### Option 1: Keep Ionara and Vasana as initiated pregen exceptions

* Good, because it directly matches the RQG Starter Set folios.
* Good, because it preserves Rune magic/Rune point identity from the source sheets.
* Bad, because active generated PDFs would diverge from the generator's normal cult-selection rules.
* Bad, because exceptions would need additional UI/PDF language to explain why these pregens start with magic that new characters cannot choose.
* Bad, because downstream tests would need to distinguish imported initiated pregens from chargen output.

### Option 2: Convert active pregens to strict chargen baseline

* Good, because active pregens and normal generated characters follow one Step 9 rule.
* Good, because no fixture or PDF grants cult-backed miracles at chargen.
* Good, because RQG folio magic remains documented as future-initiation/GM conversion evidence rather than being discarded.
* Bad, because generated PDFs are not exact replicas of the RQG folios' initiated magic state.
* Bad, because conversion artifacts must clearly document the intentional omission of RQG Rune magic/spirit magic.

## Decision

Adopt **Option 2: strict chargen baseline** for active pregen fixtures and generated active PDFs.

For Ionara, Vasana, and any future active pregen intended to pass through the normal wizard/Play/PDF flow:

* Keep `cult` as affiliation/future initiation path.
* Set `miracles` to an empty array unless a fixture is explicitly classified as post-initiation/import-only.
* Set `devotionalPool` to `0` unless a fixture is explicitly classified as post-initiation/import-only.
* Preserve RQG folio Rune magic/spirit magic in notes, conversion artifacts, or future-initiation displays rather than as active chargen magic.
* Preserve RQG folio passion targets, but reconcile active passion values to the app's chargen formula (`POW + CHA + 30`) so fixtures remain wizard-possible.
* Use the rich structured passion shape for source-faithful active pregens: `name`, `type`, `subject`, `description`, `value`, `custom`, `needsSubject`, and `subjectSuggestions`. Older sparse fixtures remain import-compatible, but new active pregens should use the rich shape.
* Treat source-backed but unavailable folio combat styles as `source_blocked` pregen exceptions, not CSE promotions.

## Consequences

* Active pregen PDF exports no longer display `THEIST MIRACLES (...)` for Ionara or Vasana.
* The fixture tests assert that Ionara and Vasana have no cult-backed miracles/devotional pool at chargen.
* RQG folio spell lists remain useful conversion evidence but do not override current Mythras app availability rules.
* Any future initiated imported fixture must declare that status explicitly and must not be confused with active chargen pregens.

## Validation

* `test-chargen.js` asserts strict no-cult-backed-magic state for active pregens.
* `test-chargen.js` asserts active pregen custom combat styles are either CSE-backed or documented in `references/combat-style-exceptions.json`.
* `test-chargen.js` asserts Vasana's RQG spirit magic reconciliation mapping exists and that withheld spells are not silently activated.
* `test-agent-api.mjs` remains the API regression gate when fixture/magic behavior changes.

## Related Artifacts

* `fixtures/ionara.json`
* `fixtures/vasana.json`
* `references/combat-style-exceptions.json`
* `references/folk-magic-reconciliation.json`
* `verification-artifacts/pregen-refresh/ionara-vasana-strict-adr0015-audit.md`
