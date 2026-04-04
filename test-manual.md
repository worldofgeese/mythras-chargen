# Manual Playwright Test Instructions

## Prerequisites
- HTTP server running on port 8770
- Playwright installed via devbox

## Manual Test Steps

1. **Open the app**:
   ```bash
   cd /home/node/.openclaw/devbox-env
   devbox run playwright-cli open http://127.0.0.1:8770/index.html
   ```

2. **Step 1: Fill character basics**:
   - Fill `[data-testid="wizard-name"]` with "Ulfa the Brave"
   - Fill `[data-testid="wizard-concept"]` with "Praxian beast rider"
   - Click `#btn-next`

3. **Step 2: Set characteristics**:
   - Fill `[data-testid="char-str"]` = 14
   - Fill `[data-testid="char-con"]` = 12
   - Fill `[data-testid="char-siz"]` = 11
   - Fill `[data-testid="char-dex"]` = 12
   - Fill `[data-testid="char-int"]` = 10
   - Fill `[data-testid="char-pow"]` = 9
   - Fill `[data-testid="char-cha"]` = 8
   - Click `#btn-next`

4. **Step 3: Attributes (auto-calculated)**:
   - Click `#btn-next`

5. **Step 4: Culture & Homeland**:
   - Select `[data-testid="wizard-culture"]` = "Praxian"
   - Click `[data-testid="homeland-pimpers-block"]`
   - Click `#btn-next`

6. **Steps 5-7: Cultural details**:
   - Click `#btn-next` three times

7. **Step 8: Career**:
   - Select `[data-testid="wizard-career"]` = "Warrior"
   - Click `#btn-next`

8. **Steps 9-10: Skills**:
   - Click `#btn-next` twice

9. **Step 11: Complete**:
   - Click `#btn-next` (switches to Play Mode)

10. **Verify Play Mode**:
    - `#play-mode` should NOT have `.hidden` class
    - `#play-name` should show "Ulfa the Brave"
    - `#play-skills` should have multiple `[data-testid="skill-row"]` elements
    - `#play-combat` should have content
    - Special Effects section should be EMPTY initially
    - Click "Special Effects Reference" header → content should load
    - `#btn-export-pdf-simple` should be enabled

## Expected Results
- ✅ No console errors
- ✅ All wizard steps advance smoothly
- ✅ Mode switch is instant (no hang)
- ✅ Special Effects loads ONLY when expanded
- ✅ PDF export button works
