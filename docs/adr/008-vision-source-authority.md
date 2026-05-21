# ADR-008: Vision-Verified Source Authority for Listed External Data

**Status:** accepted
**Date:** 2026-05-21
**Deciders:** Kypris
**Requirement source:** `docs/plans/2026-05-21-001-feat-verified-extraction-attestation-plan.md` (U1, R3, R15)
**Amends:** ADR-003 for listed external-source committed data

## Context

ADR-003 established the project's core attestable data chain: source material is transformed into `references/*.json`, then mirrored into inline constants in `index.html`, then rendered in the UI. That chain remains correct and important, but ADR-003 also allowed `pdftotext`/OCR extraction and `UNVERIFIED` placeholders as intermediate committed records when human review was incomplete.

The verified extraction plan tightens that authority model for listed external sources whose data is being rewritten or newly governed: Adventures in Glorantha (AiG), Combat Style Encyclopedia (CSE), the current Waha one-pager, A Bird in the Hand, and Monster Island. Prior learnings show that OCR/text-layer extraction and LLM-assisted cleanup can introduce fabricated or garbled rules data while still looking plausible. Future agents need one unambiguous rule before schemas, manifests, source batches, or validators are implemented.

## Decision Drivers

- App-facing game facts must remain traceable through `references/` to source/page evidence.
- Listed source data is campaign-critical and has known OCR/LLM-era integrity risks.
- Source PDFs and rendered pages must stay out of git, while committed records stay portable and reviewable.
- `index.html` remains a single-file app with inline constants; authority improves through provenance validation, not runtime JSON loading.
- Repository workflow uses Beads for task tracking and Decapod worktrees/validation for implementation proof.

## Considered Options

### Option 1: Keep ADR-003 unchanged

Continue allowing `pdftotext`, OCR, pdfplumber, or table/text-layer extraction as the committed evidence source when manually reviewed.

- Good, because it preserves existing scripts and historical workflow language.
- Good, because text extraction is fast for bulk source review.
- Bad, because it leaves future agents with contradictory guidance against the verified extraction plan.
- Bad, because manually reviewed OCR/text output can still carry garbled rune prefixes, missing table structure, or plausible fabricated facts into committed JSON.

### Option 2: Replace ADR-003 entirely

Rewrite ADR-003 so every game-data source now uses the stricter vision-only workflow.

- Good, because readers would find one current source authority rule.
- Bad, because ADR-003 is useful history for the original data-chain decision.
- Bad, because not every legacy source is classified or migrated by the verified extraction plan.
- Bad, because a blanket replacement could accidentally make unrelated legacy data fail before it has a disposition.

### Option 3: Add ADR-008 as a targeted amendment *(chosen)*

Keep ADR-003 as the baseline attestable-chain decision, but supersede its extraction-authority rule for listed external-source committed data governed by the verified extraction plan.

- Good, because it preserves ADR-003's historical context and still removes ambiguity for governed sources.
- Good, because it limits the stricter gate to sources and facts intentionally brought under the verified extraction plan.
- Good, because it gives later schema/validator work a clear authority rule without forcing a full legacy migration in this documentation unit.
- Bad, because readers must understand that ADR-003 and ADR-008 work together.

## Decision

Chosen option: **Add ADR-008 as a targeted amendment**.

For AiG, CSE, the current Waha one-pager, A Bird in the Hand, Monster Island, and any later source explicitly classified as governed by this ADR, committed source-authority and app-facing facts must be derived from rendered page/image evidence and independently verified against that page evidence before promotion into normalized `references/*.json` or inline `index.html` constants.

For those governed sources:

1. `pdftotext`, OCR, pdfplumber, text-layer extraction, and table extraction may be used only as scratch aids or comparison signals. They are not acceptable committed evidence authority.
2. Committed evidence must identify the source, source revision, page, page/render basis, and enough bounded page/block information for independent re-verification without committing full-page transcriptions.
3. Unresolved `UNVERIFIED` placeholders, OCR artifacts, garbled rune prefixes, and invalid missingness values are not acceptable in committed governed source data or app-facing facts.
4. Source PDFs and rendered page images stay out of git. Portable manifests, page/evidence records, normalized JSON, and provenance maps are the committed authority surfaces.
5. The core chain remains `source artifact -> references/*.json -> inline constant -> UI`; this ADR changes the accepted evidence authority for listed sources, not the single-file app architecture.

Workflow authority is also explicit: Beads (`bd ...`) owns task tracking in this repository, while Decapod worktrees and validation gates remain required proof surfaces. New implementation work should not create or claim `decapod todo ...` items when equivalent Beads operations apply.

## Consequences

### Positive

- Future extraction work has one clear rule: listed external-source committed facts require vision/page verification, not text-layer authority.
- ADR-003's baseline data-chain context remains available without silently endorsing stale OCR-era rules for governed sources.
- Validators and schemas can fail closed for governed source data while legacy sources are inventoried and classified separately.
- The single-file app architecture remains intact; provenance proof surrounds inline constants instead of replacing them.

### Negative

- Extraction is slower and requires explicit render/page evidence plus independent verification before promotion.
- Existing text-extraction scripts cannot be used as direct committed authority for governed sources, even when their output looks accurate.
- Reviewers must check both ADR-003 and ADR-008 when deciding whether an older source is governed by the stricter rule.

### Neutral

- Text-layer tools may still be useful for discovery, diffing, or reviewer hints, but their output must not be the committed evidence source.
- Legacy data outside the listed governed sources needs explicit disposition before the stricter rule is applied to it.

## Related

- **Plan**: `docs/plans/2026-05-21-001-feat-verified-extraction-attestation-plan.md`
- **ADRs**: Amends `docs/adr/003-attestable-data-chain.md`; relates to `docs/adr/ADR-0006-full-magic-system-coverage.md` and `docs/adr/ADR-0007-hannu-house-rules.md`
- **Workflow**: `.decapod/OVERRIDE.md` Beads workflow and data attestability sections

## Attestation

| Claim | Source |
|-------|--------|
| Listed governed sources require vision-only committed evidence | Verified extraction plan R3, U1 |
| App-facing facts must map to committed source JSON and source/page/block provenance | Verified extraction plan R14 |
| Beads is task-tracking authority and Decapod todo operations are superseded by `bd ...` | `.decapod/OVERRIDE.md` Beads workflow |
| Baseline source-to-reference-to-inline chain remains required | ADR-003 and `.decapod/OVERRIDE.md` Data attestability |
