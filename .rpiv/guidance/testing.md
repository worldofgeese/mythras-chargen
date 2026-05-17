# Test Architecture

## Test Files

| File | Type | Count | Runtime | Browser? |
|------|------|-------|---------|----------|
| `test-chargen.js` | Unit | ~235 | Node.js | No |
| `test-agent-api.mjs` | E2E | ~30 | Node.js + playwright-cli | Yes |
| `test-fixtures.mjs` | Regression | 24 fixtures | Node.js | Depends |
| `test-100-chars.mjs` | Stress | 100 random chars | Node.js + playwright-cli | Yes |
| `tests/unit/*.html` | Browser unit | varies | Browser | Yes (manual) |
| `tests/integration/*.html` | Integration | varies | Browser | Yes (manual) |

## Unit Tests (`test-chargen.js`)

Runs in Node.js without a browser. Extracts `<script>` blocks from `index.html`, evaluates them in a sandboxed context, then tests:

- PDF field validation
- Play Mode state compilation
- Data normalization (cult names, skill names)
- Validation layer (characteristic sums, skill point totals)
- `detectCultType()` classification for all 94 cults
- Combat style resolution
- Folk magic tooltip rendering
- Equipment generation

**Run:** `node test-chargen.js`

## E2E Tests (`test-agent-api.mjs`)

Uses `playwright-cli` (a CLI wrapper around Playwright) to drive a real browser. Builds 4 characters via `App.agent.buildCharacter()` and verifies:

- Theist character gets miracles
- Animist character gets bound spirits
- Sorcery character gets spells
- Hybrid cult character gets multiple magic types

**Prerequisites:**
```bash
python3 -m http.server 8765 --directory .
```

**Run:** `node test-agent-api.mjs`

The script manages its own browser session — opens at start, closes at end.

## Fixture Tests (`test-fixtures.mjs`)

Loads 24 character JSON files from `fixtures/` and validates them against the app's validation logic. Each fixture represents a complete character built through the wizard.

### Fixture Files (24 total)

Named by character identity: `vargast-windborn-orlanth.json`, `leika-earthmother-ernalda.json`, `garrath-spiritwalker-daka-fal.json`, etc.

Fixtures cover:
- All major cultures (Sartarite, Esrolian, Lunar, Praxian, Balazaring, Telmori)
- All magic types (theist, animist, sorcery, mysticism, hybrid)
- Edge cases (God Forgot atheist, Hsunchen wolf-brother)

## Browser Tests (`tests/`)

HTML files that run in-browser with manual inspection:

- `tests/unit/test-combat-styles.html` — combat style rendering
- `tests/unit/test-folk-magic-tooltips.html` — tooltip display
- `tests/integration/test-export-buttons.html` — PDF/JSON export
- `tests/integration/test-terminology.html` — Mythras terminology consistency
- `tests/test-runner.html` — aggregated runner

## Writing New Tests

For `test-chargen.js`:
- Add assertions using the `pass(msg)` / `fail(msg, details)` helpers
- Group under `section(title)` calls
- Data is available via the extracted script context (all globals accessible)

For fixtures:
- Build a character through the app (or Agent API)
- Export as JSON
- Save to `fixtures/` with descriptive name
- The fixture test will automatically pick it up
