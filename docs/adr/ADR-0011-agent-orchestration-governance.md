---
title: "Agent Orchestration Governance"
adr: ADR-0011
status: Accepted
date: 2026-05-22
prd: "N/A"
decision: "Use a context-protecting orchestrator model with subagent delegation, Beads-scoped prompts, lfg/ce-work execution paths, and mandatory staged review"
---

# ADR-0011: Agent Orchestration Governance

## Status

Accepted

## Date

2026-05-22

## Requirement Source

- **PRD**: N/A
- **Bead**: `mythras-chargen-ndk8`
- **Decision Point**: The project-specific Decapod override needed explicit rules for orchestrator scope, subagent delegation, context protection, ADR usage, workhorse execution pipelines, review sequencing, and in-flight Beads handling.

## Context

This repository is a Decapod-managed, Beads-tracked, single-file Mythras character generator with strict source-attestation and publication obligations. Recent work has required long-running orchestration across source manifests, PDF/page evidence, app behavior, Copyparty synchronization, and multiple review passes. The headed agent can lose important state if it attempts to perform every implementation, review, and source-investigation detail inline.

The repo already uses `.decapod/OVERRIDE.md` as the binding project-specific operating contract. It also uses `docs/adr/` for durable decisions that future agents must check before changing architecture, data authority, or agent workflow. The missing decision is how the project expects the headed agent to coordinate scoped work without consuming all context and without dropping Beads, proof, ADR, or review obligations.

## Decision Drivers

- Preserve the headed agent's context for planning, synthesis, high-complexity decisions, and final integration.
- Ensure subagents receive enough context to operate safely without relying on ambient conversation state.
- Keep Beads as the durable task authority, including for bugs, bad data, source drift, and review findings discovered in-flight.
- Standardize the workhorse and review pipeline so complex work is executed and reviewed consistently.
- Require ADR checks before durable architecture, data authority, source authority, workflow, or agent-operating changes.
- Avoid replacing Decapod initialization, isolated worktrees, proof gates, or Copyparty obligations with tool-specific shortcuts.

## Considered Options

### Option 1: Let the headed agent do most work inline

The headed agent would directly implement, review, debug, and document most tasks, dispatching subagents only opportunistically.

- Good, because it minimizes coordination overhead for small changes.
- Good, because one context has immediate access to the conversation and current decisions.
- Bad, because long tasks consume the orchestrator's context and make handoff harder.
- Bad, because scoped work that could be independently verified remains coupled to a single agent's attention.
- Bad, because review and source-investigation tasks compete with planning and integration work.

### Option 2: Delegate all work to subagents unconditionally

Every task would be dispatched immediately, with the headed agent acting only as a router.

- Good, because it maximizes context preservation in the orchestrator.
- Good, because independently scoped work can proceed with focused context.
- Bad, because trivial edits and ambiguous decisions gain unnecessary overhead.
- Bad, because subagents can make poor choices when scope boundaries or source authority are not yet resolved.
- Bad, because final integration still requires a responsible orchestrator to verify diffs, Beads state, proof gates, and publication obligations.

### Option 3: Use a context-protecting orchestrator with scoped delegation

The headed agent handles planning, synthesis, high-complexity decisions, and final integration. It dispatches to subagents whenever tasks are sufficiently scoped, protects context aggressively, creates handoffs around 80% context usage, and uses a standardized workhorse/review pipeline.

- Good, because the orchestrator keeps enough context for decisions and integration.
- Good, because scoped implementation, review, research, and verification work can run in focused subagent contexts.
- Good, because Beads can carry complete task context and proof expectations across agents.
- Good, because review sequencing becomes predictable: simplification, simplicity review, correctness review, and final adversarial review.
- Bad, because prompts and Beads must be more complete before dispatch.
- Bad, because agents must decide when a task is "sufficiently scoped" rather than blindly using one execution mode.

## Decision

Chosen option: **Use a context-protecting orchestrator with scoped delegation**, because this best fits the repo's Decapod/Beads/source-attestation workflow while preserving the headed agent for decisions and integration.

The binding operating contract is recorded in `.decapod/OVERRIDE.md`; this ADR records the rationale for using that contract to preserve orchestrator context, delegate sufficiently scoped work, standardize review cycles, and route in-flight findings through Beads.

## Consequences

### Positive

- Future agents have a clear rule for protecting orchestrator context instead of treating it as the default workhorse.
- Subagent prompts and Beads must carry complete context, making work more resilient across sessions and providers.
- Review cycles have a stable final adversarial pass, reducing the chance that edge-case findings are skipped.
- In-flight unwanted behavior becomes durable work rather than transient chat context.

### Negative

- Small tasks can become over-processed if agents apply the orchestration policy without judgment; the mitigation is to delegate when tasks are sufficiently scoped and use inline execution for trivial work.
- Maintaining complete Beads and subagent prompts costs extra effort up front; the mitigation is fewer lost assumptions and safer parallelism.
- Tool names may change over time; the mitigation is to use named tools when available and record limitations when an equivalent is unavailable.

### Neutral

- `.decapod/OVERRIDE.md` remains the binding operating contract; this ADR records rationale and trade-offs.
- Decapod initialization, Beads authority, isolated worktrees, project proof gates, and Copyparty obligations still outrank workflow convenience.

## Related

- **Plan**: N/A
- **ADRs**: `docs/adr/ADR-0009-source-artifact-lifecycle.md`, `docs/adr/ADR-0010-culture-backed-sorcery-sources.md`
- **Implementation**: `mythras-chargen-ndk8`; `.decapod/OVERRIDE.md`; `AGENTS.md`
