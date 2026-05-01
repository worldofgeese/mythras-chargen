# Task Brief: Architectural Fixes + Reference Build

Work in `/home/node/.openclaw/workspace/projects/mythras-chargen` on branch `fix/architecture-v1` from current `main` (`8e4f300`).

## Part A: Reference JSON Extraction (from core Mythras PDF)

The PDF is at: https://files.geese.party/Mythras%20-%20TDM%20-%20Core%20Rulebook%20%283rd%20Printing%2C%2003-11-2018%29.pdf

Use the `pdf` tool to read it. Read `references/meta/mythras-page-map.md` first for page numbers. Read one existing file (e.g., `references/mythras-raw/characteristics.json`) for format.

**DO NOT overwrite existing files.** Create only these missing ones:

1. **passions.json** (p.23-27) — passion types, starting values (POW+CHA), intensity levels, invoking/compelling rules
2. **background-events.json** (p.18-22) — background events tables by age category  
3. **community.json** (p.22-23) — family/allies/contacts/rivals/enemies generation
4. **equipment-starting.json** (p.33-34) — starting equipment rules per culture type
5. **cultures.json** (p.14-18) — GENERIC Mythras cultures (Barbarian/Civilised/Nomadic/Primitive) skill lists. NOT Gloranthan — those are in aig-raw/
6. **magic-overview.json** (p.34-37, p.113-121) — magic types available at chargen, starting allocation

Format: `{"source": "Mythras Core Rulebook (3rd Printing, 2018)", "extracted_at": "2026-05-01", "page": "p.XX-YY", ...}`. Mark unclear text as "[unclear]".

**IMPORTANT: Budget your time. You have 15 minutes total for everything. If the PDF is slow, extract what you can and move on to Part B. Part B is higher priority.**

## Part B: Architectural Code Fixes (in index.html)

All 7 issues below must be addressed:

### B1. Career→Combat Style Resolution
8 careers have `combatStyles` like `"Combat Style (Cultural Style)"`. This is a placeholder. When a career is selected, resolve it to the actual named style from the character's culture. E.g., Warrior + Sartarite → "Hill Clan Levy" (or player choice if multiple unrestricted styles exist). Store the resolved style, not the placeholder string.

### B2. Passion Formula Consistency  
Verify ALL cultures use the same passion value formula. Currently Esrolian has `POW+CHA+30/50/25`, others may just use flat 30. Standardise: all passions should use `POW+CHA+30` unless a specific culture has a documented exception (like Esrolian's higher Loyalty to Grandmother).

### B3. Multi-Combat-Style Dropdown
When a culture has multiple unrestricted combat styles (Praxian has 15, Lunar Heartland has ~4 unrestricted, Sartarite has Hill Clan Levy as the only unrestricted one), show a dropdown so the player picks their style instead of auto-applying the first one. Currently `App.selectCulture()` just grabs `unrestricted[0]`.

### B4. Career Filtering by Culture Type
Each culture has a `type` (Primitive/Barbarian/Nomad/Civilised). Each career has a `type` too. The career step should filter the career list to show only careers matching the culture type (plus "all" type careers). Currently all careers show for all cultures.

### B5. Balazaring Passion Format
"Loyalty (Clan)" needs the same parenthetical format as other cultures AND should offer player input for which specific clan. Use `needsSubject: true` with suggestions like the choice passions already do.

### B6. Starting Money — Roll It
`startingMoney` fields like `"4d6×2 Lunars"` are display strings. Parse and evaluate the dice formula, show the rolled result in Play Mode and PDF. Format: parse `XdY×Z` pattern, roll, display result.

### B7. Wizard→Play→PDF Consistency Audit
After all fixes, verify that for a test character (Balazaring Hunter):
- All passions show in Wizard, Play Mode, AND PDF with correct format and values
- Combat style shows name + weapons + traits + skill% in all three views
- Career skills are correct for the culture type filter
- Starting money appears rolled in Play and PDF

## Remotes
Push to BOTH when done:
- origin: git@github.com:worldofgeese/mythras-chargen.git
- paphos: ssh://forgejo@paphos.hound-celsius.ts.net/kypris/mythras-chargen.git

Commit message: "fix: architectural fixes — career→style resolution, culture→career filtering, multi-style dropdown, passion formulas, starting money"
