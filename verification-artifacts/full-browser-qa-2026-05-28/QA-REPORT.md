# Full browser QA — 2026-05-28

Status: PASS

## Coverage
- Loaded wizard locally from current `main` worktree.
- Exercised Mystic first-character flow with source-backed Path of Shadows and starting talent.
- Verified Step 12 review includes Mystic path/talent plus social class/money summary.
- Entered Play Mode and captured sheet state.
- Exercised Sorcerer selected spells then career switch to Mystic; spells auto-cleared.
- Export PDF smoke invoked generated PDF download anchor.
- Probed radio/checkbox alignment.

## Artifacts
- `01-mystic-step9-catalog.png`
- `02-step12-review-mystic.png`
- `03-play-mode-mystic.png`
- `04-sorcerer-career-switch-cleared.png`
- `05-pdf-export-smoke.png`
- `06-folk-magic-alignment.png`
- `qa-results.json`

## Raw checks
```json
{
  "load": {
    "title": "Adventures in Glorantha Character Sheet",
    "step": "Step 1 of 12",
    "hasWizard": true
  },
  "mystic_flow": {
    "success": true,
    "stepResults": [
      {
        "success": true,
        "errors": []
      },
      {
        "success": true,
        "errors": []
      },
      {
        "success": true,
        "errors": []
      },
      {
        "success": true,
        "errors": []
      },
      {
        "success": true,
        "errors": []
      },
      {
        "success": true,
        "errors": []
      }
    ],
    "limit": 1,
    "step": 9,
    "path": true,
    "talents": true,
    "freeform": false,
    "errors": []
  },
  "review": {
    "stepIndicator": "Step 12 of 12",
    "hasReview": true,
    "hasPath": true,
    "hasTalent": true,
    "hasSocial": true,
    "hasMoney": true
  },
  "play_mode": {
    "clicked": true,
    "visible": true,
    "hasIdentity": true,
    "hasMagic": true,
    "exportEnabled": true
  },
  "sorcery_switch": {
    "before": [
      "Animate (Substance)",
      "Attract (Threat)",
      "Banish"
    ],
    "result": true,
    "career": "Mystic",
    "after": [],
    "source": null
  },
  "pdf_smoke": {
    "anchorClicked": true,
    "error": null
  },
  "alignment": {
    "radioAligned": true,
    "checkboxAligned": true,
    "radioCount": 2,
    "checkboxCount": 8
  }
}
```
