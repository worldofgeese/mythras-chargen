# AGENTS.md — Pregen Workflow Rules

This subfolder documents the legacy RuneQuest-in-Mythras starter-set pregen workflow that now lives inside `mythras-chargen`.

## Canonical Files

- Template PDF: `templates/mythras-sheet.pdf`
- Generator: `scripts/generate_starter_set_pregens.py`
- Validator: `scripts/validate_character_sheet.py`
- Legacy wrapper docs: `docs/pregen-workflow/README.rqim-legacy.md`, `docs/pregen-workflow/PLAN.rqim-legacy.md`
- Core reference docs:
  - `docs/adventure-prep-checklists.md`
  - `docs/conversion-guide.md`
  - `docs/pregen-template.md`
  - `docs/worked-example-vasana.md`
  - `docs/spell-conversion-worksheet.csv`

## Rules

1. Preserve template PDF compatibility. Do not casually swap out `templates/mythras-sheet.pdf` or alter field assumptions without checking the pregen generator.
2. Preserve the cover-page merge workflow. The starter-set pregen pipeline is still a first-class deliverable, even though `index.html` is now the main app.
3. Do not delete or rewrite pregen support docs just because they are not used by the single-file chargen.
4. If changing the pregen generator or template assumptions, compare generated PDFs before and after.
5. Keep legacy rqim wrapper docs for historical/provenance context unless they are explicitly folded into newer docs.
