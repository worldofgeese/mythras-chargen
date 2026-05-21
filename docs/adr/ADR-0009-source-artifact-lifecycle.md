---
title: "Source Artifact Lifecycle and Canonical Revision Identity"
adr: ADR-0009
status: Accepted
date: 2026-05-21
prd: "N/A"
decision: "Use source hash/revision manifests as authority; keep source PDFs out of git; treat updated local Waha as the current Waha source"
---

# ADR-0009: Source Artifact Lifecycle and Canonical Revision Identity

## Status

Accepted

## Date

2026-05-21

## Requirement Source

- **PRD**: N/A
- **Decision Point**: The verified extraction plan and follow-up source-supply decision require a durable rule for local PDFs, Copyparty PDFs, tracked legacy PDFs, and source revision identity.

## Context

ADR-003 requires game data to flow from source material into `references/*.json`, then into inline constants in `index.html`, then into the UI. ADR-008 tightens authority for AiG, CSE, the current Waha one-pager, A Bird in the Hand, Monster Island, and later governed sources: committed facts must be backed by rendered page/image evidence and independent verification rather than text-layer extraction.

Execution exposed a remaining lifecycle ambiguity. The repository already contains tracked cult one-pager PDFs under `references/cults-upstream/`, while the verified extraction plan says new source PDFs and rendered pages must stay out of git. The user also supplied local source PDFs in `/home/worldofgeese/Downloads/`, including an updated `Waha.pdf` that takes precedence over the older tracked Waha one-pager. Future agents need to know whether the canonical source is the file path, the Copyparty URL, a tracked PDF, or a stable source revision record.

## Decision Drivers

- Source PDFs and rendered page images should not be added to git for new governed extraction work.
- Source evidence must be portable and reviewable without depending on one user's absolute local paths.
- Copyparty is both a player-visible source mirror and a practical source-acquisition surface, but URLs alone are mutable.
- Updated Waha source data must supersede stale duplicate Waha records without relying on ambiguous filenames.
- Validators need immutable revision identity so downstream page evidence and normalized facts can be invalidated when a PDF changes.

## Considered Options

### Option 1: Treat file paths as canonical

Use local paths or Copyparty paths as the primary source identity.

- Good, because it is easy for agents to locate files during implementation.
- Good, because Copyparty URLs are useful player-facing references.
- Bad, because local paths are not portable across machines or agents.
- Bad, because a URL can be replaced in place without changing the string.
- Bad, because tracked legacy PDFs and newer local PDFs with similar names can conflict.

### Option 2: Commit governed source PDFs to git

Store every governed PDF directly in the repository and treat the tracked blob as canonical.

- Good, because every checkout has the exact file available.
- Good, because git object identity can prove immutability.
- Bad, because it conflicts with the verified extraction plan's source-PDF hygiene.
- Bad, because it increases repository size and risks committing material that should remain an external source artifact.
- Bad, because it does not solve player-facing publication or source permission state.

### Option 3: Use manifest source revisions as canonical identity

Keep source PDFs outside git and make committed manifest records the authority: source ID, title, edition, lifecycle/permission state, canonical locator, local hint, SHA-256, size, page count, render contract, and `source_revision_id`.

- Good, because source identity is portable and reviewable.
- Good, because a changed PDF creates a changed hash/revision and invalidates dependent evidence.
- Good, because local Downloads files and Copyparty files can both be acquisition paths while the manifest remains canonical.
- Good, because tracked legacy PDFs can be explicitly superseded or grandfathered instead of silently reused.
- Bad, because agents must hydrate local source files before rendering or verifying pages.
- Bad, because validators and Bead notes must be precise about blocked, superseded, and accepted states.

## Decision

Chosen option: **Use manifest source revisions as canonical identity**.

For governed sources, the source PDF's SHA-256, size, page count, edition metadata, lifecycle state, permission basis, render contract, and `source_revision_id` in `references/sources/manifest.json` define the canonical source revision. Local filesystem paths and Copyparty URLs are acquisition locators, not the authority by themselves.

New governed source PDFs and rendered page images stay out of git. Agents may use local source files supplied by the user or mirrored Copyparty files to calculate metadata and render page evidence, but committed records must cite the manifest source revision. If a source PDF changes, downstream page evidence, normalized JSON, provenance mappings, inline constants, and pregens derived from the old revision are stale until revalidated.

The updated local `Waha.pdf` supplied on 2026-05-21 is the current Waha one-pager for future Waha reconciliation. Older tracked Waha PDFs under `references/cults-upstream/` are legacy source artifacts and must not override the current Waha source revision once the updated PDF is manifested.

## Consequences

### Positive

- Agents can use either Copyparty or user-supplied local PDFs without making absolute paths authoritative.
- Validators can fail stale downstream data when source hashes or render contracts change.
- The updated Waha source has a clear precedence rule over older tracked duplicates.
- The repository avoids adding new governed source PDFs or rendered pages to git.

### Negative

- Implementation must maintain manifest records carefully before promoting normalized facts.
- A missing local PDF can still block rendering even when the manifest is present; agents must recover or request the source artifact.
- Legacy tracked source PDFs remain a migration burden until each is superseded, grandfathered, or removed by a dedicated cleanup.

### Neutral

- Copyparty remains the preferred player-visible mirror, but the source revision hash is the authority.
- Local hints in manifests are expected to be non-portable guidance, not a guarantee that every checkout has the file.

## Related

- **Plan**: `docs/plans/2026-05-21-001-feat-verified-extraction-attestation-plan.md`
- **ADRs**: Amends the source-artifact handling implied by `docs/adr/003-attestable-data-chain.md`; complements `docs/adr/008-vision-source-authority.md`
- **Implementation**: Beads under parent `mythras-chargen-2yg7`, especially CSE, Waha, Bird in Hand, Monster Island, source discovery, pregens, and final acceptance
