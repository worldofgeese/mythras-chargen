# Combat style and social class validation gaps

## Bug report

- **Expected:** A culture with multiple unrestricted combat styles must require the player to choose one before Step 5, so Play Mode has a combat style to derive weapon percentages. Step 12 must require rolling or manually selecting a social class before Step 13/Play Mode.
- **Actual:** Daka Fal/Praxian manual QA reached Play Mode with `CharacterData.combatStyles = []`, so Sling displayed at 0%. The same character also reached Play Mode with a blank Social Class field.
- **Reproduction:** In the browser QA flow, select Praxian without choosing a combat style, continue through the wizard, and complete Step 13. Play Mode shows no combat styles and the Sling weapon skill at 0%; if Step 12 is skipped, Social Class is blank.

## Root cause

- `index.html:2689-2697` only required culture selection on Step 4; it did not check `_pendingCombatStyleSelection` or `CharacterData.combatStyles`.
- `index.html:2828-2834` had no Step 12 validation before returning `true`, allowing completion with `CharacterData.socialClass = null`.
- `index.html:4017-4046` is the structured validation API used by agents; it likewise lacked Step 4 combat style and Step 12 social-class errors.

## Investigation log

1. Reproduced during Daka Fal manual QA: Play Mode rendered a Sling row at 0% and no combat style card.
2. Inspected live browser state and found `CharacterData.combatStyles` was empty while `CharacterData.weapons` contained Sling.
3. Traced Step 4: Praxian has multiple unrestricted combat styles and sets `_pendingCombatStyleSelection`, but `validateCurrentStep()` did not enforce selecting one.
4. Traced Step 12: the UI told the player to roll/select a social class, but `validateCurrentStep()` and `getValidationState()` did not enforce it.
5. Added regression tests in `test-chargen.js:4845-4898`, verified they failed, then added the validation checks.

## Resolution status

Fixed. `node test-chargen.js` passes with 289/289 tests.
