# Feature: Bonus Skill Allocation

## Summary

150 or 200 bonus points (depending on character age) for distributing across any skills on the character sheet. Represents life experience and personal development.

## Source Files

- `index.html` (bonus skill allocation step in wizard)
- `references/mythras-raw/age-bonus-points.json` (age-to-points mapping)

## Key Behaviors

1. Budget determined by age: younger = 150, older = 200
2. Points can go to ANY skill (not limited to culture/career lists)
3. Budget tracker shows remaining points
4. Budget tracker color states
5. Cannot advance if budget != 0
6. Per-skill cap may apply (e.g., no skill above certain total at creation)
7. Can allocate to standard skills, professional skills, or combat styles
8. Cumulative with cultural + career allocations

## Boundary Conditions

- Age threshold for 150 vs 200 points
- Allocating to a skill not in culture/career list (any standard skill)
- Maximum single-skill allocation
- Total skill value cap at character creation
- Very young character (150 pts) vs experienced (200 pts)
- Budget exactly at 0 → can advance

## Existing Coverage

- None

## Test Types Needed

- Unit: Age → bonus points mapping
- Unit: Budget calculation with variable total
- Integration: All skills available for allocation (not just culture/career)
- Integration: Budget tracker with correct total (150 or 200)
- Integration: Cumulative totals display (cultural + career + bonus)
- E2E: Full allocation → advance to next step

## Fixtures to Use

- `vasana.json` (standard age)
- `vishi.json` (potentially different age)
- Any fixture with age data
