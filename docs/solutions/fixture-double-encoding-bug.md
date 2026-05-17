# Fixture Double-Encoding Bug

## Problem

Playwright's `page.evaluate(() => JSON.stringify(CharacterData))` returns a JSON string. When captured in Python via the playwright-cli `eval` command, the result is already a string. Saving it with `json.loads(raw)` produces a Python string (not a dict) because the outer layer is a JSON-encoded string containing JSON.

Symptom: fixture files contain a single string value instead of an object, or downstream code fails expecting a dict but gets a str.

## Solution

```python
data = json.loads(raw)
if isinstance(data, str):
    data = json.loads(data)  # unwrap double-encoding
```

Always check whether the first `json.loads()` result is a string. If so, decode again.

## Key Insight

Any time you capture `JSON.stringify(obj)` output through a tool that also JSON-encodes its transport (like playwright's eval protocol), you get double-encoding. The fix is a type check, not blindly calling loads twice.

## When to Apply

- Saving browser-evaluated data to fixture files.
- Any pipeline where JS `JSON.stringify` output passes through another JSON serialization layer.
- Debugging fixtures that look like `"{\"name\":...}"` (escaped quotes at the top level).
