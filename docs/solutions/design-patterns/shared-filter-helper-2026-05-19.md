---
title: Shared Filter Helper Pattern
date: 2026-05-19
category: design-patterns
module: cult-miracles
problem_type: design_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - The same filtering logic is needed in both validation and rendering
  - A validation check gates advancement based on a filtered set
  - UI rendering must show the same filtered set for selection
tags:
  - filter-helper
  - validation-rendering-sync
  - single-source-of-truth
  - miracle-picker
  - code-reuse
---

# Shared Filter Helper Pattern

## Context

The miracle picker must filter miracles by rune affinity in two places: (1) the validation check that ensures enough miracles are selected before advancing, and (2) the rendering logic that displays only selectable miracles. When these two code paths implemented the same filter independently, they drifted apart — validation counted miracles differently than what was displayed, causing either impossible-to-satisfy requirements or silent acceptance of invalid selections.

## Guidance

Extract shared filter logic into a single named function. Both validation and rendering call the same function, guaranteeing they always agree on what's available.

```javascript
// Single source of truth for qualified miracles
function getQualifiedInitiateMiracles() {
  const cult = CULTS_DATA.find(c => c.name === CharacterData.cult);
  if (!cult || !cult.miracles) return [];
  
  const affinities = CharacterData.runeAffinities || [];
  
  return cult.miracles.filter(m => {
    // Common miracles (no rune requirement) always qualify
    if (!m.rune || m.rune === 'Common') return true;
    // Rune-specific miracles require matching affinity
    return affinities.includes(m.rune);
  });
}

// Validation uses it
function validateMiracleSelection() {
  const qualified = getQualifiedInitiateMiracles();
  const required = Math.min(devotionalPool, qualified.length);
  return CharacterData.miracles.length >= required;
}

// Rendering uses the same function
function renderMiraclePicker() {
  const qualified = getQualifiedInitiateMiracles();
  return qualified.map(m => renderMiracleCard(m)).join('');
}
```

## Why This Matters

Filter drift between validation and rendering is a class of bug that is invisible during normal testing but manifests as edge cases:
- Validation requires 5 miracles but rendering only shows 4 (deadlock)
- Rendering shows 6 options but validation accepts 3 (silent under-selection)
- A rule change (e.g., "Common miracles always qualify") is applied in one place but not the other

The shared helper eliminates this entire class of bug by construction.

## When to Apply

- Any UI where selection is validated against a filtered set
- Spirit picker (filter by tradition or cult membership)
- Sorcery picker (filter by school or prerequisite)
- Career skill selection (filter by career type)
- Any "select N from filtered list" pattern throughout the wizard

## Examples

Anti-pattern — duplicated filter logic:

```javascript
// In validation (file line 12400)
const available = cult.miracles.filter(m => 
  !m.rune || affinities.includes(m.rune));

// In rendering (file line 13200) — subtly different!
const displayable = cult.miracles.filter(m => 
  m.rune === 'Common' || affinities.includes(m.rune));
// BUG: miracles with rune=undefined pass validation but not rendering
```

Correct pattern — single function:

```javascript
// Defined once, called everywhere
function getQualifiedInitiateMiracles() { /* ... */ }

// Validation
const count = getQualifiedInitiateMiracles().length;

// Rendering
const cards = getQualifiedInitiateMiracles().map(renderCard);

// Pool capping
const required = Math.min(pool, getQualifiedInitiateMiracles().length);
```

## Related

- [Miracle Pool Capping](./miracle-pool-capping-2026-05-19.md) — uses this pattern to cap required selections
- [Spirit/Sorcery Picker Pattern](../spirit-sorcery-picker-pattern.md) — applies to spirit/sorcery selection limits too
