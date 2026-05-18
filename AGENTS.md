# AGENTS.md — Universal Agent Contract

This is a Decapod-managed repository. **Strict Dependency: You are strictly bound to the Decapod control plane.**

This contract applies equally to Claude, Codex, Gemini, Cursor, Kilo, and any other agent operating here.

## Mandatory Initialization

```bash
cargo install decapod

decapod validate
decapod docs ingest
decapod workspace status
decapod todo add "<task>"
decapod todo claim --id <task-id>
decapod workspace ensure              # Creates git worktree (default)
# OR: decapod workspace ensure --container  # Uses podman for full isolation
cd .decapod/workspaces/<your-worktree>
decapod rpc --op context.resolve
```

## Control-Plane First Loop

```bash
# Discover what this binary actually supports in this repo
decapod capabilities --format json

# Resolve scoped governance context before implementation
decapod docs search --query "<problem>"
decapod rpc --op context.scope --params '{"query":"<problem>","limit":8}'
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
- ✅ Workspace gate: git worktrees (default) or podman containers (`--container`)

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

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed):
   - `node test-chargen.js` must pass (235 tests)
   - `decapod validate` must pass (from worktree branch, NOT main)
3. **Update issue status** - `bd close <id>` finished work, `bd update <id>` in-progress items
4. **Merge and push** - This is MANDATORY:
   ```bash
   # If working in a decapod worktree:
   decapod workspace publish          # Creates merge-ready patch
   cd /home/worldofgeese/Downloads/projects/mythras-chargen  # Back to main repo
   git merge <worktree-branch>        # Merge the feature
   
   # Always:
   bd dolt commit                     # Commit beads database changes
   bd dolt push                       # Push beads to Dolt remote (if configured)
   git push origin main && git push paphos main  # BOTH remotes
   git status                         # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches, remove finished worktrees
6. **Verify** - All changes committed AND pushed to BOTH remotes
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
- All implementation work happens in decapod worktrees, NOT on main directly
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

**After ANY code change to index.html**, you MUST test using `agent-browser` with visual verification.

#### Setup

```bash
python3 -m http.server 8765 &
agent-browser open http://127.0.0.1:8765/index.html
```

#### Step 1: Build Character via Agent API

Use `App.agent.buildCharacter()` to create a full character in one call:

```bash
agent-browser eval "JSON.stringify(App.agent.buildCharacter({step1:{name:'Test',concept:'...'}, step2:{characteristics:{STR:14,CON:12,...}}, ...}))"
```

Verify the response has `{"success":true, "errors":[]}`.

For granular testing, use individual methods:
```bash
agent-browser eval "JSON.stringify(App.agent.selectCult('Orlanth'))"
agent-browser eval "JSON.stringify(App.agent.getMagicState())"
agent-browser eval "JSON.stringify(App.agent.assertMiracles())"
```

#### Step 2: Verify Play Mode (Visual)

Switch to Play Mode and screenshot each section:

```bash
# Switch to Play Mode
agent-browser eval "App.switchMode('play'); window.scrollTo(0,0); 'play'"

# Screenshot top (identity + skills)
agent-browser screenshot /tmp/play-top.png

# Scroll to magic section
agent-browser eval "(function(){let t=null; document.querySelectorAll('h3').forEach(h=>{if(h.textContent.includes('Theist')||h.textContent.includes('Spirit Magic')||h.textContent.includes('Sorcery'))t=h}); t&&t.scrollIntoView({block:'start'}); return 'ok'})()"
agent-browser screenshot /tmp/play-magic.png

# Scroll to bottom (folk magic, equipment, notes)
agent-browser eval "window.scrollTo(0, document.body.scrollHeight); 'bottom'"
agent-browser screenshot /tmp/play-bottom.png
```

Then **read each screenshot** with the `read` tool (vision mode) and verify:
- Identity section: name, culture, cult, career, social class correct
- Characteristics: all 7 stats, derived attributes (AP, LP, MP, Init, SR)
- Skills table: Base + Culture + Career + Bonus = Total (columns align)
- Magic section: correct miracles/spells/spirits for cult type, correct pool values
- Folk Magic: spell list matches selections

#### Step 3: PDF Export (Visual Verification)

Capture the PDF bytes and render to PNG for vision-mode verification:

```bash
# Generate PDF and capture bytes (blob interception)
agent-browser eval "
(async () => {
  const origCreate = URL.createObjectURL;
  let capturedBlob = null;
  URL.createObjectURL = function(blob) { capturedBlob = blob; return 'blob:captured'; };
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function() {};
  await App.exportSinglePagePDF();
  URL.createObjectURL = origCreate;
  HTMLAnchorElement.prototype.click = origClick;
  if (capturedBlob) {
    const buf = await capturedBlob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    window.__pdfB64 = btoa(binary);
    return 'PDF: ' + bytes.length + ' bytes';
  }
  return 'No blob';
})().then(r => window.__pdfResult = r);
'generating...'
"

# Wait then retrieve
sleep 2
agent-browser eval "window.__pdfResult"
```

Decode and render to image:
```bash
B64=$(agent-browser eval "window.__pdfB64" | tr -d '"')
echo "$B64" | base64 -d > /tmp/character.pdf
mkdir -p /tmp/pdf-pages
python3 -c "from pdf2image import convert_from_path; imgs = convert_from_path('/tmp/character.pdf', dpi=150); [img.save(f'/tmp/pdf-pages/page_{i+1}.png') for i, img in enumerate(imgs)]"
```

Then **read** `/tmp/pdf-pages/page_1.png` with vision mode and verify:
- Header block: name, culture, career, cult, homeland, social class
- Characteristics row with correct derived attributes
- Hit locations table
- Skills in 3-column layout with correct percentages
- Passions with values
- Rune affinities with percentages
- Magic section: cult name, devotional pool/spell count/spirit slots, miracle/spell list
- Folk magic list

#### Step 4: Fix Bugs Immediately

If anything crashes, shows wrong data, or looks broken:
```bash
bd create "bug: <description>"
# Fix the bug
# Re-test from scratch
bd close <id>
```

#### Minimum Test Matrix

At least one character per cult type:
- **Theist** (e.g., Orlanth, Foundchild) → miracle picker, devotional pool = POW/2
- **Animist** (e.g., Daka Fal) → spirit picker, spirit slots = CHA/2
- **Sorcery** (e.g., Arkat) → sorcery spell picker, limit = 3
- **Hybrid** (e.g., Waha) → both miracle + spirit pickers

#### Cleanup

```bash
agent-browser close
pkill -f "python3 -m http.server 8765"
```

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
