---
title: "feat: Supplied source attestation completion"
type: feat
status: active
date: 2026-05-21
origin: conversation
---

# feat: Supplied source attestation completion

## Summary

Use the newly supplied local PDFs for Combat Styles Encyclopedia, A Bird in the Hand, updated Waha, and Monster Island to unblock source discovery, CSE publication, Waha/Bird/Monster verification, and downstream pregen/final acceptance work while preserving the project's strict source-attestation chain.

---

## Problem Frame

The previous verified extraction wave correctly left several Beads blocked because source artifacts or lawful/current source inputs were missing. The user has now supplied local PDFs for the blocked sources, including an updated Waha one-pager that takes precedence over the older tracked Waha PDF. This plan turns those files into manifest-backed source revisions, publishes player-facing PDFs where required, performs bounded page evidence work, and only promotes source facts when the chain `PDF -> references/*.json -> provenance -> inline constant -> UI/PDF` is complete.

---

## Requirements

- R1. Record source metadata for supplied CSE, Bird in Hand, updated Waha, and Monster Island PDFs using SHA-256, size, page count, source revision IDs, lifecycle state, local hints, and canonical/player-visible locators.
- R2. Publish CSE and updated Waha PDFs to Copyparty in the correct existing tree locations when they become player-facing source material, after inspecting the live tree and verifying public URLs.
- R3. Treat updated Waha as the current Waha one-pager; older tracked Waha PDFs and duplicates must not feed app generation after the new source revision is accepted.
- R4. Continue to treat text extraction as scratch-only for governed sources; committed evidence must come from rendered page/image evidence and independent verification.
- R5. Promote normalized data only atomically with page/source evidence, provenance mappings, inline app constants when applicable, and behavior tests.
- R6. Refresh active Copyparty pregens only after their underlying source data is accepted.
- R7. Keep all work tracked in Beads; subagent Beads must include the relevant skill/tool expectations and proof gates.
- R8. Keep Decapod issue DecapodLabs/decapod#568 as an external control-plane blocker rather than blocking application implementation.

---

## Scope Boundaries

- Do not commit supplied source PDFs or rendered page images.
- Do not use full-page transcriptions as committed evidence.
- Do not promote AiG facts in this wave unless a separate lawful AiG extraction permission/source task is unblocked.
- Do not edit `index.html` game data without matching reference JSON and provenance updates.
- Do not flatten or reorganize Copyparty paths.
- Do not close final acceptance while source or pregen Beads remain blocked.

### Deferred to Follow-Up Work

- Full AiG page-by-page extraction remains deferred until lawful extraction permission/source availability is resolved.
- Broad cleanup of legacy tracked cult PDFs is deferred beyond explicit Waha precedence handling.
- CI/container validation waits on DecapodLabs/decapod#568 or a supported Decapod override path.

---

## Context & Research

- `docs/adr/008-vision-source-authority.md` requires rendered page/image evidence and independent verification for governed source facts.
- `docs/adr/ADR-0009-source-artifact-lifecycle.md` records manifest source revisions as canonical identity and makes updated Waha the current Waha source.
- `docs/plans/2026-05-21-001-feat-verified-extraction-attestation-plan.md` remains the deep baseline plan.
- `references/sources/manifest.json` and `references/sources/pages/*.json` already contain blocked/partial state for the sources.
- `docs/solutions/data-integrity/data-attestability-learnings.md` warns against trusting unverified LLM extraction and reinforces page/vision verification with exact citations.
- `docs/solutions/data-pipeline/aig-pdf-extraction-pattern.md` warns that PDF extraction is page-aligned and must be transformed into domain records through schema validation.

---

## Key Technical Decisions

- **Manifest-first unblock:** record source identity and publication state before any fact promotion.
- **Source-scoped fan-out:** dispatch separate worktrees/subagents for CSE publication, Waha reconciliation, Bird verification, Monster verification, and pregens/final acceptance.
- **Serial app-data promotion:** do not let multiple agents edit `index.html` concurrently; reference/provenance source work can proceed in parallel, but inline app changes merge through the orchestrator.
- **TDD posture:** each feature-bearing source promotion starts with or extends public-interface validation in `test-chargen.js`, source validators, or `test-agent-api.mjs` before modifying app behavior.
- **Review pipeline:** after implementation, run simplification and review agents in this order: `ce-simplify`, `ce-code-simplicity-reviewer`, `ce-correctness-reviewer`, then `compound-engineering:ce-adversarial-reviewer`.

---

## Implementation Units

### U1. Reopen and seed source Beads for supplied PDFs

**Goal:** Convert formerly blocked source Beads into actionable, claimed work with full context for subagents.

**Requirements:** R1, R7, R8

**Dependencies:** None

**Files:**
- Modify: `.beads/issues.jsonl`

**Approach:** Reopen or update Beads for CSE, source discovery, Waha, Bird, Monster, pregens, and acceptance. Each Bead must include local PDF paths, governing ADRs, required skills, required proof gates, Copyparty rules, and the Decapod external issue reference.

**Patterns to follow:** `.decapod/OVERRIDE.md` fan-out prompt rules and Beads workflow.

**Test scenarios:** Test expectation: none -- tracker state only.

**Verification:** `bd ready` shows the intended unblocked work and no implementation subagent lacks context.

### U2. Publish and manifest CSE

**Goal:** Make the supplied CSE PDF a manifest-backed and player-visible source, then link it from relevant handouts if appropriate.

**Requirements:** R1, R2, R4, R5

**Dependencies:** U1

**Files:**
- Modify: `references/sources/manifest.json`
- Modify: `references/sources/pages/cse.json`
- Modify: `references/provenance/index-html-map.json`
- Modify: `docs/handouts/*.html` if a source link is added
- Test: `test-chargen.js`

**Approach:** Use the supplied CSE PDF hash `106d7ad39e8b63d39cc6a5e79db7ec2f031b165b5c05017113bc13f2469841a6`, size `2831310`, and page count `1109`. Publish to `/w/sources/books/` after inspecting the live tree. Update manifest/page records from blocked-unavailable to available/player-visible. Add handout links only where the handout already points readers to source books or combat-style references.

**Execution note:** Add/update validation before changing source state so missing size/page count cannot regress silently.

**Test scenarios:**
- Source manifest validation accepts CSE with non-null hash, size, page count, locator, and revision ID.
- Provenance validation still rejects CSE fact promotion if page/block evidence is absent.
- Handout HTML, if changed, contains the verified public CSE URL and preserves existing navigation.

**Verification:** Public CSE URL returns HTTP 200; source/provenance validators and `node test-chargen.js` pass.

### U3. Replace Waha authority with updated one-pager revision

**Goal:** Promote the supplied updated Waha PDF as the current Waha source revision and supersede stale duplicates.

**Requirements:** R1, R2, R3, R4, R5

**Dependencies:** U1

**Files:**
- Modify: `references/sources/manifest.json`
- Modify: `references/sources/pages/waha.json`
- Modify: `references/cults-raw/praxian/waha.json`
- Modify: `references/cults-raw/storm/waha.json`
- Modify: `references/cults-raw/cults.json`
- Modify: `references/provenance/index-html-map.json`
- Modify: `index.html` only if accepted Waha app data changes
- Test: `test-chargen.js`
- Test: `test-agent-api.mjs` if app/magic behavior changes

**Approach:** Use the supplied Waha PDF hash `a36461fa3ba86159be1d8993ea920824446171380ff3c11c10a47a8cd95475f1`, size `153745`, and page count `2`. Publish the PDF only if source/player visibility is required for the Waha record. Render the two pages, record bounded evidence, run independent verification, then update normalized Waha records and inline app data only for facts supported by the new evidence.

**Execution note:** Implement source-state tests first; app data changes come after evidence and verifier records exist.

**Test scenarios:**
- Canonical Waha source revision resolves to the updated hash and older Praxian/Storm duplicates are superseded or redirected.
- No app-facing Waha field changes unless the provenance map cites the updated revision and page evidence.
- Waha cult selection/build behavior remains valid in public app flows after any data changes.

**Verification:** Source validators, cult ingest validation, `node test-chargen.js`, and `node test-agent-api.mjs` pass; manual browser QA runs if `index.html` changes.

### U4. Complete Bird in Hand bounded verification

**Goal:** Turn the supplied Bird in Hand source into accepted bounded evidence for pages 43-46 where legacy spirit examples depend on it.

**Requirements:** R1, R4, R5

**Dependencies:** U1

**Files:**
- Modify: `references/sources/manifest.json`
- Modify: `references/sources/pages/bird-in-hand.json`
- Modify: `references/spirits-raw/bird-in-hand.json`
- Modify: `references/provenance/index-html-map.json`
- Modify: `index.html` only if accepted spirit data changes
- Test: `test-chargen.js`
- Test: `test-agent-api.mjs` if magic/spirit behavior changes

**Approach:** Confirm the supplied Bird PDF matches existing hash `2d76fcb74715f5b5f9e514528c4da68fa8d36fc4b435468278802d02d1eb26e3`, size `11290904`, and page count `60`. Render only contributing pages 43-46, record bounded block evidence, run independent verification, and promote only accepted example-spirit facts.

**Execution note:** One behavior/validator increment at a time: page evidence validation, verifier acceptance, normalized data, then app behavior if needed.

**Test scenarios:**
- Page-work validation records pages 43-46 with render metadata and bounded evidence.
- Spirit raw records cannot be marked accepted without independent verifier metadata.
- Existing spirit selection/build behavior remains stable unless explicitly changed with provenance.

**Verification:** Source/page/vision/provenance validators, `node test-chargen.js`, and `node test-agent-api.mjs` pass.

### U5. Complete Monster Island bounded verification without over-promotion

**Goal:** Use the supplied Monster Island PDF to verify candidate spirit/cult template pages while preserving non-authoritative boundaries unless permission/source status allows promotion.

**Requirements:** R1, R4, R5

**Dependencies:** U1

**Files:**
- Modify: `references/sources/manifest.json`
- Modify: `references/sources/pages/monster-island.json`
- Modify: `references/spirits-raw/monster-island.json`
- Modify: `references/provenance/index-html-map.json`
- Test: `test-chargen.js`
- Test: `test-agent-api.mjs` if magic/spirit behavior changes

**Approach:** Confirm supplied Monster Island hash `dd79904483ab62766799e6480da7081cbcbbdd9cb1a608ecc5dfdeae7cce0782`, size `10363314`, and page count `298`. Render previously identified candidate pages, record bounded evidence and verifier state, but do not promote Monster Island as Gloranthan authority unless its permission/source state allows it.

**Test scenarios:**
- Manifest/page validators reflect available source metadata and candidate page evidence.
- Monster Island raw records remain blocked/non-authoritative if permission state remains pending.
- No app-facing fact uses Monster Island without accepted provenance.

**Verification:** Source/page/vision/provenance validators and Node tests pass.

### U6. Refresh pregens and final publication after source acceptance

**Goal:** Regenerate active pregen PDFs and close final acceptance only after source evidence is accepted.

**Requirements:** R5, R6, R8

**Dependencies:** U2, U3, U4, U5

**Files:**
- Modify: active pregen PDFs under `characters/` if regenerated
- Modify: `.beads/issues.jsonl`
- Test: `test-chargen.js`
- Test: `test-agent-api.mjs` if app behavior changed

**Approach:** Regenerate only after accepted source revisions are in place. Sync active pregens to `/w/characters/active-pregens/`, verify public URLs, then close dependent Beads that are truly complete. Keep DecapodLabs/decapod#568 as an external validation caveat if still unresolved.

**Test scenarios:**
- Pregens reflect accepted source data and do not cite blocked source revisions.
- Public Copyparty pregen URLs return HTTP 200 after sync.
- Final Beads tree has no open/in-progress work except true external blockers.

**Verification:** Required tests, manual browser QA if app changed, Copyparty verification, and Beads closure state are complete.

---

## Risk Analysis & Mitigation

- **Risk:** Agents promote source facts from text extraction. **Mitigation:** ADR-008 and tests require rendered page evidence and verifier metadata for governed facts.
- **Risk:** Parallel agents conflict on `index.html` or provenance maps. **Mitigation:** Source work can fan out, but app-data promotion merges serially through the orchestrator.
- **Risk:** Copyparty publishing breaks the player-visible tree. **Mitigation:** inspect live tree before sync, preserve paths, verify URLs after sync.
- **Risk:** Monster Island or AiG permission state remains ambiguous. **Mitigation:** keep records blocked/non-authoritative until permission/source state changes.

---

## Documentation Plan

- ADR-0009 records source artifact lifecycle and updated Waha precedence.
- Bead notes must capture exact local source paths, hashes, page counts, public URLs, proof gates, and reviewer findings.
- If implementation discovers repeatable source/PDF or Copyparty workflow lessons, capture them under `docs/solutions/` after the change is verified.
