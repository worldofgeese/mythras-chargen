# ADR-0015 Step 9 Regression Final QA — 2026-05-28

## Scope

Regression check after current `main` reintroduced Step 9 Quick Boost and initiate miracle selection.

Required behavior:

- Step 9 cult selection is affiliation/future initiation only.
- No Quick Boost UI/copy/functions.
- No cult-backed miracles or Devotional Pool during normal chargen.
- Source-backed non-cult magic remains available.
- Play Mode/PDF exports for active pregens remain strict ADR-0015 baseline.

## Browser QA

Local server:

```bash
python3 -m http.server 8765 --directory .
```

Agent-browser evidence:

- `verification-artifacts/adr0015-qa/step9-initial.png`
- `verification-artifacts/adr0015-qa/step9-orlanth-affiliation.png`
- `verification-artifacts/adr0015-qa/play-mode-no-cult-miracles.png`

Observed via human-style Step 9 navigation/action path:

```json
{
  "step": {
    "hasQuickBoost": false,
    "hasMiracleRequirement": false,
    "cultInitiated": false,
    "devotionalPool": 0,
    "selectedMiracles": [],
    "errors": []
  },
  "play": {
    "mode": "play",
    "cultInitiated": false,
    "devotionalPool": 0,
    "selectedMiracles": []
  }
}
```

## Active pregen PDFs

Generated current fixture exports with `agent-browser` and `App.exportSinglePagePDF()` into:

- `generated-pdfs/Ionara-Grand-daughter-of-Thiralda.pdf` — 6.7K
- `generated-pdfs/Vasana-Farnans-Daughter.pdf` — 7.2K

PDF text spot-checks:

- Ionara: contains `COMPANION: Teza (Riding Horse)`, strict `55%` passion values, and no `THEIST MIRACLES` section.
- Vasana: contains `Battleaxe`, `COMPANION: Molon (Bison (War-trained))`, strict `54%` passion values, and no `THEIST MIRACLES` section.

## Copyparty sync

Synced at 2026-05-28 00:17 local time:

- `index.html` → `/w/01-Character-Generator.html` (1.5M)
- `docs/handouts/index.html` → `/w/00-START-HERE.html` and `/w/rules/handouts/index.html` (6.6K)
- `docs/handouts/combined-path.html` → `/w/rules/handouts/combined-path.html` (7.3K)
- `docs/handouts/prep-checklist.html` → `/w/rules/handouts/prep-checklist.html` (5.7K)
- Ionara PDF → `/w/characters/active-pregens/Ionara-Grand-daughter-of-Thiralda.pdf` (6.7K)
- Vasana PDF → `/w/characters/active-pregens/Vasana-Farnans-Daughter.pdf` (7.1K)

Public URL verification succeeded via `fetch_content` response `mpon4y5zsf33t1` after final root rebase/push and re-sync at 2026-05-28 00:33 local time for:

- `https://copyparty.hound-celsius.ts.net/01-Character-Generator.html`
- `https://copyparty.hound-celsius.ts.net/00-START-HERE.html`
- `https://copyparty.hound-celsius.ts.net/rules/handouts/combined-path.html`
- `https://copyparty.hound-celsius.ts.net/rules/handouts/prep-checklist.html`
- `https://copyparty.hound-celsius.ts.net/characters/active-pregens/Ionara-Grand-daughter-of-Thiralda.pdf`
- `https://copyparty.hound-celsius.ts.net/characters/active-pregens/Vasana-Farnans-Daughter.pdf`

## Gates

- `node scripts/validate_provenance.js`: passed.
- `node test-chargen.js`: 626/626.
- `node test-agent-api.mjs`: 139/139.
- `./scripts/ingest-cults.py --validate`: clean.
- `decapod validate`: after deleting generated entrypoint files for Decapod overwrite, validation reaches gate execution but still reports Decapod governance/workspace issues: not isolated git worktree/container workspace and dirty-file-count before commit.

## Review

Final review passes:

- `ce-correctness-reviewer`: APPROVE.
- `ce-agent-native-reviewer`: APPROVE after characteristic higher-magic recompute fix.
- `ce-maintainability-reviewer`: no remaining P1/P2 findings after assertion-bypass removal.
- `ce-project-standards-reviewer`: no remaining findings after handout and entrypoint fixes.
