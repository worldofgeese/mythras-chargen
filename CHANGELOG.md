# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- All 5 Mythras magic systems: Folk Magic, Theism, Animism, Sorcery, Mysticism (ADR-0006)
- Cult type auto-detection from skill patterns across 94 cults
- Sorcery spell picker with 34 spells and INT/4 limit enforcement
- Spirit picker with 12 templates and CHA/2 limit enforcement
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
- ADRs for magic system architecture, casting model, and attestable data

### Changed

- Rebuilt all 10 RQG pre-gens from source PDF with E2E tests
- Rebuilt Vasana and Ionara as fully conformant pre-gen fixtures
- Data fidelity hardening with 6 fixes for strict Gloranthan compliance
- Improved Step 9 cult UX and placeholder skill disambiguation
- Improved PDF layout spacing and section separation
- Career-culture mapping, weapon dedup, and passion resolution improvements

### Fixed

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
