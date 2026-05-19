---
title: DOM Container Isolation Pattern
date: 2026-05-19
category: design-patterns
module: wizard-step-rendering
problem_type: design_pattern
component: frontend_stimulus
severity: high
applies_when:
  - Multiple UI sections share a single parent container
  - Any section uses innerHTML assignment for re-rendering
  - Independent pickers (miracle, spirit, sorcery) coexist in one step
tags:
  - dom-isolation
  - innerhtml
  - re-render
  - magic-picker
  - container-pattern
---

# DOM Container Isolation Pattern

## Context

In Step 9 (Cult Selection + Miracles), three magic pickers — miracle-picker, spirit-picker, and sorcery-picker — were rendered as sibling content inside a single container div. When any one picker re-rendered using `container.innerHTML = ...`, all sibling picker content was destroyed. This caused the spirit picker to vanish when the miracle picker re-rendered after a selection change, and vice versa.

## Guidance

Give each independently-rendered UI section its own dedicated container element. Never share a parent container between sections that re-render via `innerHTML` assignment.

```javascript
// BAD: All pickers share one container
const magicSection = document.getElementById('magic-section');
magicSection.innerHTML = renderMiracles() + renderSpirits() + renderSorcery();
// Re-rendering miracles wipes spirits and sorcery

// GOOD: Each picker owns its container
const miracleContainer = document.getElementById('miracle-picker-container');
const spiritContainer = document.getElementById('spirit-picker-container');
const sorceryContainer = document.getElementById('sorcery-picker-container');

miracleContainer.innerHTML = renderMiracles();
spiritContainer.innerHTML = renderSpirits();
sorceryContainer.innerHTML = renderSorcery();
// Re-rendering miracles leaves spirit and sorcery untouched
```

## Why This Matters

`innerHTML` is a total replacement — it destroys all child nodes of the target element. When multiple logical sections share a container, updating one section obliterates the others. This creates hard-to-diagnose bugs where UI elements disappear after apparently unrelated interactions.

## When to Apply

- Any wizard step with multiple independently-updating sections
- Adding new magic system pickers (e.g., mysticism)
- Refactoring existing steps to add new interactive panels (Quick Boost, validation messages)
- Any case where `innerHTML =` is used for partial updates within a larger section

## Examples

Applied to Step 9 structure:

```html
<!-- Before: single container -->
<div id="step-9-content">
  <!-- All pickers rendered here; any innerHTML wipes siblings -->
</div>

<!-- After: isolated containers -->
<div id="step-9-content">
  <div id="cult-selection-container"></div>
  <div id="miracle-picker-container"></div>
  <div id="spirit-picker-container"></div>
  <div id="sorcery-picker-container"></div>
  <div id="quick-boost-container"></div>
</div>
```

## Related

- [Spirit/Sorcery Picker Pattern](../spirit-sorcery-picker-pattern.md) — selection limit logic for the same pickers
