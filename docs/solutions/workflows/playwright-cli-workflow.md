# Playwright-CLI Workflow

## Problem

Need a fast feedback loop for testing the character generator in a real browser without writing full test scripts.

## Solution

Use the `playwright-cli` tool in sequence:

```bash
playwright-cli open          # launch browser
playwright-cli goto <url>    # navigate to the app
playwright-cli eval "..."    # run JS in page context
```

### Cache Busting

The browser caches aggressively. Append a timestamp query param to force fresh loads:

```bash
playwright-cli goto "http://localhost:8080/index.html?v=$(date +%s)"
```

### Clean Output

Use `--raw` flag when you need machine-parseable output (no decorative framing):

```bash
playwright-cli eval --raw "JSON.stringify(CharacterData)"
```

## Key Insight

`open` → `goto` → `eval` is the minimal loop. The browser instance persists between commands, so you can iterate on `eval` calls without reloading. Cache busting is essential during development — without it you test stale code.

## When to Apply

- Quick-checking that a code change works in the browser.
- Extracting runtime state (CharacterData, DOM values) for fixture generation.
- Debugging rendering issues interactively.
