# AGENTS.md — Universal Agent Contract

This is a Decapod-managed repository. **Strict Dependency: You are strictly bound to the Decapod control plane.**

This contract applies equally to Claude, Codex, Gemini, Cursor, Kilo, and any other agent operating here.

## Mandatory Initialization

```bash
cargo install decapod

decapod validate
decapod docs ingest
decapod session acquire
decapod rpc --op agent.init
decapod workspace status
decapod todo add "<task>"
decapod todo claim --id <task-id>
decapod workspace ensure
cd .decapod/workspaces/<your-worktree>
decapod rpc --op context.resolve
```

## Control-Plane First Loop

```bash
# Discover what this binary actually supports in this repo
decapod capabilities --format json
decapod data schema --deterministic

# Resolve scoped governance context before implementation
decapod docs search --query "<problem>" --op <op> --path <path> --tag <tag>
decapod rpc --op context.scope --params '{"query":"<problem>","limit":8}'

# Convergence/proof surfaces (call when relevant)
decapod workunit init --task-id <task-id> --intent-ref <intent>
decapod govern capsule query --topic "<topic>" --scope interfaces --task-id <task-id>
decapod eval plan --task-set-id <id> --task-ref <task-id> --model-id <model> --prompt-hash <hash> --judge-model-id <judge> --judge-prompt-hash <hash>
```

## Golden Rules (Non-Negotiable)

1. **MUST** refine intent with the user before inference-heavy work.
2. **MUST NOT** work on main/master. **MUST** use `.decapod/workspaces/*`.
3. **MUST** read `.decapod/config.toml` as user-editable project context and may update it when user intent changes.
4. **MUST NOT** claim done without `decapod validate` passing.
5. **MUST NOT** invent capabilities that are not exposed by the binary.
6. **MUST** stop if requirements conflict, intent is ambiguous, or policy boundaries are unclear.
7. **MUST** respect the Interface abstraction boundary.

## Invariants (Normative)

These invariants are directly enforced by tests. Violations will cause CI failure.

- **INV-DAEMONLESS**: Decapod MUST NOT leave background processes running. (enforced by `tests/daemonless_lifecycle.rs`)
- **INV-BOUNDED-VALIDATE**: `decapod validate` MUST terminate within bounded time. (enforced by `tests/validate_termination.rs`)
- **INV-STORE-BOUNDARY**: Agents MUST NOT directly mutate `.decapod/*`; all access MUST use CLI. (enforced by validation gates)
- **INV-SESSION-AUTH**: Mutations require active session with valid credentials. (enforced by session commands)
- **INV-PROOF-GATED**: Workunit status `VERIFIED` MUST have passed proof-plan gates. (enforced by `tests/workunit_publish_gate.rs`)
- **INV-WORKSPACE-ISOLATION**: Protected branches (main/master) MUST NOT be directly mutated. (enforced by workspace validation)

## Safety Invariants
- ✅ Router pointer: `core/DECAPOD.md`
- ✅ Validation gate: `decapod validate`
- ✅ Constitution ingestion gate: `decapod docs ingest`
- ✅ Workspace status gate: `decapod workspace status`
- ✅ Claim-before-work gate: `decapod todo claim --id <task-id>`
- ✅ Session auth gate: `DECAPOD_SESSION_PASSWORD`
- ✅ Workspace gate: Docker git workspaces
- ✅ Privilege gate: request elevated permissions before Docker/container workspace commands

## Universal Agent Operating Contract

**Doctrine:** Establish intent, shape context, bound mutation, and define proof before implementation.

**Before:** Determine what's asked; identify files/modules; define scope; surface assumptions; create dependency-aware todos.

**During:** Avoid opportunistic rewrites; preserve behavior unless task requires change; stop before crossing subsystem boundaries; verify before completion.

**After:** Report what changed, tested, not tested, and uncertainty. Ensure `decapod validate` passes.

## Decapod Governance

Decapod is the repo-native control plane agents call on demand. It reduces wasted inference, prevents scope drift, enforces boundaries, and requires proof-backed completion.

- **The agent performs the work.** Decapod does not implement or decide.
- **Decapod governs the work.** It validates, tracks, and surfaces convergence proof.
- **Decapod does not replace agents.** It makes Claude, Codex, OpenCode, Kilo, Pi, Cursor, and others more reliable by absorbing common deficiencies.

Call Decapod before editing. Let Decapod validate after editing.

## Operating Notes

- Read `.decapod/config.toml` before planning; it captures project name, summary, architecture, primary languages, and agent entrypoint preferences.
- Treat `.decapod/config.toml` as human-editable project context. You may update it when user intent or project direction changes.
- Read `.decapod/OVERRIDE.md` when present; it is the repo-local place for constitution overrides.
- Do not mutate Decapod-owned state under `.decapod/` directly; generated specs, data, workspaces, and sessions stay via decapod CLI.
- Use `decapod docs show core/DECAPOD.md` for binding contracts; `decapod capabilities --format json` for available ops.
- Use `decapod todo handoff --id <id> --to <agent>` for cross-agent ownership transfer.
- Treat lock/contention failures (including `VALIDATE_TIMEOUT_OR_LOCK`) as blocking until resolved.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->

---

## Project-Specific Rules

### Architecture

Single-file HTML application (`index.html`, ~19800 lines). No framework, no build step. Vanilla JS with inline data constants. See `.rpiv/guidance/architecture.md` for full module map.

### Data Attestability (ADR-003)

All game data MUST trace to a source PDF with page citation. Flow: `PDF → references/*.json → inline constant → UI`. Never edit inline constants without updating the reference JSON. Vision-mode verification required for any data that might be LLM-interpreted.

### Source Hierarchy

1. Adventures in Glorantha (AiG) — Folk Magic, Rune Magic, cultures, combat styles
2. Mythras Core Rulebook (3rd Printing 2018) — Sorcery, Animism, Mysticism, base rules
3. Notes from Pavis Cult One-Pagers (2019) — 94 cult definitions
4. Bird in Hand / Monster Island — Spirit stat blocks
5. Hannu house rules (ADR-0007) — Rune casting, devotional pool, rank progression

### Testing Requirements

1. `node test-chargen.js` — 235 unit tests. MUST pass before any commit.
2. `node test-agent-api.mjs` — 30 E2E assertions via agent-browser. Run after magic system changes.

### Mandatory Browser Acceptance Testing

**After ANY code change to index.html**, you MUST manually test in the browser using `agent-browser`:

```bash
# Start server if not running
python3 -m http.server 8765 &

# Open the app
agent-browser open http://localhost:8765/index.html
```

**Full manual test procedure (every change):**

1. **Create a character from scratch** — click through all 12 wizard steps:
   - Step 1: Enter name and concept
   - Step 2: Set or randomize characteristics
   - Step 4: Select culture and homeland
   - Step 5: Allocate cultural skills, select rune affinities, choose folk magic
   - Step 6: Add passions
   - Step 7: Set age/gender/family
   - Step 8: Select career and professional skills
   - Step 9: Select cult — **verify the correct magic picker appears** (miracle picker for theists, sorcery picker for sorcerers, spirit picker for animists, both for hybrids)
   - Step 10: Allocate career skills, select career folk magic
   - Step 11: Allocate bonus skills
   - Step 12: Set social class

2. **Verify Play Mode** — switch to Play Mode, screenshot it, verify:
   - Identity section (name, culture, cult, career)
   - Characteristics and derived attributes
   - Skill table with correct breakdown columns
   - Magic section (miracles/spells/spirits depending on cult type)
   - Combat styles with weapons

3. **Verify PDF Export** — click Export PDF, confirm no JS errors

4. **Screenshot and verify** — take screenshots at key points:
   ```bash
   agent-browser screenshot /tmp/step9-cult.png
   agent-browser screenshot /tmp/play-mode.png
   ```
   Then view the screenshots and verify correctness visually.

5. **Fix bugs immediately** — if anything crashes, shows wrong data, or looks broken:
   - Create a bead: `bd create "bug: <description>"`
   - Fix the bug
   - Re-test from scratch
   - Close the bead: `bd close <id>`

**Minimum test matrix (at least one character per cult type):**
- Theist cult (e.g., Orlanth) → miracle picker
- Animist cult (e.g., Daka Fal) → spirit picker
- Sorcery cult (e.g., Arkat) → sorcery spell picker
- Hybrid cult (e.g., Waha) → both miracle + spirit pickers

### Push Protocol

Always push to BOTH remotes:
```bash
git push origin main && git push paphos main
```

### Magic Systems

All 5 Mythras magic systems are implemented. See `.rpiv/guidance/magic-system.md` for:
- `detectCultType()` — regex-based classification from skill patterns
- Spell limits: Sorcery = 3 (Dedicated rank), Spirits = CHA/2 (Spirit Worshipper)
- Resource pools: Theist = POW/2 devotional, Sorcery = POW, Animist = CHA/2 slots

### Recommended Skills for This Project

The following skills have been validated as useful for this codebase:

| Skill | When to Use |
|-------|-------------|
| `ce-plan` | Breaking down multi-step features |
| `ce-work` | Executing implementation efficiently |
| `ce-code-review` | Before committing major changes |
| `ce-simplify-code` | After implementation, reduce complexity |
| `ce-compound` | Document learnings in `docs/solutions/` |
| `ce-commit-push-pr` | Commit with good messages, push |
| `ce-debug` | When tests fail or browser shows errors |
| `research` | Deep codebase investigation |
| `explore` | Weighing implementation approaches |
| `design` | Architecture for complex features |
| `validate` | Verify plan execution completeness |
| `outline-test-cases` | Generate QA specs for features |
| `ce-code-review` | Structured multi-persona code review |
| `ce-adversarial-reviewer` | Large/risky diffs |
| `ce-correctness-reviewer` | Logic errors, edge cases |
| `ce-reliability-reviewer` | Error handling, failure modes |
| `ce-performance-oracle` | Performance bottlenecks |
| `ce-code-simplicity-reviewer` | YAGNI violations, over-engineering |
| `ce-architecture-strategist` | Pattern compliance |
| `codebase-analyzer` | Deep component investigation |
| `scope-tracer` | Trace investigation boundaries |
