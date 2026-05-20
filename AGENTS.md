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

Canonical visible layout:

```text
/w/
  00-START-HERE.html
  01-Character-Generator.html
  characters/active-pregens/
  rules/handouts/
  sources/books/
```

Root hygiene:
- Keep `/w` to the two launch files plus `characters/`, `rules/`, and `sources/`.
- Active pregen PDFs belong in `/w/characters/active-pregens/`.
- Handouts from `docs/handouts/*.html` belong in `/w/rules/handouts/`.
- Player source PDFs belong in `/w/sources/books/`.
- Legacy sheets and superseded exports must be archived under `~/staging/archive/` or kept local.

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
