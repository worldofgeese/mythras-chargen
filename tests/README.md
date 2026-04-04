# Mythras CharGen - Test Suite

## Overview

Lightweight test harness for the Mythras character generator. No build step, no external dependencies.

## Structure

```
tests/
├── test-runner.html       # Main test runner (open in browser)
├── unit/                  # Unit tests for functions and logic
│   ├── test-combat-styles.html
│   └── test-folk-magic-tooltips.html
├── integration/           # Integration tests for UI components
│   ├── test-terminology.html
│   └── test-export-buttons.html
└── e2e/                   # End-to-end tests (Playwright)
    └── character-creation-ux.spec.js
```

## Running Tests

### Prerequisites
Start a local HTTP server in the project root:
```bash
python3 -m http.server 8765
# or
npx http-server -p 8765
```

### Test Runner (All Tests)
Open in browser:
```
http://localhost:8765/tests/test-runner.html
```

This page loads all four test suites and displays:
- Overall summary at the top (Pass/Fail counts)
- Individual results for each test suite embedded in iframes
- Green = All Pass, Red = Has Failures

### Individual Test Files

Each test file can be run standalone by opening in browser:
- **Combat Styles (Unit)**: http://localhost:8765/tests/unit/test-combat-styles.html
- **Folk Magic Tooltips (Unit)**: http://localhost:8765/tests/unit/test-folk-magic-tooltips.html
- **Terminology (Integration)**: http://localhost:8765/tests/integration/test-terminology.html
- **Export Buttons (Integration)**: http://localhost:8765/tests/integration/test-export-buttons.html

### End-to-End Tests (Playwright)

```bash
# Install Playwright (first time only)
npm init playwright@latest

# Run E2E tests
npx playwright test tests/e2e/character-creation-ux.spec.js

# Run E2E tests with UI
npx playwright test --ui
```

## Writing Tests

### Test Structure

```javascript
describe('Feature Name', () => {
    it('should do something specific', () => {
        // Arrange
        const expected = 'foo';

        // Act
        const actual = someFunction();

        // Assert
        assert.equal(actual, expected);
    });
});
```

### Assertion Helpers

- `assert.equal(actual, expected, message)` - strict equality
- `assert.notEqual(actual, expected, message)` - strict inequality
- `assert.ok(value, message)` - truthy check
- `assert.throws(fn, message)` - expect function to throw
- `assert.includes(array, value, message)` - array contains value
- `assert.exists(value, message)` - not null/undefined

### TDD Approach

1. Write failing test first (RED)
2. Implement minimal code to pass (GREEN)
3. Refactor if needed (REFACTOR)
4. Commit when green

## Test Coverage

### Medium-Priority UX Fixes

- [x] Combat style name resolution (unit + integration)
- [x] Folk magic spell tooltips (unit + integration)
- [x] Professional Skills terminology (integration)
- [x] Export button clarity (integration)
- [x] End-to-end character creation flow

## CI/CD Integration

Tests can be automated via:
- GitHub Actions: Run Playwright tests on push
- Pre-commit hook: Run unit tests before commit
- Deployment: Require all tests green before merge

## Notes

- Browser tests use vanilla JS (no frameworks)
- Test runner is self-contained (no external CDN)
- All tests load `../index.html` for access to app code
- Tests follow TDD: write tests first, then implement
