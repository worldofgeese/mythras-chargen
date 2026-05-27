---
title: ADR Lineage Regression Guardrails (Step 9 Cult Affiliation)
date: 2026-05-28
category: workflows
module: step-9-cult-flow
problem_type: workflow
tags:
  - adr-0015
  - regression
  - lineage-drift
  - step-9
  - copyparty-sync
  - agent-api-parity
---

# ADR Lineage Regression Guardrails (Step 9 Cult Affiliation)

## Problem

`main` drifted from ADR-0015 removal lineage and reintroduced Step 9 behaviors that ADR-0015 explicitly removed: Quick Boost UI and cult-backed miracle selection/devotional pool during normal chargen.

## Solution

Treat ADR-backed removals as cross-surface invariants, not single-file edits.

Guardrail set used in fix:

1. **Fail-closed Step 9 gating**
   - Keep cult choice as affiliation/future-initiation only.
   - No Quick Boost controls in Step 9.
   - No cult-backed miracles/devotional pool unless explicit initiated/import path exists.

2. **Regression tests at both product surfaces**
   - `node test-chargen.js` for UI/state invariants.
   - `node test-agent-api.mjs` for API parity so agent path cannot bypass UI constraints.
   - Preserve legacy import behavior with explicit-false tests to avoid permissive fallback.

3. **Operational integration sync**
   - Update player-facing handouts when behavior changes.
   - Regenerate affected active pregens (Ionara/Vasana) and verify PDF output still matches ADR-0015 strict baseline.
   - Sync mirrored assets to Copyparty and verify public URLs after push.

## Key Insight

Root cause not single logic bug. Root cause integration failure across governance + product surfaces: ADR intent existed, but branch lineage lost enforcement across UI, tests, fixtures, agent API, handouts, and remote mirror. Durable fix required closing all surfaces in one loop.

## When to Apply

- Any ADR that removes or narrows behavior (especially UI affordances).
- Any change where UI rules and agent API can diverge.
- Any repo using mirrored player/public artifacts (Copyparty, static publish targets).

## Evidence

- Commit: `0f4745d8` (`fix(step9): restore ADR-0015 cult affiliation flow`)
- Commit: `940f457f` (`chore(beads): close ADR-0015 regression follow-ups`)
- QA artifact: `verification-artifacts/adr0015-qa/2026-05-28-step9-regression-final.md`
- Gates: `validate_provenance` passed; `test-chargen` 626/626; `test-agent-api` 139/139; `ingest-cults --validate` clean
