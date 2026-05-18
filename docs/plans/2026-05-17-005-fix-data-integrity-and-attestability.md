---
title: "fix: Data integrity — correct hallucinated content, verify against source PDFs"
status: active
created: 2026-05-17
type: fix
depth: deep
origin: "Vision-mode verification pass against Mythras Core, Monster Island, Bird in the Hand PDFs"
---

# Data Integrity & Attestability Fix

## Summary

Vision-mode verification against source PDFs revealed 12/34 sorcery spell descriptions are wrong, spirit stats are fabricated, spell limit formulas have no source, and 19 spells are missing. This plan corrects all hallucinated content to match verified PDF text exactly, documents Hannu's house rules with proper citations, and adds the missing spells.

---

## Problem Frame

ADR-003 requires all data to trace to a source PDF with page citation. The Phase 2 implementation violated this by:
1. Writing LLM-generated spell descriptions that contradict the actual book text
2. Fabricating spirit stat values (wrong POW, CHA, abilities)
3. Using an unattested formula (INT/4) for sorcery spell limits
4. Citing "per Mythras Core" for a CHA/2 spirit slot formula that doesn't exist in the book
5. Missing 19 of ~52 sorcery spells from the book
6. Using wrong spell variant names (Repulse Substance→Creatures, Wrack Species→Substance/Harm)

## Scope Boundaries

### In Scope
- Fix all 34 sorcery spell descriptions from verified PDF text
- Fix spell names to match book exactly
- Add all 19 missing sorcery spells with descriptions
- Fix spirit stats from verified Bird in Hand PDF pages 43-46
- Fix spell limit formula to match Mythras Core p.165
- Document CHA/2 as house rule (not Core) or find actual source
- Document Hannu house rules from Discord screenshots with citations
- Fix reference JSONs to be 1:1 facsimiles of PDF sources
- Audit and fix handouts for any hallucinated content
- Search notesfrompavis.blog for mysticism cult data

### Out of Scope
- Implementing mysticism UI (still blocked on cult data format)
- New feature work
- Performance/mobile testing

---

## Key Technical Decisions

1. **Spell descriptions**: Use first 1-2 sentences from actual Mythras Core text, lightly condensed for tooltip display. Mark source page in reference JSON.
2. **Spell limit**: Mythras Core p.165 says memorisation limit = INT, starting spells = Invocation/20. In AiG adaptation, Invocation → Rune Affinity. So starting spells = Rune Affinity/20. Display as "Rune/20" in UI.
3. **Spirit slots**: CHA/2 is NOT in Mythras Core. The Core limits POW of bindable spirits (3× Binding critical range), not count. If Hannu uses CHA/2, document as house rule. Otherwise use Core mechanic.
4. **Hannu house rules**: Document in `docs/adr/` as a formal ADR with Discord date citations and screenshot references.
5. **Missing spells**: Add all 19 to SORCERY_SPELLS with descriptions from PDF. Total will be ~52 spells.
6. **Notesfrompavis**: Search for mysticism cults and any animism/sorcery house rules Hannu has published.

---

## Implementation Units

### U1. Extract and verify all sorcery spell descriptions from Mythras Core PDF

**Goal:** Replace all 34 LLM-generated descriptions with actual book text. Add 19 missing spells.

**Dependencies:** None

**Files:**
- `references/mythras-raw/sorcery.json` — add `description` field to each spell from PDF
- `index.html` — update SORCERY_SPELLS constant (fix names, add descriptions, add missing spells)
- `test-chargen.js` — update spell count assertions

**Approach:**
1. Render Mythras Core p.167-178 via pdftoppm for each spell
2. Extract first 1-2 sentences of each spell's description verbatim
3. Fix spell names: `Summon (Entity)` → `Summon` + add `Evoke (Entity)`; `Repulse (Substance)` → `Repulse (Creatures)`; `Wrack (Species)` → `Wrack (Substance or Harm)`
4. Add all 19 missing spells with descriptions and resist types
5. Update `sorcery.json` with `description` field per spell
6. Update `SORCERY_SPELLS` in index.html

**Patterns to follow:** Existing `[name, resist, description]` tuple format in SORCERY_SPELLS.

**Test scenarios:**
- All ~52 spells have non-empty description
- All descriptions match PDF text (spot-check 5 random spells)
- Spell names match book exactly (British spelling: Neutralise not Neutralize)
- Summon and Evoke are separate entries
- Tooltips render for all spells

**Verification:** Vision-compare 3 random spell tooltips against rendered PDF pages.

---

### U2. Fix spirit stats and abilities from verified Bird in Hand PDF

**Goal:** Replace fabricated spirit data with vision-verified stats from Bird in Hand p.43-46.

**Dependencies:** None

**Files:**
- `references/spirits-raw/bird-in-hand.json` — fix all spirit stats to match PDF
- `index.html` — update STARTING_SPIRITS with correct POW/CHA/abilities
- `test-chargen.js` — verify spirit data structure

**Approach:**
1. Use pdftoppm pages 43-46 of Bird in Hand (already rendered)
2. Record exact stats for each spirit: Whulla (POW 11, CHA 9, Bless Initiative +2), Eous (POW 17, CHA 9, Endowment Camouflage), Anylil (POW 11, CHA 9, Bless Initiative +2), Woeyff (POW 17, CHA 9, Endowment Camouflage), Jked (POW 13, CHA 9, Endowment Camouflage), Kugkowcs (POW 14, CHA 11, Bless Stealth), Hoja (POW 11, CHA 7, Endowment Grappler), Ghu (POW 21, CHA 9, Guardian)
3. Update bird-in-hand.json with exact values
4. Update STARTING_SPIRITS to use real abilities from the book (not fabricated "+1 AP" etc.)
5. Use book's exact ability text format: "Bless (Initiative, +2)" not "grants limbs greater alacrity"

**Patterns to follow:** Bird in Hand stat block format: `Abilities: Bless (Skill, +N)` or `Endowment (Effect – description)`.

**Test scenarios:**
- All spirits in STARTING_SPIRITS have POW/CHA matching PDF
- Ability text matches book format exactly
- Source page references are correct (Bird in Hand p.43, p.44, p.45)
- Spirit picker still enforces slot limit
- PDF export shows correct spirit abilities

**Verification:** Vision-compare STARTING_SPIRITS entries against rendered PDF pages.

---

### U3. Fix spell limit formula and spirit slot formula

**Goal:** Replace fabricated INT/4 with actual Mythras Core rule. Document spirit slot formula source.

**Dependencies:** None

**Files:**
- `index.html` — change spell limit calculation and display text
- `references/mythras-raw/sorcery.json` — update chargen_rules with correct formula
- `references/mythras-raw/animism.json` — fix or annotate CHA/2 citation
- `test-chargen.js` — update limit assertions

**Approach:**
1. Mythras Core p.165: "a sorcerer may only memorise a number of spells up to the value of his INT characteristic" — this is the MAX memorised spells
2. Mythras Core p.163: "Sorcerer characters begin with a number of spells from that school equal to one twentieth of their Invocation skill" — this is starting count
3. In AiG adaptation: Invocation → Rune Affinity. So starting spells = floor(Rune Affinity / 20)
4. For chargen: we don't track Rune Affinity as a numeric skill. The one-pagers list it but don't give a starting %. Need to determine what value to use.
5. **Decision point**: If we can't determine starting Rune Affinity %, use INT as the memorisation cap (which is the actual Core rule for max spells known). This gives INT 15 = 15 spells max, which is generous but correct.
6. For spirit slots: search Mythras Core p.196 (Cults chapter) and notesfrompavis for the actual source. If not found, document as "Hannu house rule" with Discord citation.

**Test scenarios:**
- Spell limit displays correct formula in UI
- Limit enforces correctly (can't select more than limit)
- Reference JSON cites correct page for formula
- Spirit slot formula is either sourced or marked as house rule

**Verification:** Screenshot spell picker showing correct limit text.

---

### U4. Document Hannu house rules as ADR

**Goal:** Create a formal ADR documenting all Hannu house rules with source citations.

**Dependencies:** None

**Files:**
- `docs/adr/007-hannu-house-rules.md` — new ADR
- `docs/adr/artifacts/hannu-discord-screenshots/` — copy screenshots as evidence

**Approach:** Document from Discord conversation (2026-03-29) and screenshots:

1. **Exhort replaced by Rune Affinities** — casting uses Rune Affinity instead of Exhort skill
2. **Casting Rune Spells table** — 5 situations (allowed for all runes, specific rune you have, specific rune you don't have, cult doesn't have rune, cult has spell but not rune)
3. **Rune Spells Learning/Use/Recovery** — Cost: 5 XP rolls + 500L + 1 week training; Must be correct rank; Categories: Any Rune Spells, Normal Cult Spells, Subservient Cult Spells, Associated Cult Spells
4. **Devotional Pool Size** — Initiate = POW/2, Acolyte = POW×0.75, Priest = POW
5. **Theist Common Magic with Runes** — table of which runes grant which common spells at which rank
6. **Animism: Binding → Spirit Rune affinity** (from Waha v6.0.1 integration)
7. **Sorcery: Invocation → Rune Affinity of spell, Shaping → Law Rune** (from AiG p.60)
8. **Mysticism**: Path of Immanent Mastery "might" use it; Hannu has created some cults not yet in one-pager format (Discord 2026-05-17)
9. **Rank progression timing**: proven 1 year, overseer 1 year, leader 2 years

**Test scenarios:**
- ADR has correct frontmatter
- Each rule cites its source (Discord date, screenshot filename, or notesfrompavis URL)
- Rules that modify chargen behavior are cross-referenced to the code that implements them

**Verification:** ADR passes four-point test (context, decision, consequences, status).

---

### U5. Fix reference JSONs to match PDF sources exactly

**Goal:** Make all reference JSONs 1:1 facsimiles of their PDF sources.

**Dependencies:** U1, U2, U3

**Files:**
- `references/mythras-raw/sorcery.json` — add descriptions, fix names, add missing spells
- `references/spirits-raw/bird-in-hand.json` — fix all stats from PDF
- `references/spirits-raw/monster-island.json` — verify/fix stats
- `references/mythras-raw/animism.json` — fix CHA/2 citation

**Approach:**
1. For each spirit in bird-in-hand.json, replace UNVERIFIED values with actual PDF values
2. For sorcery.json, add description field to each spell entry
3. For animism.json, either find the CHA/2 source or change citation to "House rule (Hannu, see ADR-007)"
4. Mark verification status as `true` for data verified against PDF
5. Add `verified_by` and `verified_date` fields

**Test scenarios:**
- No UNVERIFIED values remain for spirits we have PDF pages for
- All spell descriptions in JSON match the text in index.html
- All page citations are correct format (e.g., "p.167" not "page 167")
- `verified: true` only set for data actually checked against PDF

**Verification:** Run script to check no UNVERIFIED remains in verified entries.

---

### U6. Audit and fix handouts for hallucinated data

**Goal:** Ensure combat-path.html, magic-path.html, combined-path.html contain no wrong rules or fabricated mechanics.

**Dependencies:** U1, U3, U4

**Files:**
- `docs/handouts/combat-path.html`
- `docs/handouts/magic-path.html`
- `docs/handouts/combined-path.html`

**Approach:**
1. Read each handout and identify any spell descriptions, mechanics, or rules text
2. Cross-reference against verified PDF data
3. Fix any wrong formulas (e.g., if handouts mention INT/4)
4. Fix any wrong spell descriptions
5. Ensure Hannu house rules are correctly stated (Devotional Pool = POW/2 for Initiate, etc.)

**Test scenarios:**
- No mention of INT/4 in handouts
- Devotional Pool formula matches Hannu's house rule (POW/2 for Initiate)
- Any sorcery spell descriptions match corrected text
- Spirit mechanics match Core rules or documented house rules

**Verification:** Grep handouts for known-wrong terms; visual review of magic sections.

---

### U7. Research notesfrompavis for mysticism cults and additional house rules

**Goal:** Find any published mysticism cult data or additional house rules on Hannu's blog.

**Dependencies:** None

**Files:**
- `references/cults-raw/kralorela/path-of-immanent-mastery.json` — update if data found
- `docs/adr/007-hannu-house-rules.md` — add any additional rules found

**Approach:**
1. Fetch notesfrompavis.blog pages about Kralorela, mysticism, Path of Immanent Mastery
2. Search for any published one-pagers with Meditation skill
3. Check if Hannu has published house rules for mysticism mechanics
4. If mysticism cult data found, update reference JSON and potentially unblock mysticism UI

**Test scenarios:**
- Any data found is properly cited with URL and date
- If no mysticism data found, document that explicitly (confirms "blocked" status)

**Verification:** Document search results regardless of outcome.

---

## Sequencing

```
U1 (sorcery spells)  ─┐
U2 (spirit stats)     ├──→ U5 (fix reference JSONs)
U3 (formulas)         ─┤
U4 (house rules ADR)  ─┘──→ U6 (fix handouts)
U7 (notesfrompavis)   ─── (parallel, independent)
```

U1, U2, U3, U4, U7 can all run in parallel. U5 depends on U1-U3. U6 depends on U1, U3, U4.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| pdftotext garbles two-column layouts | Use pdftoppm + vision mode for verification |
| Spell descriptions too long for tooltips | Truncate to first sentence; full text in reference JSON |
| CHA/2 might be from a source we haven't found | Search notesfrompavis, Monster Island p.136+, and AiG |
| Changing spell limit formula breaks existing fixtures | Update fixtures to match new formula |
| 52 spells overwhelms the picker UI | Add category headers or search filter |

---

## Post-Fix Skill Passes

After U1-U7 and manual testing, execute these skill passes in order:

| Bead | Skill | Purpose |
|------|-------|---------|
| mythras-chargen-hgm | `/ce-code-review` | Structured review of corrected magic system code |
| mythras-chargen-7w8 | `/ce-simplify-code` | Simplification pass on index.html magic code |
| mythras-chargen-984 | `/ce-compound` | Document learnings (attestability failures, vision-mode, pickers) |
| mythras-chargen-59q | `/validate` | Formally validate Plan 005 against working tree |
| mythras-chargen-19r | `/changelog` | Update CHANGELOG.md for this release |
| mythras-chargen-69b | `/annotate-guidance` | Update architecture docs for magic system |
| mythras-chargen-k6q | `/outline-test-cases` | QA test case specs for sorcery/spirit pickers, PDF export |
| mythras-chargen-qwf | `/explore` | Investigate Kralori mysticism and next-phase approaches |
| mythras-chargen-021 | `/ce-clean-gone-branches` | Housekeeping for stale branches |
| mythras-chargen-ckt | `/ce-demo-reel` | Screenshots of corrected pickers and PDF export |
| mythras-chargen-dvc | `/ce-commit-push-pr` | PR description summarizing full sprint |
| mythras-chargen-4g7 | `/ce-docs-review` + README | **LAST** — review and update README |

---

## Success Criteria

- [x] All ~52 sorcery spells have PDF-verified descriptions
- [x] All spell names match Mythras Core exactly
- [x] Spirit stats match Bird in Hand PDF pages 43-46 exactly
- [x] Spell limit formula cites actual Mythras Core page
- [x] Spirit slot formula either cites source or is documented as house rule
- [x] Hannu house rules documented in ADR-007 with citations (via pi-specdocs /adr skill)
- [x] Reference JSONs have no UNVERIFIED values for data we have PDFs for
- [x] Handouts contain no hallucinated mechanics
- [x] All tests pass
- [x] Notesfrompavis searched for mysticism data (result documented)
- [ ] Code review pass completed
- [ ] Simplification pass completed
- [ ] Learnings documented in docs/solutions/
- [ ] Architecture guidance updated
- [ ] QA test cases outlined
- [ ] CHANGELOG.md updated
- [ ] Demo screenshots captured
- [ ] README reviewed and updated (LAST)
