# AGENTS.md — Universal Agent Contract

This is a Decapod-managed repository. **Strict Dependency: You are strictly bound to the Decapod control plane.**

This contract applies equally to Claude, Codex, Gemini, Cursor, Kilo, and any other agent operating here.

## Mandatory Initialization

```bash
cargo install decapod
decapod validate && decapod docs ingest && decapod session acquire
decapod rpc --op agent.init
decapod workspace status
bd prime
bd create "<task>" && bd update <id> --claim
decapod infer orientation --intent "<your-goal>"
decapod workspace ensure
cd .decapod/workspaces/<your-worktree>
decapod rpc --op context.resolve
```

## Control-Plane First Loop

```bash
# Discover what this binary actually supports in this repo
decapod capabilities --format json
decapod data schema --deterministic

# Resolve precise orientation before implementation
decapod infer orientation --intent "<your-goal>" --task-id <id>
decapod govern capsule query --topic "<topic>" --scope interfaces --task-id <task-id>
decapod rpc --op context.scope --params '{"query":"<problem>","limit":8}'
```

## Golden Rules (Non-Negotiable)

1. **MUST** refine intent with the user before inference-heavy work.
2. **MUST** use `decapod infer orientation` before non-trivial implementation.
3. **MUST** stop and ask the human when Decapod emits a **Decision Gate**.
4. **MUST NOT** work on main/master or modify the root repository's active branch. **MUST** use `decapod workspace ensure` and `cd .decapod/workspaces/<worktree>`.
5. **MUST** read [.decapod/config.toml](.decapod/config.toml) as user-editable project context and may update it when user intent changes.
6. **MUST NOT** claim done without `decapod validate` passing.
7. **MUST NOT** invent capabilities that are not exposed by the binary.
8. **MUST** stop if requirements conflict, intent is ambiguous, or policy boundaries are unclear.
9. **MUST** respect the Interface abstraction boundary.

## Orientation & Precision (Doctrine)

Before starting expensive exploration, broad refactors, or multi-path architecture work:
- Call `decapod infer orientation`.
- Treat the returned `orientation_packet` as the authoritative starting context.
- If the packet contains `decision_gates`, present the options to the human and wait for a choice.
- Do not bypass decision gates; they are placed where ambiguity would otherwise cause expensive waste.
- Use the `allowed_scope` and `proof_required` fields to bound your work.

## Invariants (Normative)

These invariants are directly enforced by tests. Violations will cause CI failure.

- **INV-DAEMONLESS**: Decapod MUST NOT leave background processes running. (enforced by `tests/daemonless_lifecycle.rs`)
- **INV-BOUNDED-VALIDATE**: `decapod validate` MUST terminate within bounded time. (enforced by `tests/validate_termination.rs`)
- **INV-STORE-BOUNDARY**: Agents MUST NOT directly mutate `.decapod/*`; all access MUST use CLI. (enforced by validation gates)
- **INV-SESSION-AUTH**: Mutations require active session with valid credentials. (enforced by session commands)
- **INV-PROOF-GATED**: Workunit status `VERIFIED` MUST have passed proof-plan gates. (enforced by `tests/workunit_publish_gate.rs`)
- **INV-ROOT-ISOLATION**: Agents MUST NOT check out branches or mutate files in the main repository checkout. All work must happen in isolated `.decapod/workspaces/*` worktrees to avoid disrupting the human user's environment. (enforced by workspace validation)

## Safety Invariants
- ✅ Router pointer: `core/DECAPOD.md` | ✅ Validation gate: `decapod validate`
- ✅ Constitution ingestion gate: `decapod docs ingest`
- ✅ Workspace status gate: `decapod workspace status`
- ✅ Claim-before-work gate: `bd update <id> --claim` (`decapod todo` is superseded by Beads)
- ✅ Session auth gate: `DECAPOD_SESSION_PASSWORD`
- ✅ Workspace gate: Docker git workspaces
- ✅ Privilege gate: request elevated permissions before Docker/container workspace commands

## Universal Agent Operating Contract

Decapod governs AI coding agents to ensure convergence on human intent and proof-backed completion.

- **Doctrine:** Establish intent, shape context, bound mutation, and define proof BEFORE implementation.
- **Rules:** Avoid opportunistic rewrites; preserve behavior; stop at subsystem boundaries; run strong verification.
- **Workflow:** Claim task -> Orient -> Ensure Workspace -> Work in Worktree -> Validate -> Publish.
- **Hierarchy:** Constitution and project intent outrank agent-local execution.

Call Decapod before editing. Let Decapod validate after editing.

## Operating Notes

- Read `.decapod/config.toml` (human-editable) for project context and architecture direction.
- Read `.decapod/OVERRIDE.md` for repo-local constitution overrides.
- DO NOT mutate `.decapod/` state directly; use Decapod CLI for specs, data, workspaces, and sessions. Access to `.decapod/` is strictly via decapod CLI.
- Use `decapod docs show core/DECAPOD.md` for binding contracts.
- Use `decapod capabilities --format json` to discover available operations.
- Stop if requirements conflict, intent is ambiguous, or policy boundaries are unclear.
- Respect the Interface abstraction boundary.
- Treat lock/contention failures as blocking until resolved.

## Mirrored Project-Specific Decapod Overrides

The following section mirrors `.decapod/OVERRIDE.md` so the repo-local binding contract is present directly in this agent entrypoint. Where the mirrored project-specific rules conflict with generic Decapod scaffolding above, the mirrored override rules win.

# OVERRIDE.md - Project-Specific Decapod Overrides

> **IMPORTANT:** For detailed usage instructions and examples, see [README.md](README.md).

**Canonical:** OVERRIDE.md
**Authority:** override
**Layer:** Project
**Binding:** Yes (overrides embedded constitution)

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- ⚠️  CHANGES ARE NOT PERMITTED ABOVE THIS LINE                           -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

## Core Overrides (Routers and Indices)

### Project-local agent contract

These repo-specific rules extend the embedded Decapod constitution and the canonical agent entrypoints.

#### Beads workflow

This project uses Home Manager `bd` (beads) for durable issue tracking.

- Run `bd prime` for workflow context and command guidance.
- Use `bd ready`, `bd show <id>`, `bd update <id> --claim`, and `bd close <id>`.
- Beads is the task-tracking authority for this repository; `decapod todo ...` operations are superseded by the equivalent `bd ...` operations.
- Use `bd remember "insight"` for persistent project memory; do not create `MEMORY.md` files.
- Do not use markdown TODO lists for task tracking.

#### Fan-out and subagent prompts

When orchestrating parallel or serial subagents, the parent agent must pass the repo contract into each subagent prompt instead of relying on ambient context.

- Tell every subagent to read and obey `AGENTS.md` and `.decapod/OVERRIDE.md` before editing.
- Tell every subagent to run `bd prime` and use Beads for durable task tracking; do not create or claim `decapod todo` work items.
- Include the relevant Beads issue ID or require the subagent to create/claim a Beads issue before implementation.
- Include required proof gates for the affected files: `node test-chargen.js`, `node test-agent-api.mjs` after magic/build changes, `./scripts/ingest-cults.py --validate` after cult/reference data changes, `decapod validate`, and human-style `agent-browser` QA after `index.html` changes.
- Include Copyparty sync and verification rules whenever a subagent may touch mirrored files.
- Treat subagent work as provisional until the orchestrator verifies the diff, proof gates, Beads state, and Copyparty obligations.

#### Project architecture

- Single-file vanilla HTML app: `index.html`.
- No framework and no build step.
- Inline constants mirror source JSON under `references/`.
- `docs/solutions/` stores reusable learnings with YAML frontmatter: `module`, `problem_type`, and `tags`.

#### Loving Kypris Copyparty fileserver

Player-facing material is published to Copyparty on Loving Kypris.

- SSH target: `worldofgeese@loving-kypris.hound-celsius.ts.net`
- Container: `copyparty`
- Player-visible root: `/w`
- Public root: `https://copyparty.hound-celsius.ts.net/`
- Host staging: `~/staging/`; archive outside player root: `~/staging/archive/`

Mandatory sync rule:
- If a local change affects any file mirrored on Copyparty, sync that change to the remote server before closing the task. This includes `index.html`, `docs/handouts/*.html`, active pregen character PDFs, and player source PDFs.
- Preserve the remote structure below exactly. Do not flatten directories, copy handouts or PDFs into `/w`, or rename player-facing paths unless the user explicitly asks for a fileserver reorganization.
- Before changing the remote, inspect the live tree with `ssh worldofgeese@loving-kypris.hound-celsius.ts.net 'podman exec copyparty find /w -maxdepth 5 -mindepth 1 | sort'` and only update the path that corresponds to the local file.
- After syncing, verify the affected public URL with `curl -fsSL` and include that verification in the handoff.

Current live visible layout, last verified 2026-05-20:

```text
/w/
  00-START-HERE.html
  01-Character-Generator.html
  characters/active-pregens/: Ionara-Grand-daughter-of-Thiralda.pdf, Vasana-Farnans-Daughter.pdf
  rules/handouts/: combat-path.html, combined-path.html, index.html, magic-path.html, prep-checklist.html, rules-and-house-rules.html, source-trail.html
  sources/books/: A-Bird-in-the-Hand.pdf, Adventures in Glorantha GenCon Preview.pdf, Monster-Island.pdf, Mythras Core Rulebook (3rd Printing 2018).pdf, RuneQuest Starter Set - Book 2 Glorantha.pdf
```

Root hygiene:
- Keep `/w` to the two launch files plus `characters/`, `rules/`, and `sources/`; archive legacy/superseded files under `~/staging/archive/` or keep them local.
- Put active pregen PDFs in `/w/characters/active-pregens/`, handouts in `/w/rules/handouts/`, and player source PDFs in `/w/sources/books/`.

Publish:

```bash
scp index.html worldofgeese@loving-kypris.hound-celsius.ts.net:~/staging/01-Character-Generator.html
ssh worldofgeese@loving-kypris.hound-celsius.ts.net 'podman cp ~/staging/01-Character-Generator.html copyparty:/w/ && rm -f ~/staging/01-Character-Generator.html'
scp docs/handouts/*.html worldofgeese@loving-kypris.hound-celsius.ts.net:~/staging/
ssh worldofgeese@loving-kypris.hound-celsius.ts.net 'mkdir -p ~/staging/archive && podman exec copyparty sh -c "mkdir -p /w/rules/handouts" && podman cp ~/staging/index.html copyparty:/w/00-START-HERE.html && for f in ~/staging/*.html; do podman cp "$f" copyparty:/w/rules/handouts/; rm -f "$f"; done'
```

Verify with `curl -fsSL https://copyparty.hound-celsius.ts.net/00-START-HERE.html` and `/01-Character-Generator.html`.

#### Data attestability

All game data must trace to a source PDF with page citation. Flow: `PDF -> references/*.json -> inline constant -> UI`. Never edit inline game-data constants without the matching reference JSON.

Source hierarchy: AiG for Gloranthan cultures/folk/rune magic; Mythras Core 3rd Printing 2018 for base rules, animism, sorcery, mysticism; Notes from Pavis one-pagers for cults; Bird in Hand/Monster Island for spirits; house rules for rune casting, devotional pool, and ranks.

#### Quality gates and acceptance

- Always run `node test-chargen.js` before commit.
- Run `node test-agent-api.mjs` after magic-system changes.
- Run `./scripts/ingest-cults.py --validate` after cult/reference data changes.
- Run `decapod validate` before claiming done.
- After `index.html` changes, use `agent-browser` like a human: click/type/select, try changed choices, use fresh DOM refs after re-render, inspect screenshots, and verify Play Mode/PDF export.

#### Container testing scope

Containerized proof is not required for this repository's normal application validation because the chargen tool is a single-file static HTML application with no package install, build step, server runtime, or container-dependent dependency graph.

For this app, the required proof surfaces are:
- `node test-chargen.js`
- `node test-agent-api.mjs` after magic-system changes
- `./scripts/ingest-cults.py --validate` after cult/reference data changes
- `decapod validate` from an isolated Decapod worktree
- Human-style `agent-browser` QA after `index.html` changes

Use container workspaces only when a change introduces a dependency manager, build system, external service runtime, or when the human explicitly requests container isolation for a specific task.

#### Commit and publish

- Commit only verified work with the required Copilot co-author trailer.
- Push final `main` to both `origin` and `paphos`.
- Clean up temporary servers with specific PIDs, not name-based process killing.

#### Agent behavioral guidelines

These guidelines bias toward caution over speed; use judgment for trivial tasks.

Before implementing:
- State assumptions explicitly and ask when requirements are unclear.
- Present multiple interpretations instead of silently picking one.
- Prefer the simplest approach that satisfies the request and push back on unnecessary complexity.

When editing existing code:
- Touch only what the task requires.
- Do not refactor, reformat, or delete unrelated adjacent code.
- Match existing style even when a different style would be preferable.
- Remove only the imports, variables, or functions made unused by the current change.

For multi-step tasks, define verifiable success criteria and keep looping until those criteria are met.

### core/ENGINEERING_EXCELLENCE.md

### core/DECAPOD.md

### core/INTERFACES.md

### core/METHODOLOGY.md

### core/PLUGINS.md

### core/GAPS.md

### core/DEMANDS.md

### core/DEPRECATION.md

---

## Specs Overrides (System Contracts)

### specs/INTENT.md

### specs/SYSTEM.md

### specs/AMENDMENTS.md

### specs/SECURITY.md

### specs/GIT.md

#### Project-specific container workspace scope

For this repository, `claim.git.container_workspace_required` does not apply to normal validation of the chargen application because the product is a single-file static HTML app with no install step, build step, server runtime, or container-dependent dependency graph.

Git-tracked implementation work still MUST occur in isolated Decapod worktrees rooted at `.decapod/workspaces/*`; this override only removes the additional containerized execution requirement for routine app proof. Containerized execution becomes required again when a change introduces a dependency manager, build system, external service runtime, or the human explicitly asks for container isolation.

---

## Interfaces Overrides (Binding Contracts)

### interfaces/CLAIMS.md

| claim | Project-specific override | Proof surface |
| --- | --- | --- |
| `claim.git.container_workspace_required` | For this single-file static HTML app, isolated Decapod worktrees plus the project proof gates satisfy the workspace requirement; Docker/Podman container execution is not required for routine validation. | `node test-chargen.js`; `node test-agent-api.mjs` after magic changes; `./scripts/ingest-cults.py --validate` after cult/reference data changes; `decapod validate` from the isolated Decapod worktree; human-style `agent-browser` QA after `index.html` changes. |

### interfaces/CONTROL_PLANE.md

### interfaces/DOC_RULES.md

### interfaces/GLOSSARY.md

### interfaces/STORE_MODEL.md

---

## Methodology Overrides (Practice Guides)

### methodology/ARCHITECTURE.md

### methodology/SOUL.md

### methodology/KNOWLEDGE.md

### methodology/MEMORY.md

---

## Architecture Overrides (Domain Patterns)

### architecture/DATA.md

### architecture/CACHING.md

### architecture/MEMORY.md

### architecture/WEB.md

### architecture/CLOUD.md

### architecture/FRONTEND.md

### architecture/ALGORITHMS.md

### architecture/SECURITY.md

### architecture/OBSERVABILITY.md

### architecture/CONCURRENCY.md

---

## Plugins Overrides (Operational Subsystems)

### plugins/TODO.md

### plugins/MANIFEST.md

### plugins/EMERGENCY_PROTOCOL.md

### plugins/DB_BROKER.md

### plugins/CRON.md

### plugins/REFLEX.md

### plugins/HEALTH.md

### plugins/POLICY.md

### plugins/WATCHER.md

### plugins/KNOWLEDGE.md

### plugins/ARCHIVE.md

### plugins/FEDERATION.md

### plugins/FEEDBACK.md

### plugins/TRUST.md

### plugins/CONTEXT.md

### plugins/HEARTBEAT.md

### plugins/APTITUDE.md

### plugins/VERIFY.md

### plugins/DECIDE.md

### plugins/AUTOUPDATE.md
