# AGENTS.md - Universal Agent Contract

This is a Decapod-managed repository. Agents are bound to the Decapod control plane, this file, and the mirrored project overrides below. When generic Decapod scaffolding conflicts with project overrides, the override wins.

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
decapod capabilities --format json
decapod data schema --deterministic
decapod infer orientation --intent "<your-goal>" --task-id <id>
decapod govern capsule query --topic "<topic>" --scope interfaces --task-id <task-id>
decapod rpc --op context.scope --params '{"query":"<problem>","limit":8}'
```

## Golden Rules

1. Refine intent before inference-heavy work.
2. Use `decapod infer orientation` before non-trivial implementation.
3. Stop for Decapod Decision Gates, conflicts, ambiguity, or unclear policy boundaries.
4. Never work on main/master or mutate the root checkout; use `.decapod/workspaces/*`.
5. Read `.decapod/config.toml`; treat it as human-editable project context.
6. Do not claim done without `decapod validate`.
7. Do not invent unsupported Decapod capabilities.
8. Respect Interface abstraction boundaries and lock/contention failures.

## Safety Invariants

- ✅ Router pointer: `core/DECAPOD.md` | ✅ Validation gate: `decapod validate`
- ✅ Constitution ingestion gate: `decapod docs ingest`
- ✅ Workspace status gate: `decapod workspace status`
- ✅ Claim-before-work gate: `decapod todo claim --id <task-id>` is superseded here by `bd update <id> --claim`; do not create or claim `decapod todo` items.
- ✅ Session auth gate: `DECAPOD_SESSION_PASSWORD`
- ✅ Workspace gate: Docker git workspaces; use Docker git workspaces and execute in `.decapod/workspaces/*` unless the project container override applies.
- ✅ Privilege gate: request elevated permissions before Docker/container workspace commands
- Invariants: daemonless Decapod, bounded validation, no direct `.decapod/*` mutation except through CLI, session-scoped mutations require credentials, VERIFIED work needs proof gates, and root checkout isolation is mandatory.

## Mirrored Project-Specific Decapod Overrides

- Beads workflow: run `bd prime`; use `bd ready`, `bd show <id>`, `bd update <id> --claim`, and `bd close <id>`; use `bd remember "insight"` for persistent project memory; do not create `MEMORY.md` files or markdown TODO tracking. Beads is the task-tracking authority and supersedes `decapod todo`.
- Fan-out/subagent prompts: each subagent must be told to read and obey `AGENTS.md` and `.decapod/OVERRIDE.md`, run `bd prime`, use/create/claim the assigned Beads issue, avoid `decapod todo`, work in an isolated Decapod worktree, run relevant proof gates, obey Copyparty sync rules, and treat its work as provisional until the orchestrator verifies diff, proof, Beads state, and publishing.
- Architecture: single-file vanilla HTML app in `index.html`; no framework/build step; inline constants mirror source JSON under `references/`; `docs/solutions/` uses YAML frontmatter keys `module`, `problem_type`, and `tags`.
- Copyparty: player material lives on `worldofgeese@loving-kypris.hound-celsius.ts.net`, container `copyparty`, root `/w`, public root `https://copyparty.hound-celsius.ts.net/`, staging `~/staging/`. If mirrored files change (`index.html`, `docs/handouts/*.html`, active pregens, player PDFs), inspect live tree first, sync only matching paths, preserve layout, verify affected URLs with `curl -fsSL`, and mention verification in handoff.
- Live layout: `/w/00-START-HERE.html`, `/w/01-Character-Generator.html`, `/w/characters/active-pregens/`, `/w/rules/handouts/`, `/w/sources/books/`. Keep `/w` to those launch files/directories; archive legacy files under `~/staging/archive/`; do not flatten or rename player-facing paths without explicit request.
- Publish app: `scp index.html worldofgeese@loving-kypris.hound-celsius.ts.net:~/staging/01-Character-Generator.html` then `ssh ... 'podman cp ~/staging/01-Character-Generator.html copyparty:/w/ && rm -f ~/staging/01-Character-Generator.html'`; verify `/01-Character-Generator.html`.
- Publish handouts: copy `docs/handouts/*.html` to staging, ensure `/w/rules/handouts`, copy staging `index.html` to `/w/00-START-HERE.html`, copy remaining handouts to `/w/rules/handouts/`, then verify `/00-START-HERE.html` and touched handouts.
- Data attestability: all game data must trace `PDF -> references/*.json -> inline constant -> UI`; never edit inline game-data constants without matching reference JSON. Source hierarchy: AiG for Gloranthan cultures/folk/rune magic; Mythras Core 3rd Printing 2018 for base rules, animism, sorcery, mysticism; Notes from Pavis for cults; Bird in Hand/Monster Island for spirits; house rules for rune casting, devotional pool, and ranks.
- Quality gates: run `node test-chargen.js` before commit; run `node test-agent-api.mjs` after magic-system changes; run `./scripts/ingest-cults.py --validate` after cult/reference data changes; run `decapod validate`; after `index.html` changes, use `agent-browser` like a human by clicking/typing/selecting, changing choices, using fresh refs after re-render, inspecting screenshots, and verifying Play Mode plus PDF export.
- Container scope: routine proof for this static app does not require Docker/Podman container execution; isolated Decapod worktrees plus project proof gates satisfy the workspace requirement. Containers become required only for new dependency managers, build systems, external services, or explicit human request.
- Commit/publish: commit only verified work with the required Copilot co-author trailer; push final `main` to both `origin` and `paphos`; clean temporary servers with specific PIDs, never name-based killing.
- Behavioral guidelines: state assumptions and ask when unclear, present multiple interpretations instead of guessing, prefer simple solutions, touch only required files, avoid unrelated refactors/reformats/deletions, match existing style, remove only imports/vars/functions made unused by the current change, and define verifiable success criteria for multi-step tasks.

## Operating Notes

Read `.decapod/OVERRIDE.md` for the canonical override, `decapod docs show core/DECAPOD.md` for binding contracts, and `decapod capabilities --format json` for available operations. Call Decapod before editing and let Decapod validate after editing.


<!-- decapod-validator-anchors
Stop if
via decapod CLI
Interface abstraction boundary
Strict Dependency: You are strictly bound to the Decapod control plane
-->
