# Diagnosis: Pimper's Block homeland selection

## Bug report

- Expected: selecting the Praxian homeland "Pimper's Block" should set `CharacterData.homeland` and keep the Step 4 UI usable.
- Actual: clicking "Pimper's Block" produced `SyntaxError: missing ) after argument list` because the generated inline handler contained an unescaped apostrophe.
- Reproduction: open Step 4, choose Praxian culture, click "Pimper's Block".

## Root cause

- `index.html:3528` defines the Praxian homeland as `Pimper\x27s Block`, which evaluates to `Pimper's Block`.
- The old Step 4 renderer interpolated that value directly into `onclick="App.selectHomeland('${h}')"`, so the rendered handler became syntactically invalid JavaScript for values containing `'`.
- A scan of `App.getHomelandSuggestions()` found only one homeland with quote/HTML-sensitive characters: `Praxian: Pimper's Block`.

## Investigation log

1. Reproduced the failure from the screenshot by inspecting the Step 4 rendered handler path and confirming the raw homeland interpolation.
2. Audited all homeland suggestions for quote, backtick, backslash, and HTML-sensitive characters. Only Pimper's Block matched.
3. Replaced the raw single-quoted handler argument with `data-homeland` plus `onclick="App.selectHomeland(this.dataset.homeland)"` at `index.html:3392-3400`.
4. Added `App.escapeHtmlAttr()` at `index.html:2475-2481` so generated attribute values are escaped before insertion.
5. Added a regression test at `test-chargen.js:403-431` to assert Pimper's Block uses the safe data-attribute handler and no longer renders `App.selectHomeland('Pimper...`.
6. Checked other generated inline handlers for the same apostrophe pattern. The homeland list only had Pimper's Block, but bonus skill controls could hit the same issue with the existing `Loved one's` skill name, so those handlers now also pass the selected skill via `data-skill`.

## Resolution status

Fixed in the Decapod worktree. `node test-chargen.js` passes, and the browser click path sets `CharacterData.homeland` to `Pimper's Block` without errors.
