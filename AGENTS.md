# AGENTS.md — Agent Operating Contract
This is a Decapod-managed repository. Decapod governs work; agents perform the work.

## Mandatory Decapod workflow
1. Refine user intent before inference-heavy work.
2. Run `decapod capabilities --format json` before relying on Decapod features.
3. Run `decapod docs ingest`, `decapod workspace status`, and scoped docs/context lookups before editing.
4. Use Decapod for workspace/session governance and Decapod workunit claims; use `bd` for durable project issue tracking. Do not mutate `.decapod/*` directly.
5. All git-tracked implementation work MUST happen inside a Decapod container workspace. Rootless Podman is available on this machine; do not assume Docker is required. Use `decapod workspace ensure --container` or `decapod auto container run`.
6. Do not work on protected `main`/`master`.
7. Do not claim completion unless `decapod validate` passes.

## Decapod invariants checklist
- Router pointer: `core/DECAPOD.md`; use `decapod docs show core/DECAPOD.md` and `decapod docs show docs/...`.
- Version update gate language: run `cargo install decapod` when Decapod is missing or stale.
- Container workspace mandate language: rootless Podman-backed git workspaces under `.decapod/workspaces`.
- Task claim-before-work mandate language: `decapod todo claim --id <task-id>` before edits.
- Elevated-permissions mandate language: request elevated permissions before docker/container workspace commands.
- Per-agent session password mandate language: `decapod_session_password` is per agent.
- Four invariants checklist format: ✅ Router pointer; ✅ Validation gate; ✅ Constitution ingestion gate; ✅ Claim-before-work gate.

## Security and session rules
- Do not request, use, or simulate elevated permissions unless the user explicitly approves the exact action.
- Each agent must use its own per-agent session password or Decapod-issued credentials; do not share session credentials across agents.
- Preserve the Interface abstraction boundary and stop if requirements, policy boundaries, or ownership are unclear.
- Decapod must remain daemonless; do not leave background processes running.

## Beads workflow
This project uses `bd` for task tracking. Run `bd prime` for detailed workflow help.

```bash
bd ready
bd show <id>
bd update <id> --claim
bd close <id>
```

Use only the Home Manager-provided `bd` binary. Use `bd` for all durable project task tracking and create beads for follow-up work discovered during QA. Decapod remains responsible for workspace/session control.

## Project architecture
- Single-file vanilla HTML app: `index.html`.
- No framework and no build step.
- Inline constants mirror source JSON under `references/`.
- `docs/solutions/` stores reusable learnings with YAML frontmatter: `module`, `problem_type`, and `tags`.

## Loving Kypris Copyparty fileserver
Player-facing material is published to Copyparty on Loving Kypris.

- SSH target: `worldofgeese@loving-kypris.hound-celsius.ts.net`
- Container: `copyparty`
- Player-visible container root: `/w`
- Public root: `https://copyparty.hound-celsius.ts.net/`
- Transient upload staging on host: `~/staging/`
- Archive location outside the player root: `~/staging/archive/`

Canonical visible layout:

```text
/w/
  00-START-HERE.html
  01-Character-Generator.html
  characters/
    active-pregens/
  rules/
    handouts/
  sources/
    books/
```

Root hygiene:
- Keep `/w` to the two launch files plus the three top-level folders above. Do not put loose PDFs, screenshots, legacy examples, old exports, or temporary files in `/w`.
- Active pregenerated character PDFs belong only in `/w/characters/active-pregens/`.
- Player handouts from `docs/handouts/*.html` belong in `/w/rules/handouts/`.
- Player-available source PDFs belong in `/w/sources/books/`.
- Legacy example sheets and superseded exports must be archived under `~/staging/archive/` or kept locally, not exposed under `/w`.

Publishing workflow:

```bash
# Character generator
scp index.html worldofgeese@loving-kypris.hound-celsius.ts.net:~/staging/01-Character-Generator.html
ssh worldofgeese@loving-kypris.hound-celsius.ts.net \
  'podman cp ~/staging/01-Character-Generator.html copyparty:/w/ && rm -f ~/staging/01-Character-Generator.html'

# Handouts
scp docs/handouts/*.html worldofgeese@loving-kypris.hound-celsius.ts.net:~/staging/
ssh worldofgeese@loving-kypris.hound-celsius.ts.net \
  'mkdir -p ~/staging/archive && \
   podman exec copyparty sh -c "mkdir -p /w/rules/handouts" && \
   podman cp ~/staging/index.html copyparty:/w/00-START-HERE.html && \
   for f in ~/staging/*.html; do podman cp "$f" copyparty:/w/rules/handouts/; rm -f "$f"; done'

# Source PDFs or active pregens: copy to ~/staging first, then podman cp to
# copyparty:/w/sources/books/ or copyparty:/w/characters/active-pregens/.
```

Verification workflow:

```bash
ssh worldofgeese@loving-kypris.hound-celsius.ts.net \
  'podman exec copyparty sh -c "ls -la /w; find /w -maxdepth 3 -type f | sort"'
curl -fsSL https://copyparty.hound-celsius.ts.net/00-START-HERE.html >/dev/null
curl -fsSL https://copyparty.hound-celsius.ts.net/01-Character-Generator.html >/dev/null
```

Naming conventions:
- Use stable, player-readable filenames with spaces removed or replaced by hyphens.
- Preserve recognizable character names in active pregen PDFs.
- Use the canonical source names already published in `/w/sources/books/`, such as `A-Bird-in-the-Hand.pdf` and `Monster-Island.pdf`.

## Data attestability
All game data must trace to a source PDF with page citation. Flow: `PDF -> references/*.json -> inline constant -> UI`. Never edit inline game-data constants without updating the matching reference JSON.

## Source hierarchy
1. Adventures in Glorantha: folk magic, rune magic, cultures, combat styles.
2. Mythras Core Rulebook, 3rd Printing 2018: sorcery, animism, mysticism, base rules.
3. Notes from Pavis Cult One-Pagers 2019: cult definitions.
4. Bird in Hand / Monster Island: spirit stat blocks.
5. Hannu house rules: rune casting, devotional pool, rank progression.

## Data ingestion
Use the self-contained scripts; do not hand-edit generated outputs without validating.

```bash
./scripts/ingest-cults.py path/to/cult.pdf
./scripts/ingest-cults.py --diff
./scripts/ingest-cults.py --write
./scripts/ingest-cults.py --validate
./scripts/build-rune-map.py
```

After cult or miracle data changes, propagate to `index.html`, run the tests, and browser-verify the affected picker.

## Required quality gates
Run the gates that match the change:

```bash
node test-chargen.js
node test-agent-api.mjs
./scripts/ingest-cults.py --validate
decapod validate
```

`node test-agent-api.mjs` is required after magic-system changes. `node test-chargen.js` must exit non-zero on failures.

## Browser acceptance
After any `index.html` change, use `agent-browser` as a human would: click controls, type into fields, change choices, try invalid/duplicate selections, and inspect screenshots.

Minimum matrix: one theist, one animist, one sorcery, and one hybrid character. Verify wizard completion, Play Mode, save/load or import/export where relevant, and PDF export.

Do not use `App.agent.*` for manual acceptance. Use fresh DOM references after each re-render.

## Commit and publish
- Commit only verified work.
- Include the required Copilot co-author trailer.
- Push final `main` to both `origin` and `paphos`.
- Clean up temporary servers with specific PIDs, not name-based process killing.
<!-- decapod-validator-anchors
via decapod CLI
Strict Dependency: You are strictly bound to the Decapod control plane
-->
