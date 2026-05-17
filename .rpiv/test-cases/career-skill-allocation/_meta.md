# Feature: Career Skill Allocation

## Summary

100-point budget for distributing skill points among career-specific skills. Each career provides a skill list; player distributes exactly 100 points with constraints.

## Source Files

- `index.html` (career skill allocation step in wizard)
- `references/mythras-raw/careers-detail.json` (career skill lists)
- `references/mythras-raw/careers-by-culture.json` (culture-career mapping)

## Key Behaviors

1. Display skills available for selected career
2. Budget tracker shows remaining points (starts at 100)
3. Points distributed freely among career skills
4. Budget tracker color states (green=complete, red=overspent, yellow=remaining)
5. Cannot advance if budget != 0
6. Career skills may overlap with cultural skills (cumulative)
7. Professional skills from career added to character's skill list
8. Base values include any prior cultural allocation

## Boundary Conditions

- Exactly 100 points → valid
- Career skills overlapping cultural skills show cumulative total
- Professional skills not previously on sheet get added with base value
- Career with many skills vs few skills
- Switching career mid-wizard resets career allocations

## Existing Coverage

- None

## Test Types Needed

- Unit: Budget calculation
- Unit: Cumulative skill values (cultural + career)
- Integration: Professional skills added to sheet
- Integration: Budget tracker states
- Integration: Career change resets allocations
- E2E: Full allocation → advance

## Fixtures to Use

- `sartarite-warrior.json` (Warrior career)
- `ionara.json` (different career)
- `harmast.json` (different career)
