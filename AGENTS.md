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

### Data Ingestion Pipeline

When processing new/updated cult PDFs from Hannu:

```bash
# Self-contained scripts (PEP 723 + uv — no pip install needed)
./scripts/ingest-cults.py path/to/cult.pdf     # Test single PDF
./scripts/ingest-cults.py --diff               # Show changes vs existing
./scripts/ingest-cults.py --write              # Update reference JSONs
./scripts/ingest-cults.py --validate           # Verify no garbled entries
./scripts/build-rune-map.py                    # Rebuild glyph mapping
```

Pipeline architecture:
- `pdfplumber` detects `GloranthaCoreRunes` font at character level
- Rune glyphs separated from body text deterministically (no regex heuristics)
- `references/rune-glyph-map.json` maps 41 font glyphs → rune names
- Subcult format (`SubcultName(s):MiracleName`) handled correctly
- Comma-within-parentheses preserved (`Command (Specific Species, Monster or Spirit)`)

After ingesting new data, propagate to `index.html`:
1. Update `MIRACLES_DATA` inline constant from reference JSONs
2. Run `node test-chargen.js` — all 235 tests must pass
3. Browser-verify the affected cult's miracle picker

### Testing Requirements

1. `node test-chargen.js` — 235 unit tests. MUST pass before any commit.
2. `node test-agent-api.mjs` — 30 E2E assertions via agent-browser. Run after magic system changes.
3. `./scripts/ingest-cults.py --validate` — reference data integrity check.

### Mandatory Browser Acceptance Testing

**After ANY code change to index.html**, you MUST perform full manual visual verification.

**CRITICAL RULES:**
- Do NOT use `App.agent.*` API calls — test as a real human player would
- Click buttons, type in fields, select from dropdowns one action at a time
- After each action, get fresh DOM references (re-renders invalidate old elements)
- Every screenshot MUST be read with the `read` tool (vision mode) and every element verified
- Do NOT skip screenshots. Do NOT summarize without looking.
- Change your mind mid-flow: deselect skills, re-pick, try duplicates — humans do this

#### Setup

```bash
python3 -m http.server 8765 &
agent-browser open http://127.0.0.1:8765/index.html
agent-browser eval "localStorage.clear(); location.reload(); 'cleared'"
```

#### Full Manual Walkthrough (Wizard Mode)

Navigate each step by clicking "Next →" and interacting with the UI elements directly.
Never call `App.agent.*`, `App.nextStep()`, or set `CharacterData` properties to skip steps.

**Step 1 (Concept):**
```bash
agent-browser type "input[type='text']" "Character Name Here"
agent-browser type "textarea" "A brief character concept"
agent-browser click "#btn-next"
agent-browser screenshot /tmp/wizard-step1.png
```
→ `read /tmp/wizard-step1.png` — Verify: Advanced to Step 2.

**Step 2 (Characteristics):**
```bash
# Use native value setter since input handlers require it:
agent-browser eval "(function() {
  const ns = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  const inputs = [...document.querySelectorAll('input[type=\"number\"]')];
  [11,12,13,14,15,5,5].forEach((v,i) => { ns.call(inputs[i], v); inputs[i].dispatchEvent(new Event('input', {bubbles:true})); });
  return document.querySelector('.budget-tracker').textContent.trim();
})()"
agent-browser click "#btn-next"
```
→ Verify: "Points Remaining: 0 / 75" before advancing.

**Step 3 (Attributes):** Read-only. Click Next.
```bash
agent-browser click "#btn-next"
```

**Step 4 (Culture + Homeland):**
```bash
agent-browser select "select" "Telmori Hsunchen"   # or any culture
# Click a homeland button:
agent-browser eval "[...document.querySelectorAll('button')].find(b => b.textContent.includes('Telmori Wilds')).click(); 'clicked'"
agent-browser click "#btn-next"
agent-browser screenshot /tmp/wizard-step4.png
```
→ `read /tmp/wizard-step4.png` — Verify: Culture info panel shown, homeland selected.

**Step 5 (Cultural Skills + Rune Affinities + Folk Magic):**
```bash
# Distribute 100 points across skill inputs (max 15 each)
# Select 3 rune affinities from dropdowns
# Check 3 folk magic checkboxes
agent-browser screenshot /tmp/wizard-step5.png
agent-browser click "#btn-next"
```
→ `read /tmp/wizard-step5.png` — Verify: Budget at 0/100. Runes selected. 3 folk magic checked.

**Step 6 (Passions):** Cultural passions pre-filled. Click Next.
**Step 7 (Background):** Optional. Click Next.

**Step 8 (Career + Professional Skills) — CRITICAL DESELECT TEST:**
```bash
agent-browser select "select" "Crafter"   # or any career with disambiguated skills
```

Select 3 professional skills one at a time (get fresh DOM refs after each click):
```bash
agent-browser eval "[...document.querySelectorAll('#professional-skills-picker input[type=\"checkbox\"]')].find(cb => cb.parentElement.textContent.includes('Art (any)')).click(); 'checked Art'"
agent-browser eval "[...document.querySelectorAll('#professional-skills-picker input[type=\"checkbox\"]')].find(cb => cb.parentElement.textContent.includes('Craft (Primary)')).click(); 'checked Craft Primary'"
agent-browser eval "[...document.querySelectorAll('#professional-skills-picker input[type=\"checkbox\"]')].find(cb => cb.parentElement.textContent.includes('Craft (Secondary)')).click(); 'checked Craft Secondary'"
```

Type specializations (calling `resolveProfessionalSkill` directly since the DOM input flow requires sequential focus):
```bash
agent-browser eval "App.resolveProfessionalSkill('Art (any)', 'Wolfmaking'); 'resolved Art'"
agent-browser eval "App.resolveProfessionalSkill('Craft (Primary)', 'Basketry'); 'resolved Craft Primary'"
agent-browser eval "App.resolveProfessionalSkill('Craft (Secondary)', 'Leatherwork'); 'resolved Craft Secondary'"
```

**Test changing your mind** — uncheck one Craft and verify the other stays:
```bash
agent-browser eval "(function() {
  App.renderCurrentStep();
  const cbs = [...document.querySelectorAll('#professional-skills-picker input[type=\"checkbox\"]')];
  cbs.find(cb => cb.parentElement.textContent.includes('Craft (Secondary)')).click();
  return 'Selected: ' + JSON.stringify(CharacterData.selectedProfessionalSkills);
})()"
```
→ Verify: Array still contains `"Craft (Basketry)"` — only Leatherwork was removed.

Select a replacement skill and advance:
```bash
agent-browser eval "[...document.querySelectorAll('#professional-skills-picker input[type=\"checkbox\"]')].find(cb => cb.parentElement.textContent.includes('Commerce')).click(); 'checked Commerce'"
agent-browser click "#btn-next"
```
→ Verify: Advances to Step 9 (no "must select 3" error).

**Step 9 (Cult Selection + Miracles) — CRITICAL VALIDATION TEST:**
```bash
# Click a cult card
agent-browser eval "[...document.querySelectorAll('h3,h4,strong')].find(h => h.textContent.trim() === 'Telmor').click(); 'selected Telmor'"
agent-browser screenshot /tmp/wizard-step9.png
```

Test validation — try advancing WITHOUT selecting miracles:
```bash
agent-browser eval "App.nextStep(); const t = document.querySelector('.toast'); t ? 'Toast: ' + t.textContent : 'No toast at step ' + App.currentStep"
```
→ Verify: Toast says "Please select all your initiate miracles (0/N chosen)" and stays on Step 9.

Test the Quick Boost panel (if cult skills below 50%):
```bash
agent-browser eval "window.scrollTo(0, 900); 'scroll'"
agent-browser screenshot /tmp/wizard-step9-boost.png
```
→ `read /tmp/wizard-step9-boost.png` — Verify: Blue "Quick Boost" panel visible with cult skills, +/- buttons, bonus pool counter.

Select miracles up to devotional pool:
```bash
agent-browser eval "(function() {
  const cards = [...document.querySelectorAll('[data-miracle]')];
  cards.slice(0, CharacterData.devotionalPool).forEach(c => c.click());
  return 'Selected ' + CharacterData.miracles.length + ' miracles';
})()"
agent-browser click "#btn-next"
```
→ Verify: Advances to Step 10.

**Step 10 (Career Skills + Folk Magic):**
```bash
agent-browser screenshot /tmp/wizard-step10.png
```
→ `read /tmp/wizard-step10.png` — Verify:
  - Only the 3 selected professional skills appear (NOT all 7 career options)
  - Standard skills (Brawn, Drive, etc.) are listed
  - If Craft (Primary) was kept, "Craft (Basketry)" appears as its own row
  - If Craft (Secondary) was swapped for Commerce, "Commerce" appears instead
  - Datalist inputs show chevron (˅) indicating they're clickable dropdowns

**Steps 11-13:** Distribute bonus points, review, finish.

#### Play Mode Verification

Switch to Play Mode and scroll through the ENTIRE page:
```bash
agent-browser eval "document.getElementById('btn-play').click(); window.scrollTo(0,0); 'play mode'"
agent-browser screenshot /tmp/play-01-top.png
```
→ `read /tmp/play-01-top.png` — Verify: Name, Culture, Homeland, Career, Cult visible.

Scroll and screenshot every viewport (800px increments) verifying:
- Skills table with correct totals
- Hit Locations with HP
- Combat styles and weapons
- Rune Affinities with %
- Passions including cult loyalty
- Magic section (correct picker type for cult)
- Folk magic spells
- Equipment and starting money
- Footer with trademark

#### PDF Export Verification

```bash
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
sleep 2
agent-browser eval "window.__pdfResult"
```

Decode and render to PNG, then verify with vision mode:
```bash
B64=$(agent-browser eval "window.__pdfB64" | tr -d '"')
echo "$B64" | base64 -d > /tmp/character.pdf
mkdir -p /tmp/pdf-pages
python3 -c "from pdf2image import convert_from_path; imgs = convert_from_path('/tmp/character.pdf', dpi=150); [img.save(f'/tmp/pdf-pages/page_{i+1}.png') for i, img in enumerate(imgs)]"
read /tmp/pdf-pages/page_1.png
```
→ Verify: All sections render correctly, skills match Play Mode, magic section present.

#### Fix Bugs Immediately

If ANYTHING is wrong — crashes, wrong data, misaligned layout, missing sections:
```bash
bd create "bug: <description>"
```
Fix the bug, then **re-run the entire acceptance test from Step 1**.
Do not commit until the full flow passes. Close the bead when fixed.

#### Minimum Test Matrix

At least one character per cult type. EACH must go through all steps above:
- **Theist** (e.g., Orlanth, Telmor) → miracle picker, devotional pool = POW/2
- **Animist** (e.g., Daka Fal) → spirit picker, spirit slots = CHA/2
- **Sorcery** (e.g., Arkat) → sorcery spell picker, limit = 3
- **Hybrid** (e.g., Waha) → both miracle + spirit pickers

#### Key Gotchas for Manual Testing

1. **DOM references go stale after re-render** — always get fresh `querySelectorAll` after any click that triggers `renderCurrentStep()`
2. **Native value setter required for number inputs** — `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set` + dispatch `input` event
3. **Disambiguated skills (Craft Primary/Secondary)** — each tracks independently via `_disambiguationMap`; deselecting one must NOT remove the other
4. **Toast messages disappear after 3s** — check immediately after `App.nextStep()`, don't wait for screenshot
5. **Step 5 validation** — requires both 0/100 budget AND 3 folk magic AND 3 runes selected

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
