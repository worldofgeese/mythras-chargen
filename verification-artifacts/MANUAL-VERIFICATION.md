# Manual Browser Validation Guide

## Overview
This document provides step-by-step instructions for browser validation of the Mythras character generator. Since playwright-cli is not available in the environment, these validations must be performed manually.

## Prerequisites
- Modern web browser (Chrome, Firefox, Edge, or Safari)
- Access to the project files at `/tmp/mythras-pdf-decapod/`

## Validation Steps

### Step 1: Initial Load
1. Open `index.html` in your browser
2. Verify the page loads without errors (check browser console)
3. Verify Step 1 (Character Concept) displays correctly
4. **Screenshot**: Save as `step-1-initial-load.png`

**Expected Results:**
- Title: "Mythras Character Generator"
- Step 1 form with name and concept fields
- Navigation buttons visible
- No JavaScript errors in console

---

### Step 2: Glorantha Cultures - Balazaring

1. Navigate through the wizard:
   - Step 1: Enter name "Balazaring Test"
   - Step 2: Allocate characteristics (use point-buy or dice)
   - Step 4: Select culture "Balazaring"
   - Continue through all steps to Step 11

2. On Step 11, verify:
   - Culture name "Balazaring" appears
   - Combat styles show Balazaring-specific names (e.g., "Hunter Raider")
   - Professional skills include Balazaring skills (Survival, Track, etc.)
   - All skills calculated correctly

3. **Screenshot**: Save as `step-11-balazaring.png`

**Expected Results:**
- Step 11 review shows complete character
- Combat styles: 3 Balazaring-specific styles visible
- Professional skills: 7 Balazaring-specific skills listed
- No "Combat Style (Cultural Style)" generic names

---

### Step 3: Glorantha Cultures - Praxian

1. Start a new character or reset
2. Navigate to Step 4 and select "Praxian" culture
3. Complete wizard to Step 11
4. Verify Praxian-specific content:
   - Combat styles reference Praxian weapons
   - Homeland reflects Prax region
   - Cultural skills appropriate for nomadic culture

5. **Screenshot**: Save as `step-11-praxian.png`

**Expected Results:**
- Praxian cultural elements visible
- Combat styles show Praxian weapon preferences
- No generic placeholders

---

### Step 4: Glorantha Cultures - Tlemori

1. Create new character with "Tlemori" culture
2. Complete to Step 11
3. Verify Tlemori-specific content

4. **Screenshot**: Save as `step-11-tlemori.png`

**Expected Results:**
- Tlemori cultural identity preserved
- Combat styles reflect Tlemori traditions

---

### Step 5: Glorantha Cultures - Sartarist

1. Create new character with "Sartarist" culture (if available)
2. Complete to Step 11
3. Verify Sartarist-specific content

4. **Screenshot**: Save as `step-11-sartarist.png`

**Expected Results:**
- Sartarist cultural elements visible
- Clan/tribe affiliations shown

---

### Step 6: Play Mode

1. From any completed character, click "Play Mode" button
2. Verify Play Mode interface:
   - Character sheet displays all data
   - Hit points visible with current/max values
   - Skills listed with percentages
   - Combat styles and weapons shown
   - Notes/background/concept displayed

3. Test state changes:
   - Modify a hit point value (e.g., damage to Head location)
   - Add a weapon using "Add Weapon" button
   - Verify changes persist

4. Navigate back to wizard (Step 1) and return to Play Mode
5. Verify no data loss occurred

6. **Screenshot**: Save as `play-mode-populated.png`

**Expected Results:**
- All character data visible
- HP tracking functional
- Weapon addition works
- State persists across mode switches

---

### Step 7: PDF Export Buttons

1. From Step 11 or Play Mode, verify both PDF export buttons are visible:
   - "Export PDF (Simple)" - single-page quick export
   - "Export PDF (Template)" - fills official Mythras form

2. Test Simple PDF export:
   - Click "Export PDF (Simple)"
   - Verify PDF downloads
   - Open PDF and check contents:
     * Character name present
     * All 7 characteristics visible
     * Skills listed
     * Combat styles shown
     * Hit locations with HP values
     * Weapons listed
     * Notes/concept/background included

3. **Screenshot**: Save as `pdf-export-buttons.png`

**Optional**: If PDF opens in browser, screenshot the PDF content as `pdf-content-simple.png`

**Expected Results:**
- Both export buttons visible and enabled
- PDF generation succeeds without errors
- PDF contains all expected character data
- Text does not overflow page boundaries

---

## Verification Checklist

After completing all steps, verify you have:

- [ ] `step-1-initial-load.png` - Initial wizard load
- [ ] `step-11-balazaring.png` - Balazaring character review
- [ ] `step-11-praxian.png` - Praxian character review
- [ ] `step-11-tlemori.png` - Tlemori character review
- [ ] `step-11-sartarist.png` - Sartarist character review (if culture available)
- [ ] `play-mode-populated.png` - Play Mode with character
- [ ] `pdf-export-buttons.png` - Both PDF export buttons visible

## Known Issues / Notes

Record any issues encountered during validation:

- **Date**:
- **Browser**:
- **Issue**:
- **Severity**: (Critical / High / Medium / Low)

---

## Success Criteria

All validation steps pass if:

1. ✅ Initial page loads without errors
2. ✅ All 4 Glorantha cultures display correctly in Step 11
3. ✅ Culture-specific combat styles and skills appear (no generic names)
4. ✅ Play Mode displays complete character data
5. ✅ State changes in Play Mode persist
6. ✅ Both PDF export buttons are functional
7. ✅ Simple PDF export contains all required fields
8. ✅ No JavaScript errors in browser console during any operation

---

## Automated Alternative (If Playwright Available)

If `playwright` or `playwright-cli` becomes available, run:

```bash
# Install playwright if not present
npm install -g playwright-cli

# Capture screenshots
playwright screenshot --url file:///tmp/mythras-pdf-decapod/index.html \
  --output verification-artifacts/step-1-initial-load.png

# For interactive testing
playwright open file:///tmp/mythras-pdf-decapod/index.html
```

---

**Validation Completed By**: _________________
**Date**: _________________
**Status**: ⬜ Pass  ⬜ Fail (with notes)
