---
title: "Culture-Backed Sorcery Sources"
adr: ADR-0010
status: Proposed
date: 2026-05-21
prd: "N/A"
decision: "Represent God Forgot Zzistori access as a culture-backed sorcery school derived from culture, career, and no-cult state instead of as a cult or persisted source field"
---

# ADR-0010: Culture-Backed Sorcery Sources

## Status

Proposed

## Date

2026-05-21

## Requirement Source

- **Plan**: `docs/plans/2026-05-21-003-feat-zzistori-sorcery-access-plan.md`
- **Bead**: `mythras-chargen-2yg7.7`
- **Decision Point**: God Forgot Zzistori sorcerers need RAW Mythras sorcery access even when Step 9 uses **No Cult**.

## Context

ADR-0006 established that the chargen supports Mythras Core sorcery using Invocation, Shaping, Magic Points, and the Core sorcery spell list. The current Step 9 magic flow, however, is cult-centric: sorcery is exposed when a selected cult's skill pattern marks it as a sorcery cult, such as Arkat. That works for cult-mediated sorcery but fails for God Forgot.

The AiG God Forgot culture profile describes an atheist/secularist Brithini-descended culture where Zzistori sorcery is the cultural higher-magic signal, gods are not worshipped, Rune Magic is unavailable, and Zzistori must take Shaping as an adjunct to sorcerous skills. This means a God Forgot **Sorcerer** with **No Cult** should still be able to choose starting sorcery spells. It should not be forced through Arkat, treated as a theist cult, or given a Devotional Pool.

The repository's source chain also constrains the implementation. ADR-003 and ADR-008 require data to flow from source evidence into reference JSON, provenance mappings, inline constants, UI, PDFs, and tests. The canonical Zzistori access data therefore belongs in `references/aig-raw/culture-magic-profiles-aig.json`, mirrored in `CULTURE_MAGIC_PROFILES`, with RAW sorcery mechanics backed by `references/mythras-raw/sorcery.json`.

## Decision Drivers

- Preserve `detectCultType()` as a cult-only classifier based on cult skill patterns.
- Avoid creating a fake Zzistori cult, because AiG frames God Forgot sorcery as cultural/school access, not worship.
- Keep Step 9 No Cult behavior intact for cultures without an explicit culture-backed magic source.
- Persist selected sorcery spells, not a mutable source label that could drift from culture/career/cult state.
- Keep the attestable source chain visible in reference JSON, provenance coverage, inline constants, UI labels, PDF output, and tests.
- Leave room for future non-cult schools or traditions without coupling them to cult detection.

## Considered Options

### Option 1: Require a sorcery cult for all sorcery access

Continue exposing the sorcery picker only when a selected cult is classified as sorcery.

- Good, because it preserves the existing Step 9 model and storage shape.
- Good, because cult type detection remains the single magic-access gate.
- Bad, because God Forgot Zzistori sorcerers with No Cult cannot choose RAW starting sorcery.
- Bad, because players are pushed toward Arkat or another cult even when they are building a culture-backed Zzistori school sorcerer.
- Bad, because it contradicts the AiG God Forgot profile's no-gods and Rune-Magic-unavailable signal.

### Option 2: Add Zzistori as a pseudo-cult

Represent "Zzistori School" as a cult entry so the existing cult-driven sorcery flow activates.

- Good, because it reuses most existing UI and validation logic.
- Good, because sorcery spells and Magic Points could be attached to a familiar Step 9 object.
- Bad, because it misrepresents a school/caste as a cult and risks Devotion/Devotional Pool leakage.
- Bad, because it pollutes culture-cult maps with a non-cult and makes Arkat/Zzistori boundaries harder to reason about.
- Bad, because future source-backed schools would require more pseudo-cults instead of a clear source abstraction.

### Option 3: Persist a separate sorcery source field

Add a new mutable field such as `sorcerySource` or `magicSource`, store the selected source in character data, and let Step 9 render from that value.

- Good, because it can explicitly record which school/tradition grants sorcery.
- Good, because it can support multiple future source types.
- Bad, because it creates another state field that must be reset whenever culture, career, or cult changes.
- Bad, because stale imports could claim Zzistori access after the character no longer qualifies.
- Bad, because the current need has only one deterministic derived source.

### Option 4: Derive culture-backed sorcery access from character state

Expose Zzistori sorcery when the character has `culture === "God Forgot"`, `career === "Sorcerer"`, and `cult === null`. Read the label and mechanics from the culture magic profile, then persist only the chosen `sorcerySpells`.

- Good, because it models Zzistori as a source-backed school, not a cult.
- Good, because it keeps `detectCultType()` cult-only and avoids pseudo-cults.
- Good, because source eligibility cannot drift from the character's actual culture/career/cult state.
- Good, because No Cult remains the visible Step 9 choice while still unlocking a specific, cited RAW sorcery path.
- Bad, because Step 9 must learn about non-cult magic access in addition to cult-driven access.
- Bad, because future schools may require a more general resolver if they are not deterministically derived from culture/career/cult.

## Decision

Chosen option: **Derive culture-backed sorcery access from character state**.

The God Forgot Zzistori school is a culture-backed sorcery source. The app should activate it only for God Forgot Sorcerers who have selected No Cult. The label is `Zzistori School (God Forgot sorcery)`. It uses RAW Mythras sorcery mechanics from ADR-0006: Magic Points, Invocation, Shaping, and the Core sorcery spell list. The selected spells are persisted in `sorcerySpells`; no independent `sorcerySource` field is persisted for this deterministic case.

## Consequences

### Positive

- God Forgot Zzistori sorcerers can choose starting sorcery while remaining No Cult characters.
- The UI no longer implies that Zzistori sorcery is Arkat worship, theism, or Devotion-based.
- Source data stays in the existing culture magic profile and RAW sorcery reference files.
- Cult classification remains stable and auditable from cult skill patterns.

### Negative

- Step 9, Play Mode, PDF export, and validation now need to handle both cult-backed and culture-backed sorcery.
- Future non-cult schools may outgrow a single hard-coded eligibility rule and require a small generalized resolver.
- Imports from older characters with stale sorcery spells need validation guards so no-cult sorcery remains limited to eligible source states.

### Neutral

- Arkat remains a sorcery cult for characters who select Arkat.
- Generic No Cult characters still have no magic picker unless a cited culture-backed source applies.
- The Zzistori source can later be promoted into a broader school/tradition model without changing persisted character data.

## Source Authority

| Claim | Source |
|-------|--------|
| God Forgot is atheist/secularist and gods are not worshipped | `references/aig-raw/culture-magic-profiles-aig.json`, AiG p.30-31 |
| Zzistori are the blue wizard caste and Shaping is required alongside sorcerous skills | `references/aig-raw/culture-magic-profiles-aig.json`, AiG p.30-31 and p.59-60 |
| Sorcery uses Invocation, Shaping, Magic Points, and RAW Mythras spell rules | `references/mythras-raw/sorcery.json`, Mythras Core p.162-178 |
| Inline constants must mirror source-backed reference JSON | `docs/adr/003-attestable-data-chain.md`; `docs/adr/008-vision-source-authority.md` |

## Related

- `docs/adr/ADR-0006-full-magic-system-coverage.md`
- `docs/adr/003-attestable-data-chain.md`
- `docs/adr/008-vision-source-authority.md`
- `docs/plans/2026-05-21-003-feat-zzistori-sorcery-access-plan.md`
