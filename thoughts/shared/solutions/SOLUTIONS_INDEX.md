# Solutions Index — Phase 2 Gap Analysis

## Documents

### [phase2-gap-analysis-and-solutions.md](./phase2-gap-analysis-and-solutions.md)
**641 lines | Comprehensive exploration of 4 gaps + solution approaches**

Explores four significant gaps in the mythras-chargen project:

1. **Gap 1: PDF Content for Non-Theist Cults**
   - Problem: Sorcery/animist PDFs show only generic placeholders
   - 3 approaches compared (Unified Template, Dedicated Sections, QR Codes)
   - **Recommended:** Approach A (Unified Enhanced Template) → Phase 3: Approach B

2. **Gap 2: Spirit Stat Blocks**
   - Problem: 12 generic templates; Monster Island data not integrated
   - 3 approaches compared (Simple Picker, Full Stat Blocks, Hybrid Export)
   - **Recommended:** Approach A (Simple Picker) → Phase 3: Approach B

3. **Gap 3: Mysticism Implementation**
   - Problem: System detected but no UI; no Kralori/Draconic cults yet
   - 3 approaches compared (Placeholder, Talent Tree, Path Selection)
   - **Recommended:** Approach C (Path Selection) → Phase 3: Approach B

4. **Gap 4: Sorcery Spell Effects**
   - Problem: 34 spell names exist; full descriptions not integrated
   - 4 approaches compared (Page References, Summaries, Companion Reference, Inline)
   - **Recommended:** Approach A (Page References) → Phase 3: Approach C

## Key Findings

### Recommended Phase 2 Roadmap (3–4 days total)

| Week | Gap | Approach | Effort | Outcome |
|------|-----|----------|--------|---------|
| 1 | 2 | A (Simple Spirit Picker) | 1 day | Unblocks animist chargen |
| 2 | 1 | A (Unified PDF Template) | 1–2 days | Shows sorcery/animist details |
| 3 | 3 | C (Path Selection) | 1 day | Unblocks mysticism cults |
| 4 | 4 | A (Page References) | < 1 day | Provides spell context |

### Phase 3 Roadmap (Future refinements)

All Phase 2 approaches are designed to be extended in Phase 3:
- Gap 1: Refactor into dedicated per-magic-type PDF sections
- Gap 2: Expand to full stat block picker with Monster Island data
- Gap 3: Implement full talent tree UI once Kralori cults arrive
- Gap 4: Generate companion spell reference HTML

## Design Principles

1. **Ship Fast, Iterate:** Phase 2 uses lightweight approaches to unblock chargen quickly
2. **Gather Feedback:** Real-world usage will inform Phase 3 refinements
3. **Minimize Scope:** Each Phase 2 approach is pragmatic, not over-engineered
4. **Plan Ahead:** Phase 3 roadmap is documented; no surprises

## Implementation Notes

- **Dependency:** Gap 1 depends on Gap 2 (need spirit data to display)
- **Independence:** Gaps 3 and 4 can be implemented in parallel
- **Risk Mitigation:** Each approach includes risk assessment and mitigation strategies
- **Testing:** All approaches include success criteria for validation

## Related Documents

- `docs/plans/full-magic-system-implementation.md` — Phase 1 completion (all 5 magic systems)
- `references/mythras-raw/mysticism.json` — Mysticism system extraction
- `references/mythras-raw/sorcery.json` — Sorcery spell extraction
- `references/spirits-raw/monster-island.json` — Spirit stat block extraction
- `references/spirits-raw/bird-in-hand.json` — Alternative spirit source
