---
title: Progressive Handout Design
category: design-patterns
module: handout-ui
problem_type: design_pattern
tags:
  - handout
  - svg
  - progressive-disclosure
  - navigation
---

# Progressive Handout Design

## Problem

Players need a visual map of character creation stages that reveals progressively — showing where they are, what's next, and linking to detailed instructions for each stage.

## Solution

A Shamatha-style winding SVG path with clickable nodes:

1. SVG contains a curved/winding path representing the character creation journey.
2. Nodes are placed along the path, one per stage.
3. Each node is an `<a>` element with `href="#stage-N"` linking to the corresponding section in the document.
4. Stages can be visually marked as complete/current/upcoming via CSS classes.

## Key Insight

The winding path metaphor (inspired by the Shamatha meditation diagram) communicates progression better than a linear list. Clickable nodes make it functional, not just decorative. Using `href="#stage-N"` keeps it pure HTML — no JS needed for navigation.

## When to Apply

- Updating the handout when stages are added or reordered.
- Styling nodes to reflect completion state.
- Adapting the pattern for other multi-step workflows (e.g., campaign session guides).
