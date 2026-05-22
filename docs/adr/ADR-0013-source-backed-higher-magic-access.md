---
title: "Source-Backed Higher Magic Access"
adr: ADR-0013
status: Proposed
date: 2026-05-22
prd: "N/A"
decision: "Represent Animism, Sorcery, and Mysticism as independent magic systems whose character access must come from source-backed cult, tradition, school, or culture/career access providers"
---

# ADR-0013: Source-Backed Higher Magic Access

## Status

Proposed

## Date

2026-05-22

## Requirement Source

- **PRD**: N/A
- **Bead**: `mythras-chargen-w6si`
- **Decision Point**: Determine whether Animism, Sorcery, and Mysticism should be spun out from Step 9 cult selection gating.

## Context

ADR-0006 established that the chargen must support all five Mythras magic systems. The current implementation detects higher-magic access mostly through selected cult skills: Trance/Binding for Animism, Invocation/Shaping for Sorcery, and Mysticism/Meditation for Mysticism. That correctly handles cult-mediated examples such as Arkat or Waha, but it risks conflating two different concepts: the mechanical magic system a character uses and the social/source path that teaches or grants access to it.

The source record now shows that these are separate concerns. Mythras Core's magic overview says starting magic access depends on culture, career, and setting accessibility, while cult membership is an optional stage that offers training, magic, and social networks (`references/mythras-raw/magic-overview.json`, p.34-37). Core Animism and Sorcery are mechanically independent systems with their own skills (`references/mythras-raw/animism.json`, p.131-154; `references/mythras-raw/sorcery.json`, p.162-178). Core Mysticism is present in repo data but remains unverified (`references/mythras-raw/mysticism.json`, `verified: false`), so app-facing Mysticism work still needs source verification before promotion.

Setting sources then bind those systems to concrete access organizations. Monster Island's verified spirit-cult pages show animism expressed through totemic cult/social ranks (`references/sources/pages/monster-island.json`, pages 133-140 and 285-286). Gloranthan one-pagers show Waha as a verified hybrid cult with Devotion, Runic Affinity, and Trance; Daka Fal as an ancestor/spirit society path with Binding and Trance; and Arkat as a sorcery cult with Invocation and Shaping. Adventures in Glorantha bounded evidence also supports God Forgot/Zzistori as a culture-backed sorcery school path rather than worship (`references/sources/evidence/aig/page-0031-extraction.json`, `page-0060-extraction.json`, `page-0061-extraction.json`, `page-0062-extraction.json`, with independent verification artifacts for the same pages).

ADR-0010 already models the first non-cult case: a God Forgot Sorcerer with No Cult derives Zzistori school sorcery from culture/career/cult state. The open architectural question is whether that should become a general free-standing magic-system picker, stay purely cult-gated, or become a more explicit source-backed access model.

## Decision Drivers

- Preserve RAW distinction between magic systems and the organizations or cultural paths that teach them.
- Avoid granting Animism, Sorcery, or Mysticism as free picks without source-backed training/access.
- Avoid misrepresenting non-cult sources such as God Forgot/Zzistori as cults.
- Keep cult skill-pattern detection useful for cult-mediated access.
- Keep app-facing facts gated by the source-attestation chain from ADR-0009 and ADR-0012.
- Keep Mysticism blocked until verified Core pages and at least one source-backed access path exist.

## Considered Options

### Option 1: Keep all higher magic cult-gated

Require a selected cult for every Animism, Sorcery, or Mysticism picker.

- Good, because it preserves the original Step 9 structure and the existing `detectCultType()` classifier.
- Good, because it prevents unsupported free magic access.
- Bad, because it cannot represent source-backed non-cult paths such as God Forgot/Zzistori without creating pseudo-cults.
- Bad, because it treats cult access as the rule rather than one access-provider type.
- Bad, because it contradicts Mythras Core's culture/career/setting access framing.

### Option 2: Add a free-standing magic-system picker

Let the player choose Animism, Sorcery, or Mysticism directly, independent of cult, culture, career, or source-specific school/tradition membership.

- Good, because it makes the systems visibly independent.
- Good, because it can support many future settings without extra access-model work.
- Bad, because it grants higher magic without a cited training or access source.
- Bad, because it bypasses setting constraints, cult/school spell lists, and source provenance.
- Bad, because unsupported Mysticism paths could enter the app before verified source evidence exists.

### Option 3: Use source-backed access providers

Model Animism, Sorcery, and Mysticism as independent mechanical systems, but expose character access only through source-backed providers: cults, spirit traditions/societies, sorcery schools, mystic orders, or deterministic culture/career paths.

- Good, because it matches Core's system/access split.
- Good, because cults remain valid access providers without being the only access providers.
- Good, because non-cult cases such as God Forgot/Zzistori can remain No Cult while still receiving school-backed sorcery.
- Good, because each provider can carry its own source revision, pages, skills, spell/spirit lists, and UI label.
- Bad, because Step 9 needs a clearer access-source abstraction instead of assuming selected cult equals magic source.
- Bad, because additional source verification is required before adding Mysticism or new non-cult traditions.

## Decision

Chosen option: **Use source-backed access providers**.

Animism, Sorcery, and Mysticism are independent magic systems in the data model and UI language. They should not be represented as inherently cult-based schools. However, character creation should not offer a generic free picker for those systems. Access must come from an attested provider: a cult, spirit tradition/society, sorcery school, mystic order, species/culture rule, career rule, or another source-backed path.

For current implementation work, keep cult skill-pattern detection as the cult-backed provider path, keep ADR-0010's God Forgot/Zzistori resolver as the culture-backed sorcery provider path, and amend ADR-0006's Mysticism status: Mysticism remains a target Mythras magic system for eventual coverage, but it is not app-facing or implementable until `references/mythras-raw/mysticism.json` is human/vision verified and at least one cited access provider exists.

Higher-magic access resolution is fail-closed and provider-scoped. A picker appears only for providers resolved from current character state. Cult-backed providers come from the selected cult. Deterministic culture, career, or species providers apply only under their cited eligibility conditions; if a provider says `cultRequired: false`, it applies only when the character has selected No Cult unless the source explicitly says it stacks with cult membership. If multiple providers validly apply, UI, API, and PDF output must keep selections partitioned by provider and limited to that provider's cited spell, spirit, or talent list. No provider may fall back to an unrestricted Core system list unless the provider source explicitly grants open access.

## Consequences

### Positive

- Step 9 can represent Arkat and Waha as cult-backed higher magic while representing God Forgot/Zzistori as no-cult, school-backed sorcery.
- Future Animism, Sorcery, and Mysticism work has a consistent rule: add providers with source evidence instead of adding pseudo-cults or free picks.
- The source-attestation chain remains the authority for what magic access appears in the app.
- UI and API language can distinguish "magic system" from "access source".

### Negative

- Step 9 validation, agent APIs, PDF output, and tests need to understand provider-backed higher magic, not only cult-backed higher magic.
- Existing references may need migration from cult-only fields toward provider/source fields as more non-cult paths are added.
- Mysticism remains blocked until Core page verification and source-backed access-provider evidence are complete.

### Neutral

- Cult selection remains the main visible path for cultures/cults that teach higher magic through cult membership.
- Arkat remains a sorcery cult; Waha remains hybrid theist/animist; Daka Fal remains an ancestor/spirit-society example.
- No existing No Cult character gains higher magic unless a cited provider applies.

## Source Authority

| Claim | Source |
|-------|--------|
| Magic starting access can depend on culture, career, and setting accessibility; cult membership is optional and provides training/magic/social networks | `references/mythras-raw/magic-overview.json`, Mythras Core p.34-37 |
| Animism has independent Core mechanics and skills | `references/mythras-raw/animism.json`, Mythras Core p.131-154 |
| Sorcery has independent Core mechanics, Invocation/Shaping, source types, and schools | `references/mythras-raw/sorcery.json`, Mythras Core p.162-178 |
| Mysticism data is not yet verified for app-facing promotion | `references/mythras-raw/mysticism.json` |
| Monster Island bounded page evidence supports ADR-level examples of animism through totemic/spirit cult structures; because the Monster Island source revision is still `permission_pending`, these facts must not become app-facing providers/constants until lifecycle, normalized reference, provenance, and proof gates are complete | `references/sources/pages/monster-island.json`, pdf pages 133-140 and 285-286 |
| Waha is a verified hybrid cult-backed access example | `references/cults-raw/praxian/waha.json`, `references/sources/pages/waha.json` |
| Arkat is a sorcery cult example; Daka Fal is an ancestor/spirit-society example | `references/cults-raw/darkness/arkat.json`, `references/cults-raw/praxian/daka-fal.json` |
| God Forgot/Zzistori app behavior is governed by ADR-0010 and existing promoted culture-backed sorcery data; AiG pages 31, 60, 61, and 62 are verified bounded evidence for the broader source-backed rationale but remain subject to ADR-0012 promotion gates | `docs/adr/ADR-0010-culture-backed-sorcery-sources.md`, `references/sources/pages/aig.json`, `references/sources/evidence/aig/page-0031-*`, `page-0060-*`, `page-0061-*`, `page-0062-*` |

## Related

- **ADRs**: `docs/adr/ADR-0006-full-magic-system-coverage.md` (amended for Mysticism promotion status; ADR-0006's Mysticism extraction/checkmark is stale until verification/provider evidence exists), `docs/adr/ADR-0009-source-artifact-lifecycle.md`, `docs/adr/ADR-0010-culture-backed-sorcery-sources.md`, `docs/adr/ADR-0012-aig-bounded-vision-source-lifecycle.md`
- **Implementation**: `mythras-chargen-w6si`, `mythras-chargen-2yg7.5`
