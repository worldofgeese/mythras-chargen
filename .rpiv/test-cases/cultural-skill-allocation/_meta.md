# Feature: Cultural Skill Allocation

## Summary

100-point budget for distributing skill points among culture-specific skills. Each culture provides a list of skills; player distributes exactly 100 points across them with per-skill and total constraints.

## Source Files

- `index.html` (cultural skill allocation step in wizard)
- `references/mythras-raw/cultures.json` (culture skill lists)
- `references/aig-raw/cultures.json` (AiG culture additions)

## Key Behaviors

1. Display skills available for selected culture
2. Budget tracker shows remaining points (starts at 100)
3. Points can be distributed freely among listed skills
4. Budget tracker turns green at exactly 0 remaining
5. Budget tracker turns red if overspent (negative)
6. Cannot advance to next step if budget != 0
7. Per-skill maximum enforced (typically no more than +15 per skill at this stage)
8. Base values shown (from characteristics)

## Boundary Conditions

- Exactly 100 points allocated → valid (green)
- 99 points allocated → invalid (cannot advance)
- 101 points allocated → overspent (red warning)
- 0 points in a skill → valid (skill keeps base value)
- All points in one skill → may hit per-skill cap
- Culture with many skills (10+) → UI scrollable
- Culture with few skills (3-4) → higher per-skill allocation needed

## Existing Coverage

- None (budget logic not directly tested)

## Test Types Needed

- Unit: Budget calculation (sum of allocations = 100)
- Unit: Per-skill cap enforcement
- Integration: Budget tracker color states (green/red/yellow)
- Integration: Next button disabled when budget != 0
- Integration: Base values display correctly per culture
- E2E: Allocate 100 points → advance to next step

## Fixtures to Use

- `sartarite-warrior.json` (Sartarite culture)
- `praxian-beast-rider.json` (Praxian culture)
- `balazaring-hunter.json` (Balazaring culture)
