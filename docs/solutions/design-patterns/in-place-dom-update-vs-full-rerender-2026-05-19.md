---
title: In-Place DOM Update vs renderCurrentStep()
date: 2026-05-19
category: design-patterns
module: wizard-step-rendering
problem_type: design_pattern
component: frontend_stimulus
severity: medium
applies_when:
  - A user interaction changes only a small portion of the displayed step
  - Full re-render causes scroll-to-top or focus loss
  - Budget counters, warning messages, or status indicators need updating
tags:
  - dom-update
  - render-current-step
  - scroll-preservation
  - partial-update
  - performance
---

# In-Place DOM Update vs renderCurrentStep()

## Context

The wizard uses `App.renderCurrentStep()` as the canonical way to refresh the UI after state changes. However, this function replaces the entire step's DOM, causing scroll position to reset to the top and any focused element to lose focus. For minor state changes (e.g., clicking +/- on a boost counter), the full re-render created a jarring user experience.

## Guidance

For state changes that affect only a small, identifiable portion of the UI, update specific elements by ID instead of calling `renderCurrentStep()`.

```javascript
// BAD: Full re-render for a counter change
function adjustCultBoost(skill, delta) {
  CharacterData.cultBoosts[skill] = (CharacterData.cultBoosts[skill] || 0) + delta;
  App.renderCurrentStep(); // Scroll jumps to top, all DOM recreated
}

// GOOD: Update only the affected elements
function adjustCultBoost(skill, delta) {
  CharacterData.cultBoosts[skill] = (CharacterData.cultBoosts[skill] || 0) + delta;
  
  // Update budget counter
  const budgetEl = document.getElementById('boost-budget-remaining');
  if (budgetEl) budgetEl.textContent = calculateRemainingBoost();
  
  // Update the specific skill's display
  const skillEl = document.getElementById(`boost-${skill}-value`);
  if (skillEl) skillEl.textContent = CharacterData.cultBoosts[skill];
  
  // Update warning/needs span
  const needsEl = document.getElementById('boost-needs-indicator');
  if (needsEl) needsEl.textContent = getBoostNeedsText();
  
  App.saveToLocalStorage();
}
```

## Why This Matters

`renderCurrentStep()` is expensive: it rebuilds the entire step DOM, reattaches all event listeners, and resets scroll position. For frequent micro-interactions (boost adjustments, toggle states), this creates visible flicker and disorienting scroll jumps. In-place updates are instant and preserve user context.

## When to Apply

- Budget counter adjustments (+/- buttons)
- Warning message toggles (show/hide based on threshold)
- Status indicators that update on each interaction
- Any interaction where the user expects the page to stay still

When NOT to apply (use renderCurrentStep() instead):
- Changing the selected cult (entire step layout changes)
- Toggling between major UI sections
- Any change that alters which sections are visible

## Examples

Applied to `autoBoostCultSkills()`:

```javascript
// Updates the warning panel and boost panel content without full re-render
function autoBoostCultSkills() {
  // ... calculate boosts ...
  
  const warningEl = document.getElementById('cult-skill-warning');
  if (warningEl) warningEl.innerHTML = getWarningHTML();
  
  const boostPanel = document.getElementById('quick-boost-panel');
  if (boostPanel) boostPanel.innerHTML = getBoostPanelHTML();
}
```

## Related

- [DOM Container Isolation Pattern](./dom-container-isolation-2026-05-19.md) — prerequisite for safe in-place updates
