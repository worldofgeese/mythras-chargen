# Feature: Fixture Loading

## Summary

24 pre-built character fixtures (JSON files) that can be loaded into the app. Each fixture represents a complete character with all fields populated. Used for testing, demos, and as starting templates.

## Source Files

- `fixtures/*.json` (24 character files)
- `index.html` (App.loadCharacter, fixture loading logic)

## Key Behaviors

1. Each fixture loads without errors
2. All required fields present in fixture JSON
3. Loaded fixture populates all wizard steps correctly
4. Loaded fixture renders correctly in Play Mode
5. Characteristics sum to 75 in each fixture
6. Skill allocations within budget in each fixture
7. Magic selections within limits for cult type
8. Combat styles reference valid weapons

## Boundary Conditions

- Fixture with missing optional fields loads gracefully
- Fixture with unknown cult name handled
- Loading a fixture over existing data replaces cleanly
- Corrupt/malformed JSON shows error message

## Existing Coverage

- `test-chargen.js` validates fixture structure and data integrity

## Test Types Needed

- Unit: JSON schema validation for all 24 fixtures
- Unit: Characteristics sum = 75 for each fixture
- Unit: Skill budgets within limits for each fixture
- Unit: Magic selections within cult-type limits
- Integration: Load each fixture → Play Mode renders without errors
- Regression: Any new fixture added must pass same validation

## Fixtures to Use

- All 24: aranda, balazaring-hunter, biturian-varosh-waha, dazarim, garrath-spiritwalker-daka-fal, harmast, indrodar-greydog-humakt, ionara, krogar-deathwind-storm-bull, leika-earthmother-ernalda, malkion-grey-arkat, nathem, norana-hearthkeeper-hearth-mother, praxian-beast-rider, sartarite-warrior, sorala, telmori-wolfbrother, torath-sunspear-yelmalio, vargast-windborn-orlanth, vasana, vishi, vostor, yanioth, yara-moonweaver-jakaleel
