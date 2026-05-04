# Design: Placeholder Skill Disambiguation

**Status:** active
**Date:** 2026-05-03
**Upstream:** `.rpi/reviews/verify-disambiguation-e2e-2026-05-03.md`

## Problem

12 career professional skills use descriptive placeholders (e.g., `Craft (Primary)`, `Lore (Specific Species)`) that bypass `isAnySkill()` and leak as literal text into Play Mode and PDF export. Additionally, users can allocate points to `(any)` skills without selecting a specialization first, causing generic names to survive into the final character.

## Evidence

- **Mythras Core p.28-40:** Career descriptors like "Craft (Primary)" are role-playing prompts — the player picks their own specialization.
- **AiG p.28-29:** Embeds contextual hints: `"Lore (any, but Politics is common)"` — suggestions, not constraints.
- **skoll.xyz pregens:** Most leave descriptive placeholders unresolved; only pre-resolve when character concept strongly implies one (e.g., "Horse Whisperer" → `Lore(Horses)`).
- **Mythras professional-skills.json:** Simply states "Specialisation required" for Craft, Lore, Art, Language, Culture.

## Decision

Treat descriptive placeholders as **free-text prompts with contextual hints and category suggestions**. The descriptor text itself is the guidance (matching how Mythras Core, AiG, and skoll.xyz all handle it).

## Design

### 1. New detection function: `isPlaceholderSkill()`

```javascript
const PLACEHOLDER_PATTERNS = [
  /\((Primary|Secondary)\)/i,
  /\(Specific\b/i,
  /\(Hunting Related\)/i,
  /\(Regional\b/i,
  /\(Primary Catch|Secondary Catch)\)/i,
  /\(Shipboard\b/i,
  /\(Physiological\b/i,
  /\(Alchemical\b/i,
];

function isPlaceholderSkill(skillName) {
  return PLACEHOLDER_PATTERNS.some(p => p.test(skillName));
}
```

### 2. Unified detection: `needsDisambiguation()`

```javascript
function needsDisambiguation(skillName) {
  return isAnySkill(skillName) || isPlaceholderSkill(skillName);
}
```

### 3. Extract category and hint from placeholder

```javascript
function parsePlaceholderSkill(skillName) {
  const match = skillName.match(/^(Language|Lore|Art|Craft|Culture|Healing|Teach)\s*\((.+)\)$/i);
  if (!match) return null;
  return { category: match[1], hint: match[2] };
}
```

### 4. UI: Same datalist pattern, with hint text

When `needsDisambiguation()` is true:
- Show the descriptor text (e.g., "Primary Catch") as a label/hint above the input
- Offer a datalist from `DISAMBIGUATION_LISTS[category]` as suggestions
- Allow free-text entry
- Points input is **disabled** until a specialization is entered

### 5. Validation guard

In `validateCurrentStep()` for steps 5/6 (cultural/career skills):
- Scan all skill keys in `CharacterData.culturalSkills` and `CharacterData.careerSkills`
- Reject if any key matches `isAnySkill()` or `isPlaceholderSkill()`
- Show toast: "Please select a specialization for [skill name]"

### 6. Random character generation

In `generateRandomCharacter()`:
- For placeholder skills, pick randomly from `DISAMBIGUATION_LISTS[category]`
- Format: `category + ' (' + pick + ')'`

## Affected Careers

| Career | Placeholder Skills |
|--------|-------------------|
| Crafter | `Craft (Primary)`, `Craft (Secondary)` |
| Fisher | `Lore (Primary Catch)`, `Lore (Secondary Catch)` |
| Beast Handler | `Healing (Specific Species)`, `Lore (Specific Species)`, `Teach (Specific Species)` |
| Hunter | `Craft (Hunting Related)`, `Lore (Regional or Specific Species)` |
| Physician | `Craft (Specific Physiological Speciality)`, `Lore (Specific Alchemical Speciality)` |
| Sailor | `Craft (Specific Shipboard Speciality)` |
| Scholar | `Lore (Primary)`, `Lore (Secondary)` |

## Out of Scope

- Adding career-specific option lists (skoll.xyz and Mythras Core both confirm these are player-choice)
- Changing existing `(any)` skill disambiguation behavior (it works correctly)
- AiG cultural hint propagation (e.g., "but Politics is common") — future enhancement
