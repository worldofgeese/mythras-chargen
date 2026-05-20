# AGENTS.md - Agent Operating Contract

This is a Decapod-managed repository. Decapod governs work; agents perform the work.

## Decapod workflow
1. Refine user intent before inference-heavy work.
2. Run `decapod capabilities --format json` before relying on Decapod features.
3. Run `decapod docs ingest`, `decapod workspace status`, and scoped context lookups before editing.
4. Claim Decapod work before edits and use `bd` for durable project issues.
5. Do not mutate `.decapod/*` directly.
6. Do not work on protected `main`/`master`.
7. Do not claim completion unless `decapod validate` passes.

## Decapod invariants
- Router pointer: `core/DECAPOD.md`; show it with `decapod docs show core/DECAPOD.md`.
- Validation gate: `decapod validate`.
- Constitution ingestion gate: `decapod docs ingest`.
- Claim-before-work gate: `decapod todo claim --id <task-id>`.
- Version update gate language: run `cargo install decapod` when Decapod is missing or stale.
- Docker workspace mandate language: docker git workspaces under `.decapod/workspaces`.
- Elevated-permissions mandate language: request elevated permissions before docker/container workspace commands.
- Per-agent session password mandate language: `decapod_session_password` is per agent.
- Four invariants checklist format: ✅ Router pointer; ✅ Validation gate; ✅ Constitution ingestion gate; ✅ Claim-before-work gate.

## Beads workflow
Use Home Manager `bd` for durable project issue tracking: `bd ready`, `bd show <id>`, `bd update <id> --claim`, `bd close <id>`.

## Project architecture
- Single-file vanilla HTML app: `index.html`.
- No framework and no build step.
- Inline constants mirror source JSON under `references/`.
- `docs/solutions/` stores reusable learnings with YAML frontmatter: `module`, `problem_type`, and `tags`.

## Loving Kypris Copyparty fileserver
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

## Data attestability
All game data must trace to a source PDF with page citation. Flow: `PDF -> references/*.json -> inline constant -> UI`. Never edit inline game-data constants without the matching reference JSON.

Source hierarchy: AiG for Gloranthan cultures/folk/rune magic; Mythras Core 3rd Printing 2018 for base rules, animism, sorcery, mysticism; Notes from Pavis one-pagers for cults; Bird in Hand/Monster Island for spirits; house rules for rune casting, devotional pool, and ranks.

## Quality gates and acceptance
- Always run `node test-chargen.js` before commit.
- Run `node test-agent-api.mjs` after magic-system changes.
- Run `./scripts/ingest-cults.py --validate` after cult/reference data changes.
- Run `decapod validate` before claiming done.
- After `index.html` changes, use `agent-browser` like a human: click/type/select, try changed choices, use fresh DOM refs after re-render, inspect screenshots, and verify Play Mode/PDF export.

## Commit and publish
- Commit only verified work with the required Copilot co-author trailer.
- Push final `main` to both `origin` and `paphos`.
- Clean up temporary servers with specific PIDs, not name-based process killing.

<!-- decapod-validator-anchors
via decapod CLI
Strict Dependency: You are strictly bound to the Decapod control plane
-->
<!-- decapod-validator-anchors
stop if
Interface abstraction boundary
-->
