# Ionara/Vasana RQG Starter Set Conversion Refresh

Date: 2026-05-27
Decision: strict ADR-0015 chargen baseline (user selected this path via ask_user)

## Source material

- Source PDF: RQG Starter Set — Pregen Folios PDF.
- Vasana folio pages: PDF pages 1-2.
- Ionara folio pages: PDF pages 19-20.
- Source extraction used `pdftotext -layout` and audit subagents with github-copilot provider only.

## Conversion policy applied

- Ionara and Vasana remain RQG-inspired active pregens, but fixtures now follow strict ADR-0015 chargen state.
- Cult identity stays as future initiation path (`Orlanth` / `Maran Gor`).
- Cult-backed Rune magic is withheld at chargen:
  - `miracles: []`
  - `devotionalPool: 0`
- RQG folio Rune magic remains source evidence for future initiation, not active fixture/PDF magic.

## Fixture changes

### Vasana

- Removed active cult-backed miracles/devotional pool.
- Added folio weapon gap:
  - RQG `Battle Axe` represented by Mythras `Battleaxe`.
  - Added to `combatStyles[0].weapons` and `weapons` table.
- Updated carried money to folio coin value: `20` L.
- Added folio treasure/narrative items:
  - 10-point magic point storage crystal.
  - Bronze image of Orlanth (+10% Worship in RQG folio; retained as narrative item).
- Replaced flattened passion targets with the folio passion set, but reconciled all active values to the app's strict chargen passion value (`54`) so the fixture remains wizard-possible:
  - Devotion (Orlanth)
  - Hate (Lunar Empire)
  - Honor
  - Love (Family)
  - Loyalty (Argrath)
  - Loyalty (Colymar Tribe)
  - Loyalty (Ernaldori Clan)
  - Loyalty (Sartar)
- RQG folio values (80/90/70/60/70/70/60/70) are retained as source evidence only, not active fixture values.
- Added structured passion fields (`type`, `subject`, `description`, `custom: false`).

### Ionara

- Removed active cult-backed miracles/devotional pool.
- Updated carried money to folio coin value: `160` L.
- Added folio treasure/narrative items:
  - Finely made magical lyre (+20% Play Instrument in RQG folio; retained as narrative item).
  - Artifacts/regalia of Maran Gor and noble clothing.
  - Jewelry/vessels/luxury goods.
- Replaced flattened passion targets with the folio passion set, but reconciled all active values to the app's strict chargen passion value (`55`) so the fixture remains wizard-possible:
  - Devotion (Maran Gor)
  - Hate (Lunar Empire)
  - Hate (Old Tarshites)
  - Honor
  - Loyalty (Feathered Horse Queen)
  - Loyalty (Shaker Temple)
- RQG folio values (70/60/60/60/70/60) are retained as source evidence only, not active fixture values.
- Added structured passion fields (`type`, `subject`, `description`, `custom: false`).

## Known intentional conversion limits

- Characteristics remain strict 75-point Mythras rebuilds rather than copying RQG characteristic values.
- Skill allocations obey app step caps (no cultural/career/bonus allocation above 15 in either fixture).
- Passion targets follow the RQG folios, but active passion values are reconciled to app chargen formula values (Vasana 54, Ionara 55) rather than importing higher RQG folio percentages.
- Runes remain the app's compressed top-three affinity representation rather than full RQG rune grid.
- RQG Rune magic is not exported in active PDFs under strict ADR-0015.
- Vasana RQG spirit magic (`Demoralize`, `Heal 2`, `Mobility`) is reconciled in `references/folk-magic-reconciliation.json` under `vasana_rqg_spirit_magic_mapping`: Heal is present; Demoralise and Mobility are withheld under strict ADR-0015 until cult/GM advancement.
- CSE gaps remain for custom combat styles (`Grazelander Noble`, `Colymar Bison Cavalry`) and are formalized as source-blocked exceptions in `references/combat-style-exceptions.json`.

## Follow-up resolution

- `mythras-chargen-m1rv`: resolved by adding `references/combat-style-exceptions.json`, fixture combat-style citation blocks, and tests requiring custom active pregen styles to be exception-backed.
- `mythras-chargen-cdm8`: resolved by adding `vasana_rqg_spirit_magic_mapping` to `references/folk-magic-reconciliation.json`, expanding Vasana notes, and adding regression tests that Demoralise/Mobility stay withheld.
- `mythras-chargen-27nk`: resolved by asserting wizard-possible skill allocations (no step allocation above 15) and reconciling active passion values to app chargen formulas (Vasana 54; Ionara 55) rather than importing higher RQG percentages.
- `docs/adr/ADR-0015-strict-pregen-chargen-baseline.md` records the strict pregen chargen decision.

## PDF refresh

Generated via `agent-browser` from current fixtures and Play Mode export:

- `generated-pdfs/Ionara-Grand-daughter-of-Thiralda.pdf`
- `generated-pdfs/Vasana-Farnans-Daughter.pdf`

PDF text spot-checks:

- Ionara PDF contains `COMPANION: Teza (Riding Horse)`, strict passion values (`55%`), and no `THEIST MIRACLES` section.
- Vasana PDF contains `Battleaxe`, `COMPANION: Molon (Bison (War-trained))`, strict passion values (`54%`), and no `THEIST MIRACLES` section.

## Copyparty sync

Synced refreshed active PDFs to:

- `/w/characters/active-pregens/Ionara-Grand-daughter-of-Thiralda.pdf`
- `/w/characters/active-pregens/Vasana-Farnans-Daughter.pdf`

Remote container verification:

```text
-rw-r--r--    1 root     root        6.7K May 27 12:07 /w/characters/active-pregens/Ionara-Grand-daughter-of-Thiralda.pdf
-rw-r--r--    1 root     root        7.1K May 27 12:07 /w/characters/active-pregens/Vasana-Farnans-Daughter.pdf
```

Public fetch verification at 2026-05-27 12:07 local time:

- `https://copyparty.hound-celsius.ts.net/characters/active-pregens/Ionara-Grand-daughter-of-Thiralda.pdf` fetched successfully.
- `https://copyparty.hound-celsius.ts.net/characters/active-pregens/Vasana-Farnans-Daughter.pdf` fetched successfully.

Refresh re-run for ADR-0015 Step 9 regression fix on 2026-05-28:

- Regenerated current fixture PDFs from `App.exportSinglePagePDF()`.
- Ionara local PDF size: 6.7K; text contains `COMPANION: Teza (Riding Horse)`, strict `55%` values, and no `THEIST MIRACLES` section.
- Vasana local PDF size: 7.2K; text contains `Battleaxe`, `COMPANION: Molon (Bison (War-trained))`, strict `54%` values, and no `THEIST MIRACLES` section.
- Copyparty sync and public URL verification are recorded in `verification-artifacts/adr0015-qa/2026-05-28-step9-regression-final.md`.

## Gates

- `node test-chargen.js`: 626/626 after ADR-0015 Step 9 regression restoration, fixture/test updates, companion provenance coverage, combat-style exception coverage, Vasana RQG spirit-magic reconciliation coverage, and wizard-possible passion/cap checks.
- `node test-agent-api.mjs`: 139/139.
- `./scripts/ingest-cults.py --validate`: clean.
- `node scripts/validate_provenance.js`: passed.
- `decapod validate`: attempted. Direct worktree run is blocked by Decapod trying to overwrite existing `AGENTS.md`; temporary removal of generated agent-doc files reaches validation gates but still reports `container_workspace_required`, dirty-file-count before commit, and pre-existing unrelated claimed TODO proof-hook failures. This blocker is in Decapod governance state, not app/runtime evidence.
