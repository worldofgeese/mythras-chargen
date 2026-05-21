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

Use Home Manager `bd` for durable project issue tracking: `bd ready`, `bd show <id>`, `bd update <id> --claim`, `bd close <id>`.

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

#### Commit and publish

- Commit only verified work with the required Copilot co-author trailer.
- Push final `main` to both `origin` and `paphos`.
- Clean up temporary servers with specific PIDs, not name-based process killing.

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

---

## Interfaces Overrides (Binding Contracts)

### interfaces/CLAIMS.md

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
