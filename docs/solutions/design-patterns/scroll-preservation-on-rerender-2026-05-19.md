---
title: Scroll Preservation on Re-render
date: 2026-05-19
category: design-patterns
module: wizard-step-rendering
problem_type: design_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - A user interaction must call renderCurrentStep() but should not jump to top
  - Cult selection or major toggle triggers full DOM replacement
  - Test environments lack window.scrollTo
tags:
  - scroll-position
  - render-current-step
  - request-animation-frame
  - test-guard
  - ux-continuity
---

# Scroll Preservation on Re-render

## Context

Some interactions — cult selection, spirit/sorcery toggle — necessarily require a full `renderCurrentStep()` because they change which sections are visible. However, the user has typically scrolled down to reach these controls, and jumping back to the top after their click is disorienting. Additionally, Node.js test environments don't have `window.scrollTo`, so scroll restoration code must be guarded.

## Guidance

Save `window.scrollY` before `renderCurrentStep()`, then restore it via `requestAnimationFrame` after the DOM settles. Guard scroll calls for test environments.

```javascript
function selectCult(cultName) {
  const savedScroll = window.scrollY;
  
  CharacterData.cult = cultName;
  App.renderCurrentStep();
  
  // Restore after browser paints the new DOM
  if (window.scrollTo) {
    requestAnimationFrame(() => window.scrollTo(0, savedScroll));
  }
}
```

## Why This Matters

Without scroll preservation, every cult selection or toggle click sends the user back to the top of a long step. In Step 9, which can be 800+ pixels tall with cult cards, boost panels, and miracle pickers, this forces repeated scrolling and breaks the user's mental model of "I clicked something where I was."

The `requestAnimationFrame` wrapper is essential — restoring scroll synchronously before the browser paints the new DOM has no effect because the DOM height may change. RAF ensures the browser has laid out the new content before repositioning.

## When to Apply

- Cult selection (Step 9) — triggers full re-render to show/hide miracle/spirit/sorcery pickers
- Spirit/sorcery spell toggle — when toggle changes which picker sections are visible
- Any future interaction that requires `renderCurrentStep()` but occurs mid-page

## Examples

Guard pattern for test environments:

```javascript
// Node.js tests: window.scrollTo is undefined
// Browser: window.scrollTo is a function
function safeScrollRestore(savedY) {
  if (typeof window !== 'undefined' && window.scrollTo) {
    requestAnimationFrame(() => window.scrollTo(0, savedY));
  }
}
```

Combined with cult selection:

```javascript
function onCultCardClick(cultName) {
  const savedScroll = window.scrollY;
  
  CharacterData.cult = cultName;
  CharacterData.miracles = [];
  CharacterData.sorcerySpells = [];
  CharacterData.boundSpirits = [];
  
  App.renderCurrentStep();
  safeScrollRestore(savedScroll);
}
```

## Related

- [In-Place DOM Update vs renderCurrentStep()](./in-place-dom-update-vs-full-rerender-2026-05-19.md) — prefer in-place updates when possible to avoid needing scroll preservation at all
