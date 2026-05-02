# ADR-004: Language-to-Homeland Mapping

**Status:** accepted  
**Date:** 2026-05-02  
**Deciders:** Kypris  

## Context

Mythras professional skills include `Language (any)` as a wildcard — the player chooses which language to learn. In Glorantha, different homelands speak different languages. The generic chargen flow accepts "Language (any)" but Play Mode needs concrete language names.

We need a canonical mapping from culture/homeland → specific languages to resolve these wildcards at character creation time.

## Evidence

### Source 1: Adventures in Glorantha (GenCon 2015 Preview)

AiG defines 8 cultures with implicit linguistic regions:
- **Sartarite** (p.29-30): Dragon Pass / Sartar — Heortling language + Tradetalk
- **Esrolian** (p.31-32): Holy Country / Esrolia — Esrolian language + Tradetalk
- **Lunar Heartland** (p.33-34): Peloria heartland — New Pelorian + Tradetalk
- **Lunar Provincial** (p.35): Provinces (Tarsh, etc.) — Local language (context-dependent) + Tradetalk
- **Praxian** (p.36-37): Prax — Praxian + Tradetalk
- **Balazaring** (p.38): Balazar — Balazaring (no Tradetalk attestation)
- **Tarshite** (referenced in cultures but no dedicated page): Tarsh — Tarshite + Tradetalk
- **God Forgot** (p.39-40): Brithini isolate — Brithini language + Tradetalk

### Source 2: RuneQuest Glorantha (Chaosium, 2018)

While we use Mythras (TDM) mechanics, RQG is the authoritative Glorantha setting source. It confirms:
- **Heortling** is the language of Sartar/Dragon Pass (RQG p.391)
- **Tradetalk** is the universal trade language across Genertela (RQG p.391)
- **New Pelorian** is the Lunar Empire official language (RQG p.391)
- **Esrolian** is the Holy Country language variant (RQG p.391)
- **Praxian** is the language of the wastes (RQG p.391)
- **Balazaring** is attested as a language (community knowledge)

### Source 3: Notes from Pavis Cult One-Pagers

Cult one-pagers reference "Tradetalk" ubiquitously for civilised/barbarian/nomad cultures but NOT for isolated primitives (e.g., Balazaring, Telmori).

## Decision

We establish a **canonical language resolution table** for the 8 AiG cultures:

| Culture | Homeland Language | Secondary Language | Source |
|---------|-------------------|-------------------|--------|
| Sartarite (Heortling) | Language (Heortling) | Tradetalk | AiG p.29-30, RQG p.391 |
| Esrolian | Language (Esrolian) | Tradetalk | AiG p.31-32, RQG p.391 |
| Lunar Heartland | Language (New Pelorian) | Tradetalk | AiG p.33-34, RQG p.391 |
| Lunar Provincial | Language (Local) | Tradetalk | AiG p.35, RQG p.391 |
| Praxian | Language (Praxian) | Tradetalk | AiG p.36-37, RQG p.391 |
| Balazaring | Language (Balazaring) | — | AiG p.38, community |
| Tarshite | Language (Tarshite) | Tradetalk | Inferred from RQG |
| God Forgot | Language (Brithini) | Tradetalk | AiG p.39-40, RQG p.391 |
| Telmori Hsunchen | Language (Heortling) | — | They live in Sartar (AiG p.41) |

**Implementation rule:**
- When a culture/career grants `Language (any)`, resolve to the homeland language
- Civilised/Barbarian/Nomad cultures assume Tradetalk accessibility (not auto-granted, but available for selection)
- Primitives (Balazaring, Telmori) do NOT get Tradetalk unless explicitly acquired

**UI behavior:**
- Career professional skills listing `Language (any)` show a datalist with homeland language + Tradetalk
- Player can still type a custom language (e.g., "Language (Dara Happan)") if justified by background

## Consequences

- `Language (any)` wildcards are resolved at character creation time, not deferred
- Native Tongue remains separate (auto-calculated as INT+CHA per Mythras Core p.12)
- The disambiguation logic already in the codebase (for skills like "Lore (any)") extends to languages
- PDF export and Play Mode display concrete language names, not "(any)"

## Attestation

| Claim | Source |
|-------|--------|
| Heortling is Sartar's language | RQG p.391, AiG p.29-30 |
| Tradetalk is universal trade language | RQG p.391, AiG (implicit across all cultures) |
| New Pelorian is Lunar official language | RQG p.391, AiG p.33-34 |
| Esrolian language exists | RQG p.391, AiG p.31-32 |
| Praxian language | RQG p.391, AiG p.36-37 |
| Balazaring language | AiG p.38, community knowledge |
| Brithini language for God Forgot | AiG p.39-40 (Brithini are God Forgot people) |
| Telmori live in Sartar | AiG p.41 |

## Implementation Notes

The language resolution follows the existing pattern for skill disambiguation:
1. Check if skill is `Language (any)`
2. Look up culture in LANGUAGE_RESOLUTION_TABLE
3. Return datalist with homeland + Tradetalk (if applicable)
4. Allow free-text entry for custom languages
