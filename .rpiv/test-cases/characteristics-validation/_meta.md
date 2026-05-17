# Feature: Characteristics Validation

## Summary

Validates the 7 characteristics (STR, CON, SIZ, DEX, INT, POW, CHA) during character creation. Constraints: sum must equal 75, each minimum 3, INT and SIZ minimum 8 (for human characters).

## Source Files

- `index.html` (characteristics step validation logic, char-grid UI)
- `references/mythras-raw/characteristics.json` (rules reference)

## Key Behaviors

1. 7 input fields for STR, CON, SIZ, DEX, INT, POW, CHA
2. Sum must equal exactly 75
3. Each characteristic minimum value = 3
4. INT minimum = 8 (human species requirement)
5. SIZ minimum = 8 (human species requirement)
6. Real-time sum display with remaining points
7. Validation error messages for constraint violations
8. Cannot advance to next step if invalid
9. Derived attributes update as characteristics change

## Boundary Conditions

- Sum = 75 with all at minimum (3,3,8,3,8,3,3 = 31... need redistribution)
- Sum = 74 → invalid (under)
- Sum = 76 → invalid (over)
- INT = 7 → invalid (below human minimum)
- SIZ = 7 → invalid (below human minimum)
- STR = 2 → invalid (below absolute minimum)
- STR = 0 → invalid
- Negative values → invalid
- Non-integer values → invalid or rounded
- All characteristics at maximum feasible values
- Single characteristic at 18 (typical max for point-buy)

## Existing Coverage

- `test-chargen.js` validates fixture characteristics sum to 75

## Test Types Needed

- Unit: Sum validation (exactly 75)
- Unit: Minimum value enforcement (3 general, 8 for INT/SIZ)
- Unit: Derived attribute calculation from characteristics
- Integration: Real-time sum counter updates
- Integration: Error messages appear for violations
- Integration: Next button disabled when invalid
- E2E: Enter valid characteristics → advance

## Fixtures to Use

- All 24 fixtures (each should have sum = 75)
- Synthetic edge cases for boundary testing
