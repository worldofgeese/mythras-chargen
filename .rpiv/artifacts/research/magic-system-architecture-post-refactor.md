# Research: Magic System Architecture (Post-Refactor)

**Date:** 2026-05-19  
**Scope:** `index.html` — cult detection, magic pickers, DOM patterns, scroll preservation  
**Commit:** 4df3293 (main)

---

## 1. detectCultType() — Classification Engine

**Location:** Line 921  
**Pattern:** Regex-based skill fingerprinting

```js
function detectCultType(cult) {
  const skills = (cult && cult.cultSkills) || [];
  const hasDevotionLike = skills.some(s => /^Devotion/i.test(s));
  const hasTranceLike   = skills.some(s => /^Trance/i.test(s) || /^Binding/i.test(s));
  const hasInvocationLike = skills.some(s => /^Invocation/i.test(s) || /^Shaping/i.test(s));
  const hasMysticism    = skills.some(s => /^Mysticism/i.test(s) || /^Meditation/i.test(s));
  // ...
  if (types.length === 0) types.push('theist'); // fallback
  return { primary, types, isHybrid };
}
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Regex on skill names, not explicit metadata | Avoids adding a `magicType` field to all 94 cult JSONs; skill names are already canonical markers per Mythras rules |
| Array of types, not single enum | Supports hybrid cults (e.g., Waha = theist+animist) where multiple pickers must render |
| `isHybrid` flag | Enables UI to show path labels ("Shaman Path", "Sorcerer Path") |
| Fallback to `'theist'` | Most Gloranthan cults are theist; safe default prevents empty picker |

### Return Shape

```ts
{ primary: 'theist'|'animist'|'sorcery'|'mysticism',
  types: string[],
  isHybrid: boolean }
```

### Risks

- **False negatives:** If a cult JSON uses non-standard skill naming (e.g., `"Devotion to Ancestor"` instead of `"Devotion (Ancestor)"`), the regex `^Devotion` would still match, so this is robust.
- **False positives:** A cult with `"Binding (Craft)"` (non-magic context) would be flagged animist. No such cults exist in current data, but new ingestions could trigger this.
- **No mysticism data:** The mysticism branch renders a stub. No cult in `CULTS_DATA` currently triggers it.

---

## 2. Separate Container Pattern (#miracle-picker, #spirit-picker, #sorcery-picker)

**Location:** Lines 4450–4452 (DOM template), Lines 4494–4580 (rendering logic)

### Architecture

Step 9's DOM template pre-creates three empty, hidden `<div>` containers:

```html
<div id="miracle-picker" style="margin-top: 20px; display: none;"></div>
<div id="spirit-picker"  style="margin-top: 20px; display: none;"></div>
<div id="sorcery-picker" style="margin-top: 20px; display: none;"></div>
```

### Why Separate Containers Exist

**Problem solved:** Before the refactor, all magic pickers were rendered into a single container. When `toggleMiracle()` was called, it re-rendered only its own picker by targeting `#miracle-picker`. But this would **wipe out** the spirit or sorcery picker if they shared the same DOM node — critical for hybrid cults that render 2+ pickers simultaneously.

**Solution:** Each magic system owns its own DOM node. Toggle functions only touch their own container:
- `toggleMiracle()` → re-renders `#miracle-picker` only
- `toggleBoundSpirit()` → calls full `renderCurrentStep()` (re-renders all)
- `toggleSorcerySpell()` → calls full `renderCurrentStep()` (re-renders all)

### Container Visibility Logic

After cult selection, `renderStep9` conditionally populates and shows containers:

```
if cultType.types.includes('theist')    → populate + show #miracle-picker
if cultType.types.includes('animist')   → populate + show #spirit-picker
if cultType.types.includes('sorcery')   → populate + show #sorcery-picker
if cultType.types.includes('mysticism') → append stub to #sorcery-picker
```

Hybrid cults show multiple containers simultaneously (e.g., Waha shows both miracle and spirit pickers).

---

## 3. Picker Interaction Functions

### 3.1 renderMiraclePicker(container)

**Location:** Line 5130  
**Scope:** Theist magic only

- Accepts a DOM element reference (the `#miracle-picker` div)
- Calls `App.getQualifiedInitiateMiracles()` to get filtered miracle list
- Calculates `effectiveMax = min(devotionalPool, qualifiedMiracles.length)`
- Renders a CSS grid of miracle cards with states: `selected`, `matching-rune`, `locked`
- Cards for unqualified miracles get `cursor: not-allowed` and no onclick handler
- **Does NOT call renderCurrentStep** — operates only within its container

### 3.2 toggleMiracle(miracleName)

**Location:** Line 5230  
**Strategy:** Targeted re-render (container-scoped)

```js
App.toggleMiracle = function(miracleName) {
  // 1. Validate: check rune qualification
  // 2. Mutate: push/splice CharacterData.miracles
  // 3. Save: this.saveToLocalStorage()
  // 4. Re-render ONLY the picker:
  const pickerDiv = document.getElementById('miracle-picker');
  if (pickerDiv) this.renderMiraclePicker(pickerDiv);
};
```

**Key insight:** This is the only toggle function that avoids full `renderCurrentStep()`. This is intentional — the miracle picker is the most frequently toggled (devotional pool can be 7+ picks), and a full re-render on every click would:
1. Reset scroll position (the picker is far down the page)
2. Cause noticeable jank from re-rendering all cult cards above it
3. Potentially wipe spirit/sorcery pickers in hybrid cults

### 3.3 toggleBoundSpirit(spiritName)

**Location:** Line 3918  
**Strategy:** Full re-render with scroll preservation

```js
App.toggleBoundSpirit = function(spiritName) {
  // 1. Mutate CharacterData.boundSpirits (push/splice)
  // 2. Save
  // 3. Capture scrollY
  // 4. renderCurrentStep()
  // 5. requestAnimationFrame(() => scrollTo(0, scrollY))
};
```

Uses full re-render because spirit selection can affect the boost panel (spirit skills may interact with cult skill totals). The scroll preservation pattern prevents disorienting jumps.

### 3.4 toggleSorcerySpell(spellName)

**Location:** Line 3904  
**Strategy:** Full re-render with scroll preservation (identical pattern to spirits)

Uses `App._toggleInList()` helper for add/remove logic with max-3 enforcement. Returns false if at cap, triggering a toast error.

### 3.5 _toggleInList(list, item, max)

**Location:** Line 3883  
**Utility:** Generic toggle with cap enforcement

```js
App._toggleInList = function(list, item, max) {
  const idx = list.indexOf(item);
  if (idx > -1) { list.splice(idx, 1); return true; }
  if (list.length >= max) return false;
  list.push(item);
  return true;
};
```

Used by: folk magic, sorcery spells, career folk magic.  
NOT used by: miracles (custom deselect logic), bound spirits (object array, not string array).

---

## 4. getQualifiedInitiateMiracles() — Dual-Use Filter

**Location:** Line 4937  
**Consumers:** `renderMiraclePicker` (rendering) and `validateCurrentStep` (validation gate)

```js
App.getQualifiedInitiateMiracles = function(cultName) {
  const cultMiracles = MIRACLES_DATA.cults[cultName]?.miracles || [];
  return cultMiracles.filter(m =>
    m.rank === 'initiate' &&
    m.source !== 'associate' &&
    m.source !== 'associated' &&
    m.name !== ':' &&
    !/^[?.:!]/.test(m.name) &&
    !/^[a-z]{1,4}\s[A-Z]/.test(m.name) &&
    !/\(a\):/.test(m.name)
  );
};
```

### Why Shared

The validation step (line 2596) computes `effectiveMax` using the same filter:

```js
const initiateMiracles = App.getQualifiedInitiateMiracles(CharacterData.cult);
const qualifiedMiracles = initiateMiracles.filter(m => /* rune match */);
const effectiveMax = Math.min(maxMiracles, qualifiedMiracles.length);
if (effectiveMax > 0 && selectedMiracles < effectiveMax) { /* block advancement */ }
```

If the picker and validator used different filters, a miracle could appear in the UI but not count toward the required selection (or vice versa). Single source of truth prevents desync.

### OCR Garbage Filters

The regex filters (`/^[?.:!]/`, `/^[a-z]{1,4}\s[A-Z]/`, `/\(a\):/`) guard against malformed entries from PDF extraction via `ingest-cults.py`. These catch:
- Colon-only entries from column-split artifacts
- Lowercase prefixes from OCR misreads (e.g., "the Shield" instead of "Shield")
- Subcult format artifacts (`(a):` pattern)

### Risk

- **Overly broad regex:** `!/^[a-z]{1,4}\s[A-Z]/` would filter a legitimate miracle named "de Force" (French-derived name). No such miracles exist in Gloranthan data today.
- **Undocumented contract:** The filter semantics are not expressed as a named constant or test fixture — if `ingest-cults.py` changes output format, these filters might need updating without obvious indication.

---

## 5. autoBoostCultSkills — In-Place DOM Update Pattern

**Location:** Line 4950  
**Strategy:** Modify state → update specific DOM elements → skip renderCurrentStep()

### Three-Phase Allocation

1. **Phase 1:** Use remaining bonus budget to raise cult skills toward 50%
2. **Phase 2:** Reclaim points from non-cult bonus skills
3. **Phase 3:** Reclaim from cultural/career pools of non-cult skills

### In-Place DOM Update (Line ~5090)

After mutation, instead of calling `renderCurrentStep()`:

```js
this.saveToLocalStorage();
// Re-render boost panel + warning in-place (no full page re-render)
if (typeof document === 'undefined') return; // Skip DOM updates in test environment

// 1. Recalculate skill totals
// 2. Update #cult-requirement-warning innerHTML (success/warning div)
// 3. Call App.renderCultSkillBoostPanel(updatedDetails) to refresh the panel
```

### Why Avoid Full Re-render

- **Preserves user context:** The boost panel is deep in the page. Full re-render would scroll to top.
- **Performance:** `renderStep9` is the most expensive step (renders all cult cards + pickers + boost panel).
- **State safety:** Full re-render during autoBoost could re-trigger `selectCult` confirmation dialogs or reset spirit/sorcery pickers.

### Guard for Test Environment

```js
if (typeof document === 'undefined') return;
```

Allows `autoBoostCultSkills` to run in Node.js tests (test-chargen.js) where DOM is absent. The state mutations complete; only DOM updates are skipped.

---

## 6. Scroll Preservation Pattern

**Locations:** Lines 3913–3915, 3934–3936, 4813–4816

### Pattern

```js
const scrollY = (typeof window !== 'undefined' && window.scrollY) || 0;
this.renderCurrentStep();
if (typeof window !== 'undefined' && window.scrollTo) {
  requestAnimationFrame(() => window.scrollTo(0, scrollY));
}
```

### Where Applied

| Function | Reason |
|----------|--------|
| `toggleSorcerySpell` | Full re-render needed; picker is mid-page |
| `toggleBoundSpirit` | Full re-render needed; picker is mid-page |
| `selectCult` | Full re-render; user clicked a cult card at arbitrary scroll depth |

### Where NOT Needed

| Function | Reason |
|----------|--------|
| `toggleMiracle` | Only re-renders `#miracle-picker` container (no full re-render) |
| `autoBoostCultSkills` | In-place DOM update (no full re-render) |
| `toggleFolkMagicSpell` | No DOM re-render (just mutates state) |

### Implementation Notes

- **`requestAnimationFrame` wrapping:** Required because `renderCurrentStep()` replaces DOM content synchronously but the browser hasn't painted yet. Without rAF, `scrollTo` would execute before the new content establishes its height, causing incorrect restoration.
- **SSR guard:** `typeof window !== 'undefined'` prevents crashes in Node.js test environment.
- **Limitation:** Does not preserve focus state. After re-render, keyboard focus is lost. This affects accessibility for keyboard-only users toggling spirits/sorcery spells.

---

## 7. Validation Flow (Step 9)

**Location:** Line 2575 (within `validateCurrentStep`)

Step 9 validation enforces a multi-gate check:

1. **Initiation gate:** 5 cult skills at 50%+ (concrete, non-ambiguous skills only)
2. **Theist gate:** `miracles.length >= effectiveMax` (uses `getQualifiedInitiateMiracles`)
3. **Animist gate:** At least 1 bound spirit selected
4. **Sorcery gate:** At least 1 sorcery spell selected

For hybrid cults, ALL applicable gates must pass (e.g., Waha requires both miracles AND spirits).

---

## 8. Summary of Architecture Decisions

| Decision | Trade-off | Status |
|----------|-----------|--------|
| Separate picker containers | More DOM elements vs. isolation safety | Working well |
| toggleMiracle uses scoped re-render | Must keep renderMiraclePicker in sync with full render | Low maintenance burden |
| toggleBoundSpirit/Sorcery use full re-render + scroll fix | Slight jank on slow devices vs. guaranteed consistency | Acceptable |
| autoBoostCultSkills uses in-place update | Code duplication of warning HTML vs. UX smoothness | Minor tech debt |
| getQualifiedInitiateMiracles shared | Single function to maintain vs. tight coupling | Good — prevents desync |
| Fallback to theist in detectCultType | Could hide misconfigured cult data | Acceptable given 94 cults are validated |

---

## 9. Remaining Risks

1. **autoBoostCultSkills HTML duplication:** The warning/success HTML is written in two places: `selectCult` (lines 4719-4745) and `autoBoostCultSkills` (lines 5097-5119). If the format changes, both must update.

2. **Spirit/sorcery toggle causes full re-render:** For hybrid cults, toggling a spirit re-renders the miracle picker too, potentially causing a flash. The miracle picker's state survives (it reads from `CharacterData.miracles`), but there's a visual flicker.

3. **No optimistic UI for toggleMiracle limit:** When pool is full and user clicks another miracle, nothing happens (no toast). Other toggles show explicit error toasts. Inconsistent UX.

4. **Scroll restoration is Y-only:** Horizontal scroll (unlikely on mobile but possible) is not preserved.

5. **Focus loss on full re-render:** After `toggleBoundSpirit`, keyboard focus is lost. Screen reader users would need to re-navigate to the spirit list.

6. **getQualifiedInitiateMiracles regex maintenance:** The OCR garbage filters are undocumented beyond inline comments. If `ingest-cults.py` pipeline changes, no test will catch a newly-introduced pattern slipping through.
