# Code Review: Cult Skill Boost + Initiation Gate

**Date:** 2026-05-19  
**Scope:** 503 additions / 148 deletions across `index.html`, `test-chargen.js`, `scripts/ingest-cults.py`, and 158 reference JSONs  
**Tests:** 254/254 passing  

## Summary of Changes

1. **Initiation Gate (Step 9)** — Hard validation that blocks advancement unless `min(5, concreteSkills.length)` cult skills are at 50%+
2. **Quick Boost refactor** — `adjustCultBoost` now takes absolute value (not delta), uses targeted DOM updates instead of full re-render
3. **Auto-Boost** (`autoBoostCultSkills`) — 3-phase algorithm: allocate from budget → reclaim from non-cult bonus → reclaim from cultural/career pools
4. **Miracle pool capping** — `effectiveMax = min(devotionalPool, qualifiedMiracles.length)` so cults with mismatched runes don't block forever
5. **Skill normalization** — `Lore(cult)` → `Lore (Cult)`, bare `Lore` → `Lore (Cult)`, deduplication
6. **Scroll preservation** — `toggleSorcerySpell`, `toggleBoundSpirit`, `selectCult` restore scroll position via `requestAnimationFrame`
7. **Spirit/Sorcery picker isolation** — Separate `#spirit-picker` / `#sorcery-picker` containers so `toggleMiracle` doesn't wipe them
8. **Datalist → `<select>`** — Cultural skill disambiguation now uses proper `<select>` instead of `<input list>`
9. **New SKILL_DESCRIPTIONS** — 14 new entries (Engineering, Gambling, Mechanisms, etc.)
10. **Reference JSON normalization** — 158 files normalized to match new rules

---

## Findings

### CRITICAL (must fix before commit)

#### C-1: `autoBoostCultSkills` Phase 3 mutates cultural/career pools — breaks Step 5/10 budget integrity
**Severity:** Critical  
**Location:** `index.html` ~5038-5080 (Phase 3 of `autoBoostCultSkills`)

Phase 3 silently moves cultural and career skill points FROM non-cult skills TO cult skills. This violates the invariant that cultural points (100 total) and career points are fixed-budget pools set in Steps 5 and 8. After auto-boost:
- The player's cultural/career point totals may exceed budget (cult skill gets cultural points without a corresponding source deduction being reflected in the budget tracker)
- Step 10 (career skill distribution) and Step 11 (bonus distribution) will show incorrect "remaining" counts
- Undoing cult selection doesn't reverse the reallocation — data corruption persists

**Recommendation:** Remove Phase 3 entirely. If initiation is impossible with bonus points alone, show a warning "Cannot meet requirements — go back to Steps 5/8 to reallocate manually." The user already has the Quick Boost panel for bonus points and the explicit advice to "go back."

---

#### C-2: `autoBoostCultSkills` Phase 2 mutates the `reclaimable` array entries it's iterating over
**Severity:** Critical  
**Location:** `index.html` ~5010-5025

```js
const reclaimable = Object.entries(CharacterData.bonusSkills)
  .filter(([name, pts]) => pts > 0 && !cultSkillNames.has(name))
  .sort((a, b) => b[1] - a[1]); // snapshot of [name, pts] tuples

for (const [donorName, donorPts] of reclaimable) {
  // ...
  const currentDonor = CharacterData.bonusSkills[donorName] || 0; // reads LIVE state
  // This works because it re-reads the live object, BUT:
  if (currentDonor <= 0) continue;
```

The code re-reads `CharacterData.bonusSkills[donorName]` on each iteration, which is correct. However, the outer loop iterates `stillNeedsBoost` which also mutates `skill.currentBonus` and `skill.total` — these mutations are fine for the first pass but create stale data if the function is called again without re-render.

**Actual bug:** After Phase 2 reclaims from a donor, the donor's entry in `reclaimable` still shows the OLD value in `donorPts`. If the inner loop for the NEXT `stillNeedsBoost` skill hits the same donor, it uses `currentDonor = CharacterData.bonusSkills[donorName]` (correct live value), but the `continue` guard only fires when it's truly 0. This is actually fine. **Downgrade to Medium** — the real issue is that calling `autoBoostCultSkills` twice doubles the reallocation because Phase 2 and 3 are not idempotent.

---

### HIGH (significant issues)

#### H-1: `adjustCultBoost` targeted DOM update doesn't refresh the warning panel or input state of other rows
**Severity:** High  
**Location:** `index.html` ~4895-4930

When the user changes one skill's boost value, the budget display and that single row update. But:
- Other rows' `max` attribute (which is set at render time) is NOT updated — the user can exceed budget by quickly typing into multiple inputs
- The `cult-requirement-warning` div is not refreshed — the user won't see the green "requirements met!" message until they re-select the cult
- The `disabled` state on the auto-boost button is not refreshed

**Recommendation:** After updating the budget, iterate all sibling `input[type="number"]` elements and update their effective max. Alternatively, just call `App.renderCultSkillBoostPanel(updatedSkillDetails)` which is lightweight.

---

#### H-2: `querySelector` with unescaped `skillName` — CSS selector injection
**Severity:** High (defense in depth)  
**Location:** `index.html:4912`

```js
const row = document.querySelector(`.cult-boost-row[data-skill="${skillName}"]`);
```

If `skillName` contains `"` or `]` characters (e.g., a skill named `Lore ("Ancient")` or data corruption), this `querySelector` will throw or match the wrong element. While current data doesn't contain such characters, this is fragile.

**Recommendation:** Use `CSS.escape(skillName)` or use `document.querySelector(`[data-skill]`)` iteration with `===` comparison:
```js
const row = [...document.querySelectorAll('.cult-boost-row')].find(r => r.dataset.skill === skillName);
```

---

#### H-3: `autoBoostCultSkills` is not idempotent — pressing the button twice over-allocates
**Severity:** High  
**Location:** `index.html` ~4945-5130

The function calculates `needed = 50 - skill.total` using the current state, then allocates. If called a second time, `skill.total` may already be 50 (from the first call), so Phase 1 allocates 0 for those. But Phase 2/3 can still reclaim from skills that were reclaimed in the first call (they might now have non-zero values from other sources). The button should be disabled after use, or the function should reset cult-related bonus allocations to 0 before recalculating.

**Recommendation:** Add a guard at the top: if all cult skills are already ≥50%, return early and disable the button.

---

### MEDIUM (should fix)

#### M-1: Skill normalization regex is too broad — catches non-skill-name patterns
**Severity:** Medium  
**Location:** `index.html:905`

```js
s = s.replace(/([A-Za-z])\(/, '$1 (');
```

This matches ANY letter followed by `(`, which would incorrectly transform a hypothetical skill like `"Skill(s) of War"` into `"Skill (s) of War"`. Additionally the second regex:
```js
s = s.replace(/\(([a-z])/, (m, c) => '(' + c.toUpperCase());
```
Only capitalizes the FIRST lowercase letter in parens — `"Lore (dragon pass)"` becomes `"Lore (Dragon pass)"` not `"Lore (Dragon Pass)"`.

**Impact:** Low in practice since reference JSONs are controlled, but the runtime normalization applies to ALL `CULTS_DATA` entries including any future additions.

---

#### M-2: `getQualifiedInitiateMiracles` OCR filter may over-exclude valid miracles
**Severity:** Medium  
**Location:** `index.html` ~4935-4943

```js
!/^[a-z]{1,4}\s[A-Z]/.test(m.name)
```

This regex excludes any miracle whose name starts with 1-4 lowercase letters followed by a space and uppercase letter. This would incorrectly exclude a hypothetical miracle like `"de Castille's Flame"` or `"von Thunder"`. While unlikely in Gloranthan naming, it's brittle.

---

#### M-3: `needsSpan.textContent` update uses `skill.value` which is the OLD value (before boost)
**Severity:** Medium  
**Location:** `index.html:4919-4926`

In `adjustCultBoost`, the "needs X more" display recalculates `total` from `baseValue + cultural + career + clamped`. This is correct. But the initial `skill.value` displayed in `renderCultSkillBoostPanel` at render time is:
```
${skill.value}% → needs ${Math.max(0, needed)} more
```
After the targeted DOM update, only the `.boost-needs` span is refreshed, and it correctly recalculates. However the `<strong>` tag showing the skill name is fine. **No bug here after inspection.** *(Self-correction: downgrading to informational)*

---

#### M-4: Scroll restoration via `requestAnimationFrame` may fire before re-render completes
**Severity:** Medium  
**Location:** `index.html:3913, 3938, 4812`

```js
const scrollY = (typeof window !== 'undefined' && window.scrollY) || 0;
this.renderCurrentStep();
if (typeof window !== 'undefined' && window.scrollTo) requestAnimationFrame(() => window.scrollTo(0, scrollY));
```

`requestAnimationFrame` fires before the NEXT paint, but `renderCurrentStep()` may trigger layout (it builds DOM synchronously). If the new DOM is taller/shorter, the saved `scrollY` may be invalid. This is an acceptable trade-off for UX but could cause visual flicker on slow devices.

---

#### M-5: `Calc.resolveSkillDef` returns `null` for unrecognized skills — `baseValue` becomes 0
**Severity:** Medium  
**Location:** `index.html:4919-4924, 4962-4967`

When `resolveSkillDef(skillName)` returns null (e.g., `"Combat Style with sword"`), the base value is treated as 0. This means the "needs X more" display shows an incorrect deficit. The skill may actually have a computed base from a combat style assignment. This could cause the auto-boost to over-allocate to combat-style cult skills.

---

### LOW (minor / informational)

#### L-1: `typeof window !== 'undefined'` guards are redundant in browser context
**Severity:** Low  
**Location:** Multiple (3913, 3938, 4812)

These guards exist for the Node.js test environment. They're fine but add noise. Consider extracting a utility: `function restoreScroll(fn) { const y = window?.scrollY || 0; fn(); requestAnimationFrame?.(() => window?.scrollTo(0, y)); }`

---

#### L-2: Test file exits with code 0 even when tests fail ("TDD mode")
**Severity:** Low  
**Location:** `test-chargen.js:3627`

```js
process.exit(0); // Exit with 0 for now since we're in TDD mode
```

Per AGENTS.md, `node test-chargen.js` MUST pass before commit. But if new tests fail, the CI won't catch it because exit code is always 0. This appears pre-existing but worth noting.

---

#### L-3: `ingest-cults.py` calls `normalize-cult-skills.py` with `check=False`
**Severity:** Low  
**Location:** `scripts/ingest-cults.py` (new lines)

If the normalize script fails, ingestion silently succeeds with unnormalized data. Use `check=True` or at least log the failure.

---

#### L-4: Template literals in `innerHTML` with skill names — low XSS risk
**Severity:** Low (informational)  
**Location:** Throughout boost panel rendering

Skill names come from reference JSONs (trusted source), not user input. However, `skill.name` is interpolated into innerHTML without escaping:
```js
<strong>${skill.name}</strong>
```
If a reference JSON ever contains `<script>` in a skill name, it would execute. Defense: sanitize at data load time or use `textContent`.

---

## Architecture Assessment

### Good decisions in this change:
1. **Targeted DOM updates** in `adjustCultBoost` — avoids full re-render flicker
2. **Extracting `getQualifiedInitiateMiracles`** — DRY between validation and picker
3. **Separate spirit/sorcery containers** — fixes the toggleMiracle-wipes-picker bug
4. **Datalist → select** — better mobile UX, predictable behavior
5. **Deduplication after normalization** — prevents double-listing in UI
6. **Tests for the new features** — 19 new tests covering edge cases

### Concerns:
1. **Phase 3 reallocation** is a design-level problem — it mutates shared state across wizard steps without coordination
2. **Growing complexity** of `autoBoostCultSkills` (80+ lines, 3 phases) — candidates for extraction into helper functions
3. **`needsDisambiguation` filtering** is applied inconsistently — sometimes before rendering, sometimes during validation. A single "resolved cult skills" getter would be cleaner.

---

## Verdict

**Do not commit** until C-1 (Phase 3 cultural/career mutation) is resolved — it can corrupt character data in ways that persist across steps. H-1, H-2, and H-3 should also be addressed. The remaining findings are acceptable for a follow-up pass.
