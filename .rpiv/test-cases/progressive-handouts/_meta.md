# Feature: Progressive Handouts

## Summary

3 standalone HTML documents with SVG path illustrations serving as progressive learning handouts for new players: combat-path, magic-path, and combined-path. Each presents Mythras rules in a guided, visual format.

## Source Files

- `docs/handouts/combat-path.html`
- `docs/handouts/magic-path.html`
- `docs/handouts/combined-path.html`

## Key Behaviors

1. Each handout is a self-contained HTML file (no external dependencies)
2. SVG paths render correctly (visual flowcharts/diagrams)
3. Content is readable and properly structured
4. Print-friendly layout
5. Mobile responsive
6. Links between handouts work (if any)
7. No broken asset references

## Boundary Conditions

- SVG renders in all major browsers (Chrome, Firefox, Safari)
- Print layout doesn't cut SVG diagrams mid-element
- Text remains readable at various zoom levels
- No JavaScript required (static content)

## Existing Coverage

- None

## Test Types Needed

- Smoke: Each HTML file loads without errors
- Visual: SVG paths render (screenshot comparison)
- Accessibility: Headings hierarchy, alt text on SVGs
- Responsive: Layout at 320px, 768px, 1024px viewports
- Print: Content fits A4 pages without clipping

## Fixtures to Use

- N/A (static documents, no character data)
