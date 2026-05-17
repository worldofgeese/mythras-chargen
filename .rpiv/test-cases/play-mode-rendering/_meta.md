# Feature: Play Mode Rendering

## Summary

Play Mode displays the completed character sheet with all data from wizard steps: identity, characteristics, attributes, hit locations, skills, combat, runes, passions, magic, equipment, and notes. Magic section adapts to cult type.

## Source Files

- `index.html` (play-mode section, App.switchMode('play'), all #play-* elements)

## Key Behaviors

1. Identity fields populated (name, culture, homeland, career, cult, age, gender, social class)
2. Characteristics display (STR, CON, SIZ, DEX, INT, POW, CHA)
3. Derived attributes calculated and shown (Action Points, Strike Rank, etc.)
4. Hit locations with HP values
5. Skills list with difficulty modifier dropdown
6. Combat styles with weapons and traits
7. Rune affinities display
8. Passions with values
9. Magic section adapts per cult type:
   - Theist: Devotional Pool + miracles
   - Animist: Bound spirits + spirit abilities
   - Sorcery: Spells known + shaping skills
   - Hybrid: Combined display
10. Equipment list
11. Collapsible Special Effects reference (44 effects)
12. Notes textarea persists

## Boundary Conditions

- Empty character (no wizard data) shows graceful empty state
- Very long skill lists don't break layout
- Mobile responsive layout (sidebar stacks above main)
- Difficulty modifier recalculates all skill values
- Print styles hide navigation, show all content

## Existing Coverage

- None (Play Mode not directly tested)

## Test Types Needed

- Integration: Switch to Play Mode populates all sections
- Integration: Each magic system renders correctly
- Visual: Layout doesn't break at various viewport widths
- E2E: Complete wizard → Play Mode shows all entered data

## Fixtures to Use

- All 24 fixtures (each should render correctly in Play Mode)
- Focus on one per cult type for magic rendering
