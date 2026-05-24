---
feature: quick-boost-reallocation-and-uniform-controls
status: approved
design: ../designs/quick-boost-reallocation-and-uniform-controls.md
---

# Spec: Quick Boost Reallocation and Uniform Controls

## Scenarios

### Scenario 1: Quick Boost satisfies initiation with minimal changes
**Given** a character has selected a cult and is short of the required number of cult skills at 50%+
**When** the user clicks Quick Boost
**Then** the app raises only enough eligible cult skills to satisfy initiation
**And** initiation requirements are shown as met
**And** cult skills not needed for initiation are not boosted automatically

### Scenario 2: Quick Boost reallocates existing points when bonus points are insufficient
**Given** a character has no remaining bonus points but has legal donor points in other skills
**When** the user clicks Quick Boost
**Then** the app may move points from legal donor skills to target cult skills
**And** the resulting cultural, career, and bonus budgets remain valid
**And** the user sees a summary of what changed

### Scenario 3: Quick Boost changes earlier selections only when necessary and legal
**Given** the only safe path to initiation requires changing an earlier skill selection
**When** the user clicks Quick Boost
**Then** the app may change the earlier selection only to a skill legal for that step
**And** dependent selections and allocations remain coherent
**And** no unresolved placeholder skill is introduced

### Scenario 4: Impossible Quick Boost leaves the character unchanged
**Given** no legal combination of point moves or earlier selection changes can satisfy initiation
**When** the user clicks Quick Boost
**Then** the app explains why initiation could not be satisfied
**And** all character skills, selections, magic choices, and budgets remain exactly as they were before the click

### Scenario 5: Specialty 2 cannot stand without specialty 1
**Given** a career offers ordered specialties such as Craft specialty 1 and Craft specialty 2
**When** the user attempts to select specialty 2 without specialty 1
**Then** the app prevents the selection or reports a validation error
**And** the message explains that specialty 2 requires specialty 1

### Scenario 6: Removing specialty 1 removes dependent specialty 2 safely
**Given** the user has selected both specialty 1 and specialty 2
**When** the user deselects specialty 1
**Then** specialty 2 is also removed
**And** any related point allocation is removed or restored without leaving stranded skill points
**And** the career step remains valid only if three legal professional skills remain selected

### Scenario 7: Agent/import paths enforce the same specialty dependency
**Given** a saved character or agent request contains specialty 2 without its matching specialty 1
**When** the character is loaded or the request is applied
**Then** the app rejects the invalid state
**And** no Play Mode or PDF export can show a secondary-only specialty selection

### Scenario 8: Wizard allocation controls remain visually uniform
**Given** a wizard step contains skill, Passion, Quick Boost, career, or bonus allocation rows
**When** labels, guidance text, dropdowns, or subject inputs contain long text
**Then** point entry boxes remain the same width
**And** point entry boxes align consistently within their rows
**And** dropdowns/text inputs use a capped, consistent width instead of stretching across the whole page

## Constraints

- The app remains a single-file vanilla HTML application.
- Quick Boost must be atomic: partial application is not allowed.
- Quick Boost must not leave invalid cultural, career, or bonus budgets.
- Quick Boost must not introduce unresolved placeholder skills or malformed Passions.
- Quick Boost must preserve higher-magic provider validity or roll back.
- Ordered specialty rules must apply equally to manual UI, random generation, import/load, and agent API paths.
- Top-level form fields may remain full width; the uniform sizing requirement applies to allocation rows and point-entry controls.

## Out of Scope

- Adding new cult data or changing initiation requirements.
- Redesigning the full visual theme of the app.
- Multi-step confirmation modals before Quick Boost.
- Multi-page PDF changes.
- Replacing native selects with a custom dropdown component.
