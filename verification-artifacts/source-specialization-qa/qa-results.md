# Source-backed Specialization QA

Date: 2026-05-27
Worktree: `.decapod/workspaces/unknown-todo-01kskz-agent-unknown-todo-01kskz-1779860951`

## Source decisions

- Invocation is source-bound. When the active sorcery source is deterministic (God Forgot + Sorcerer), Invocation auto-locks to `Zzistori School`.
- `Zzistori` short form is accepted defensively for legacy/imported state, but the UI stores `Zzistori School`.
- Binding remains cult/totem/tradition-bound. Monster Island spirits remain GM-approved exceptions, not default starter options.
- Mysticism is a standalone Core professional skill in this app; no required specialization field. Specialized mysticism paths remain valid for legacy/source-backed values.

## Browser QA evidence

- `step6-passion-subjects.png`
  - Step 6 passion subject inputs rendered.
  - Browser eval confirmed no `onfocus` showPicker handlers and no duplicate `onblur` save handlers.
- `zzistori-autolocked-invocation.png`
  - God Forgot + Sorcerer Step 8 shows Invocation specialization value `Zzistori School`.
  - Input is read-only / auto-locked.
  - Character state stores `Invocation (Zzistori School)`.
- `zzistori-rewrites-stale-invocation.png`
  - Switching a Sorcerer from stale `Invocation (Arkat)` to God Forgot rewrites state to `Invocation (Zzistori School)` and preserves the prior allocation.
- `agent-step4-zzistori-rewrite.png`
  - Agent API `setStep(4)` culture switch performs the same stale Invocation rewrite and preserves the prior allocation.
- `zzistori-step9-spells.png`
  - Step 9 source is `Zzistori School (God Forgot sorcery)`.
  - Sorcery spell picker is visible and populated.
- `mysticism-bare-skill.png`
  - Mystic career keeps `Mysticism` as a bare locked professional skill.
  - No Mysticism specialization input is shown.
- `mysticism-specialized-renders-checked.png`
  - Legacy/source-backed `Mysticism (Path of Harmony)` still renders the locked Mysticism row checked and disabled.

## Automated gates

- `node scripts/validate_provenance.js`: passed after hash refresh.
- `node test-chargen.js`: 636/636 after cherry-pick onto current `main`.
- `node test-agent-api.mjs`: 138/138 after restarting the local 8765 server from current `main`.
- `./scripts/ingest-cults.py --validate`: clean.

## Copyparty sync

- Synced `index.html` to `worldofgeese@loving-kypris.hound-celsius.ts.net:~/staging/01-Character-Generator.html`.
- Promoted into Copyparty with `podman cp ~/staging/01-Character-Generator.html copyparty:/w/`.
- Verified public URL via approved context-mode fetch (global AGENTS blocks raw `curl`/`wget`): `https://copyparty.hound-celsius.ts.net/01-Character-Generator.html` indexed successfully under source `copyparty generator source-specialization verification`.
