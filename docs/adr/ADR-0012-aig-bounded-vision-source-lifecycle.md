---
title: "AiG Bounded Vision Source Lifecycle"
adr: ADR-0012
status: Accepted
date: 2026-05-22
prd: "N/A"
decision: "Treat the Copyparty-visible Adventures in Glorantha PDF as active for bounded vision evidence while keeping app-facing promotion gated by independent verification"
---

# ADR-0012: AiG Bounded Vision Source Lifecycle

## Status

Accepted

## Date

2026-05-22

## Requirement Source

- **PRD**: N/A
- **Plan**: `docs/plans/2026-05-21-001-feat-verified-extraction-attestation-plan.md`
- **Bead**: `mythras-chargen-s7c1.2`
- **Decision Point**: AiG source authority work could hydrate the source PDF from Copyparty and verify its manifest hash, size, and page count, but `references/sources/manifest.json` still marked AiG as `permission_pending`, causing `scripts/render_source_pages.py` to refuse rendering.

## Context

ADR-008 requires committed source-authority facts for Adventures in Glorantha (AiG) to come from rendered page/image evidence plus independent verification, not OCR or text-layer extraction. ADR-0009 records that source PDFs and rendered page images stay out of git, while manifest source revisions, hashes, page counts, and lifecycle states define canonical source identity.

The AiG source revision is already portable and verifiable in `references/sources/manifest.json`: the Copyparty locator returns the expected PDF, the ignored local hint `references/sources/pdfs/aig.pdf` can be hydrated from that locator, and the local file was verified against the manifest SHA-256, byte size, and 212-page count. However, the manifest lifecycle still says `permission_pending`. The renderer is intentionally fail-closed for pending sources, so no bounded page evidence can be created even though the PDF is available through the same player-visible Copyparty source library used by other governed sources.

The project needs a narrow lifecycle decision: whether Copyparty-visible AiG may be treated as active for the purpose of rendering pages and committing bounded vision evidence, while continuing to prevent unverified or unpromoted facts from entering normalized app data.

## Decision Drivers

- Preserve ADR-008's requirement that AiG committed source facts be image/vision verified before promotion.
- Preserve ADR-0009's rule that source PDFs and rendered page images remain uncommitted and that source revision metadata is the authority.
- Allow Beads work under `mythras-chargen-s7c1` to progress from source availability into bounded page evidence.
- Avoid using `permission_pending` as a stale blocker once the project has deliberately mirrored the source in the player-visible Copyparty source library.
- Keep app-facing data promotion separate from source rendering and evidence creation.
- Keep validators fail-closed: active source lifecycle enables rendering/evidence, not automatic acceptance of raw facts or inline constants.

## Considered Options

### Option 1: Keep AiG `permission_pending`

Leave AiG in `permission_pending` until a separate external permission artifact is recorded.

- Good, because it is maximally conservative about source lifecycle changes.
- Good, because it requires no manifest migration.
- Bad, because ADR-008 cannot be satisfied for AiG: the renderer refuses pending sources, so no bounded vision evidence can be generated.
- Bad, because source availability has already been resolved through Copyparty and manifest hash verification, leaving `s7c1` blocked on a policy state rather than a missing artifact.
- Bad, because agents may be tempted to fall back to legacy OCR-era `references/aig-raw/*` data, which ADR-008 explicitly disallows as committed authority for governed AiG facts.

### Option 2: Mark AiG active for all app-facing authority

Promote AiG directly to an active, app-facing authority source and allow existing raw records to be treated as accepted.

- Good, because it would unblock downstream implementation quickly.
- Good, because it reflects that the PDF is available and hash-verified.
- Bad, because it collapses source lifecycle, evidence verification, normalization, provenance, and app promotion into one step.
- Bad, because existing AiG raw records include legacy extraction surfaces that are not yet backed by ADR-008 independent vision evidence.
- Bad, because it could allow Step 9, culture, or magic facts to pass as governed app data before page/block evidence exists.

### Option 3: Mark AiG active for bounded vision evidence only

Treat the Copyparty-visible, hash-verified AiG PDF as an active source revision for rendering pages and committing bounded extraction/verification artifacts, while leaving normalized fact promotion and app-facing authority gated by evidence state, provenance validation, and explicit follow-up Beads.

- Good, because it unblocks ADR-008-compliant rendering and page evidence.
- Good, because it preserves source-PDF and rendered-image hygiene: PDFs/PNGs remain ignored and uncommitted.
- Good, because app-facing promotion still requires independent verification, normalized reference updates, provenance mapping, and tests.
- Good, because it makes the manifest lifecycle match the practical source state already used by Copyparty.
- Bad, because the term `active` can be misread as "accepted for app data"; validators and notes must keep the evidence-only boundary explicit.
- Bad, because agents still need to avoid over-broad all-page extraction when a smaller bounded evidence slice is sufficient for the current decision.

## Decision

Chosen option: **Mark AiG active for bounded vision evidence only**, because it is the smallest lifecycle change that permits ADR-008-compliant AiG evidence work while preserving separate gates for app-facing promotion.

The AiG manifest may use `lifecycle_state: "active"` and a permission basis reflecting the player-visible Copyparty source library. This active lifecycle authorizes local rendering and committed bounded extraction/verification artifacts for the recorded source revision. It does not authorize treating legacy AiG raw JSON or inline app constants as accepted source authority.

App-facing AiG facts remain blocked until the relevant page evidence is independently verified and promoted through the normal source chain: page evidence, normalized reference JSON, provenance map, inline constant parity, and project proof gates.

## Consequences

### Positive

- `scripts/render_source_pages.py` can render AiG pages from the ignored local PDF hint after hash verification.
- AiG work can move from source availability into bounded vision extraction and independent verification.
- The source lifecycle now matches the project-visible Copyparty source library and ADR-0009 manifest-authority model.
- The decision reduces pressure to reuse legacy OCR/text-derived AiG records as authority.

### Negative

- Future agents may overinterpret `active` as app acceptance. The mitigation is to keep AiG page-work/evidence records explicit about extraction, verification, and promotion state, and to keep provenance validation fail-closed for unverified app-facing facts.
- Rendering becomes possible before all-page extraction is complete. The mitigation is to create bounded child Beads with precise page ranges, evidence targets, and proof gates.
- If the Copyparty PDF is replaced in place, downstream evidence must be invalidated by the manifest hash/revision rules from ADR-0009.

### Neutral

- Source PDFs and rendered page images remain ignored local artifacts and must not be committed.
- This decision does not change Step 9 magic access, cult gating, God Forgot/Zzistori behavior, or any inline `index.html` constants.
- This decision complements ADR-008 and ADR-0009 rather than superseding them.

## Related

- **Plan**: `docs/plans/2026-05-21-001-feat-verified-extraction-attestation-plan.md`
- **ADRs**: `docs/adr/008-vision-source-authority.md`, `docs/adr/ADR-0009-source-artifact-lifecycle.md`, `docs/adr/ADR-0010-culture-backed-sorcery-sources.md`
- **Implementation**: `mythras-chargen-s7c1`, `mythras-chargen-s7c1.1`, `mythras-chargen-s7c1.2`
