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
Every screenshot MUST be read with the `read` tool (vision mode) and every element verified.
Do NOT skip screenshots. Do NOT summarize without looking.

#### Setup

```bash
python3 -m http.server 8765 &
agent-browser open http://127.0.0.1:8765/index.html
```

#### Step 1: Build Character Step-by-Step (Wizard Mode — Visual Verification)

Clear previous state:
```bash
agent-browser eval "localStorage.clear(); 'cleared'"
agent-browser open http://127.0.0.1:8765/index.html
```

Set each step via the Agent API, render the wizard step, screenshot, and verify with vision mode:

**Step 1 (Concept):**
```bash
agent-browser eval "JSON.stringify(App.agent.setStep(1, {name:'...', concept:'...'}))"
agent-browser eval "App.renderCurrentStep(); 'rendered'"
agent-browser screenshot /tmp/wizard-step1.png
```
→ `read /tmp/wizard-step1.png` — Verify: Name and concept fields populated. "Step 1 of 13" visible.

**Step 2 (Characteristics):**
```bash
agent-browser eval "JSON.stringify(App.agent.setStep(2, {characteristics:{STR:14,CON:12,...}}))"
agent-browser eval "App.renderCurrentStep(); 'rendered'"
agent-browser screenshot /tmp/wizard-step2.png
```
→ `read /tmp/wizard-step2.png` — Verify: All 7 stats shown in input fields. "Points Remaining: 0 / 75" (green).

**Step 4 (Culture + Homeland):**
```bash
agent-browser eval "JSON.stringify(App.agent.setStep(4, {culture:'...', homeland:'...'}))"
agent-browser eval "App.renderCurrentStep(); 'rendered'"
agent-browser screenshot /tmp/wizard-step4.png
```
→ `read /tmp/wizard-step4.png` — Verify: Culture selected/highlighted. Homeland dropdown shows correct value.

**Step 5 (Cultural Skills + Rune Affinities + Folk Magic):**
```bash
agent-browser eval "JSON.stringify(App.agent.setStep(5, {culturalSkills:{...}, runeAffinities:{primary:'...',secondary:'...',tertiary:'...'}, folkMagicSpells:[...]}))"
agent-browser eval "App.renderCurrentStep(); 'rendered'"
agent-browser screenshot /tmp/wizard-step5.png
```
→ `read /tmp/wizard-step5.png` — Verify: Skill allocation table with points. Rune affinity dropdowns. Folk magic spells checked.

**Step 8 (Career + Professional Skills):**
```bash
agent-browser eval "JSON.stringify(App.agent.setStep(8, {career:'...', professionalSkills:[...]}))"
agent-browser eval "App.renderCurrentStep(); 'rendered'"
agent-browser screenshot /tmp/wizard-step8.png
```
→ `read /tmp/wizard-step8.png` — Verify: Career selected. Professional skills listed/checked.

**Step 9 (Cult + Magic Picker) — CRITICAL:**
```bash
agent-browser eval "JSON.stringify(App.agent.setStep(9, {cult:'...', miracles:[...]}))"
agent-browser eval "App.renderCurrentStep(); 'rendered'"
agent-browser screenshot /tmp/wizard-step9.png
```
→ `read /tmp/wizard-step9.png` — Verify the CORRECT picker appears:
  - **Theist cult**: Miracle picker with checkboxes, devotional pool counter, rune tags on miracles
  - **Animist cult**: Spirit picker with spirit names/types/abilities, slot counter (CHA/2)
  - **Sorcery cult**: Sorcery spell picker with 53 spells, 3-spell limit counter
  - **Hybrid cult**: BOTH pickers visible (scroll down if needed, take second screenshot)

**Step 9 — scroll to bottom of picker (if hybrid or long list):**
```bash
agent-browser eval "window.scrollBy(0, 600); 'scroll'"
agent-browser screenshot /tmp/wizard-step9-bottom.png
```
→ `read /tmp/wizard-step9-bottom.png` — Verify: Full picker rendered. Selection count matches expected.

After all steps, verify the build completed:
```bash
agent-browser eval "JSON.stringify(App.agent.getMagicState())"
```
Confirm: cultType, devotionalPool, boundSpiritSlots, sorceryResource, selectedMiracles/spells/spirits all match expectations.

#### Step 2: Play Mode — Screenshot EVERY Section (Vision Mode)

Switch to Play Mode and scroll through the ENTIRE page, screenshotting and visually verifying each viewport:

```bash
agent-browser eval "App.switchMode('play'); window.scrollTo(0,0); 'play'"
```

**Screenshot 1: Identity + Skills (top)**
```bash
agent-browser screenshot /tmp/play-01-top.png
```
→ `read /tmp/play-01-top.png` — Verify: Name, Culture, Homeland, Career, Cult, Age, Gender, Social Class. Skills table header row. First ~15 skills with Base/Culture/Career/Bonus/Total columns.

**Screenshot 2: Skills (continued) + Attributes**
```bash
agent-browser eval "window.scrollBy(0, 800); 'scroll'"
agent-browser screenshot /tmp/play-02-skills.png
```
→ `read /tmp/play-02-skills.png` — Verify: Remaining skills. Hit Locations table (HP per location). Attributes (AP, LP, MP, Init, Move, Heal, DM, SR).

**Screenshot 3: Combat + Rune Affinities + Passions**
```bash
agent-browser eval "window.scrollBy(0, 800); 'scroll'"
agent-browser screenshot /tmp/play-03-combat.png
```
→ `read /tmp/play-03-combat.png` — Verify: Weapons table. Combat styles. Rune Affinities (Primary/Secondary/Tertiary with %). Passions with values.

**Screenshot 4: Magic Section (cult info + miracles/spells/spirits)**
```bash
agent-browser eval "(function(){let t=null; document.querySelectorAll('h3').forEach(h=>{if(h.textContent.includes('Theist')||h.textContent.includes('Spirit Magic')||h.textContent.includes('Sorcery Spells'))t=h}); t&&t.scrollIntoView({block:'start'}); return 'ok'})()"
agent-browser screenshot /tmp/play-04-magic.png
```
→ `read /tmp/play-04-magic.png` — Verify:
  - **Theist**: "Theist Miracles (Initiate)" heading, Rune Affinities line, Devotional Pool number, miracle list with [Rune] tags
  - **Animist**: "Spirit Magic (Animist — Shaman Path)" heading, Bound Spirit Slots: N, casting method
  - **Sorcery**: "Sorcery Spells" heading, sorcery resource, spell list
  - **Hybrid**: BOTH theist AND animist/sorcery sections present

**Screenshot 5: Folk Magic + Equipment + Notes**
```bash
agent-browser eval "window.scrollBy(0, 800); 'scroll'"
agent-browser screenshot /tmp/play-05-folk.png
```
→ `read /tmp/play-05-folk.png` — Verify: Folk Magic (XX%) with spell list. Equipment section with Starting Money. Notes section with Concept and Family.

**Screenshot 6: Bottom (Special Effects reference, footer)**
```bash
agent-browser eval "window.scrollTo(0, document.body.scrollHeight); 'bottom'"
agent-browser screenshot /tmp/play-06-bottom.png
```
→ `read /tmp/play-06-bottom.png` — Verify: Page renders completely. No broken elements. Footer with trademark text visible.

#### Step 3: PDF Export — Generate, Render to Image, Verify with Vision Mode

**Generate PDF and intercept the blob:**
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

**Decode and render to PNG:**
```bash
B64=$(agent-browser eval "window.__pdfB64" | tr -d '"')
echo "$B64" | base64 -d > /tmp/character.pdf
mkdir -p /tmp/pdf-pages
python3 -c "from pdf2image import convert_from_path; imgs = convert_from_path('/tmp/character.pdf', dpi=150); [img.save(f'/tmp/pdf-pages/page_{i+1}.png') for i, img in enumerate(imgs)]"
```

**Read the PDF image with vision mode:**
```bash
read /tmp/pdf-pages/page_1.png
```
→ Verify ALL of the following in the rendered PDF:
  - Header: Name, Culture, Career, Cult, Homeland, Age, Gender, Social Class, Concept, Family
  - Characteristics row: STR, CON, SIZ, DEX, INT, POW, CHA with correct values
  - Derived attributes: AP, DM, Init, MP, LP, XP Mod, Move, Heal, SR
  - Hit Locations: Head, Chest, Abdo, R.Arm, L.Arm, R.Leg, L.Leg with correct HP
  - Skills: 3-column layout, correct percentages matching Play Mode
  - Passions: correct values
  - Rune Affinities: Primary/Secondary/Tertiary with correct %
  - Magic: cult name, pool value, miracle/spell/spirit list matching Play Mode
  - Folk Magic: spell list with correct casting %
  - Footer: "Generated with mythras-chargen" + trademark

#### Step 4: Fix Bugs Immediately

If ANYTHING is wrong — crashes, wrong data, misaligned layout, missing sections:
```bash
bd create "bug: <description>"
```
Fix the bug, then **re-run the entire acceptance test from Step 1**.
Do not commit until the full flow passes. Close the bead when fixed:
```bash
bd close <id>
```

#### Minimum Test Matrix

At least one character per cult type. EACH must go through all steps above:
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
