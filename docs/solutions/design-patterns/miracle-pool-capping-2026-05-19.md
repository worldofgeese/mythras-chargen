---
title: Miracle Pool Capping for Rune Affinity Mismatch
date: 2026-05-19
category: design-patterns
module: cult-miracles
problem_type: design_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - A cult's devotional pool exceeds the number of miracles matching the character's rune affinities
  - Validation blocks advancement because not enough miracles are selectable
  - New rune magic data is added with narrow rune-affinity requirements
tags:
  - miracle-picker
  - devotional-pool
  - rune-affinity
  - validation
  - theist
  - pool-cap
---

# Miracle Pool Capping for Rune Affinity Mismatch

## Context

Theist cults grant a devotional pool of `Math.floor(POW / 2)` miracles at initiate rank. However, miracles are filtered by the character's chosen rune affinities — only miracles whose associated rune matches one of the character's 3 rune affinities are selectable. When a cult has many rune-specific miracles but the character's affinities only overlap with a few, the required selection count can exceed the available qualified miracles, making the step impossible to complete.

## Guidance

Cap the required miracle selection at `Math.min(devotionalPool, qualifiedMiracleCount)`. When the cap is active, show an explanatory message so the user understands why they're selecting fewer than their full pool.

```javascript
function getRequiredMiracleCount() {
  const pool = Math.floor(CharacterData.characteristics.POW / 2);
  const qualified = getQualifiedInitiateMiracles().length;
  return Math.min(pool, qualified);
}

function getMiracleCapMessage(pool, qualified) {
  if (qualified < pool) {
    return `(only ${qualified} miracles match your Rune Affinities)`;
  }
  return '';
}
```

## Why This Matters

Without capping, the validation check "you must select N miracles" becomes unsatisfiable when N > available options. The character generator deadlocks at Step 9 — the user cannot advance and has no indication of why. This is especially common with niche cults (e.g., Telmor with 4 miracles but the character chose non-overlapping runes).

## When to Apply

- Validation logic for miracle selection count
- Any pool-based selection where the pool is derived from a characteristic but the available options are filtered by another choice
- Future spirit-binding limits if spirits gain rune-affinity filtering
- Any "must select exactly N from this list" where N might exceed the list size

## Examples

Validation check with cap:

```javascript
function validateMiracleSelection() {
  const required = getRequiredMiracleCount();
  const selected = CharacterData.miracles.length;
  
  if (selected < required) {
    return {
      valid: false,
      message: `Please select all your initiate miracles (${selected}/${required} chosen)`
    };
  }
  return { valid: true };
}
```

UI display:

```javascript
const pool = Math.floor(CharacterData.characteristics.POW / 2);
const qualified = getQualifiedInitiateMiracles().length;
const required = Math.min(pool, qualified);
const capNote = qualified < pool 
  ? ` <span class="cap-note">(only ${qualified} miracles match your Rune Affinities)</span>` 
  : '';

header.innerHTML = `Select ${required} miracles${capNote}`;
```

## Related

- [Shared Filter Helper Pattern](./shared-filter-helper-2026-05-19.md) — extracting getQualifiedInitiateMiracles() to keep validation and rendering in sync
- [Cult Type Detection](../cult-type-detection.md) — how cults are classified as theist to trigger the miracle picker
