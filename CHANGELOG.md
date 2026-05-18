# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- All 5 Mythras magic systems: Folk Magic, Theism, Animism, Sorcery, Mysticism (ADR-0006)
- Cult type auto-detection from skill patterns across 94 cults
- Sorcery spell picker with all 53 spells from Mythras Core p.166-177, 3-spell starting limit (Dedicated rank, Core p.165)
- Spirit picker with 14 templates and CHA/2 limit (Spirit Worshipper rank, Core p.136)
- Folk magic tooltips sourced from Adventures in Glorantha descriptions
- Progressive learning handouts with Combat, Magic, and Combined paths
- Shamatha-style winding SVG path navigation on all handouts
- AiG magic extraction pipeline producing 470KB of reference data
- Waha one-pager v6.0.1 integration with 10 manual E2E character fixtures
- 14 regression fixtures validated against source material
- 235 unit tests and 30 E2E assertions passing
- E2E acceptance test suite with page reference maps for handouts
- App.agent API for programmatic character creation
- Interactive miracle picker with rune-affinity highlighting and cult card previews
- Theist miracles extracted from 78/94 cult one-pager PDFs
- Theist Miracles and Rune Affinities in PDF export
- Companion/mount system for pre-gen characters
- (Any) skill disambiguation with datalist and free-text entry
- Language resolution per ADR-004 with casting rules reference table
- Expanded cult data, reference attestations, and equipment
- Passions dropdown with all Mythras types and subject input
- 6 Mythras Core reference JSONs (passions, backgrounds, etc.)
- Combat style auto-apply from career data
- Dense single-page PDF character sheet export
- ADR-0007: Hannu house rules documented (rune casting, devotional pool, rank progression)
- Path of Immanent Mastery cult extracted from notesfrompavis.blog (theist mechanics)
- Data attestability learnings documented in docs/solutions/
- Architecture guidance updated for magic system (`.rpiv/guidance/`)

### Changed

- Sorcery spell descriptions: all 53 replaced with vision-verified text from Mythras Core PDF
- Spell limit formula: INT/4 → 3 (Dedicated rank starting spells per Core p.165)
- Spirit slot formula: documented as Mythras Core p.136 (not house rule)
- CHA/2 binding limit verified from Mythras Core p.136 "Limits to Bound Spirits" table
- Rebuilt all 10 RQG pre-gens from source PDF with E2E tests
- Rebuilt Vasana and Ionara as fully conformant pre-gen fixtures
- Data fidelity hardening with 6 fixes for strict Gloranthan compliance
- Improved Step 9 cult UX and placeholder skill disambiguation
- Improved PDF layout spacing and section separation
- Reference JSONs (sorcery, animism, bird-in-hand) updated with verification metadata

### Fixed

- Play Mode crash when combatStyles[].weapons is string instead of array
- Repaired test suite with localStorage sandbox and missing fixtures
- Resolved Step 8 career professional skill selection bugs
- Resolved data/logic bugs in skill compilation and PDF export
- Repaired blocking UI bugs in miracle picker, rune dropdowns, and PDF
- Culture-appropriate language assignment for all characters (ADR-004)
- PDF attributes spacing and fallback calculations
- Architectural fixes for career-to-style resolution and culture-to-career filtering
- Culture passions with specific objects and formula consistency
- CSS bullet collision and PDF truncation issues
- Cleaned all miracle data to 0 UNVERIFIED runes and 0 parsing artifacts

### Removed

- Old quickstart documents (replaced by progressive handouts)
- Fabricated sorcery spell descriptions (12 were hallucinated by LLM)
- Fabricated INT/4 spell limit formula (no source existed)
