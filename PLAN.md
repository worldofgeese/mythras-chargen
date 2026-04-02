# mythras-chargen — Implementation Plan

## Design Decisions (from grill session 2026-04-02)

| # | Decision | Choice |
|---|----------|--------|
| 1 | PDF export | Browser-side (pdf-lib), no server |
| 2 | Custom character PDF | 3 pages (no cover), pregens get 4-page with folio cover |
| 3 | Repo name | `mythras-chargen` |
| 4 | Skill formulas | Attestable wins. INT+CHA for Native Tongue/Language (Mythras Core p.12) |
| 5 | Pregen validation | Phase 2 (needs local files from Tao's machine) |
| 6 | Eject skill | Full context zip: files + AGENTS.md + CLAUDE.md + CONTINUE.md |
| 7 | Repo structure | Single HTML primary, PDF template companion, scripts for devs |
| 8 | Glorantha data | Modular — separate data file, swappable/removable |
| 9 | All docs/scripts | Bring everything from rqim, clean paths, mark Phase 2 items |

## Licensing Status

- **Mythras (TDM):** Pending — Lawrence says Mythras IP isn't the sticking point, waiting on Chaosium
- **Glorantha (Chaosium):** Email sent, awaiting reply
- **Action:** Keep repo private until both permissions are secured. Build everything now.

---

## Phase 1: Merge & Ship (this session)

### Task 1.1: Create mythras-chargen repo structure
- Create new repo `mythras-chargen` on Forgejo
- Set up directory structure:
  ```
  mythras-chargen/
  ├── index.html                    # chargen wizard + play mode
  ├── data/
  │   └── glorantha.js              # CULTURES_DATA, culture-specific spells, passions
  ├── templates/
  │   └── mythras-sheet.pdf         # PDF template for export (from rqim repo)
  ├── references/
  │   ├── mythras-raw/              # 14 attestable chain JSONs
  │   └── aig-raw/                  # AiG attestable chain JSONs
  ├── docs/
  │   ├── conversion-guide.md       # from rqim
  │   ├── worked-example-vasana.md  # from rqim
  │   ├── adventure-prep-checklists.md
  │   ├── spell-conversion-worksheet.csv
  │   ├── pregen-template.md
  │   └── handouts/                 # player + GM quickstart HTMLs
  ├── scripts/
  │   ├── generate_starter_set_pregens.py  # from rqim, paths cleaned
  │   └── validate_character_sheet.py      # from rqim, paths cleaned
  ├── validation/
  │   └── validation-report.md      # attestable chain report
  ├── AGENTS.md                     # project rules + provenance chains
  ├── CLAUDE.md                     # for eject/local Claude Code dev
  ├── README.md                     # user-facing docs
  └── .gitignore
  ```

### Task 1.2: Extract Glorantha data into modular file
- Extract from index.html into `data/glorantha.js`:
  - CULTURES_DATA (8 cultures, 44 combat styles)
  - Culture-specific folk magic selections
  - Culture-specific passions
  - Culture homeland autocomplete data
  - Suggested character builds
- index.html loads `data/glorantha.js` via `<script src>` if present
- Fallback: if not loaded, show generic Mythras culture templates (Primitive, Barbarian, Civilised, Nomad) with base skills from Mythras Core

### Task 1.3: Add browser-side PDF export
- Add pdf-lib (CDN or inline) to index.html
- Implement "Export PDF" button in Play Mode
- Load PDF template from `<input type="file">` or companion path
- Map CharacterData fields to PDF form field names (using rqim's pdf-field-map.md)
- Generate 3-page PDF for custom characters
- Test with template from rqim repo

### Task 1.4: Import rqim docs and scripts
- Copy all docs from rqim `docs/mythras-glorantha-starter-set/` → `docs/`
- Copy scripts from rqim `scripts/` → `scripts/`
- Clean all Windows paths to relative paths
- Remove references to local Codex skills (not in repo)
- Mark pregen pipeline dependencies in README: "Requires: input JSONs, folio covers, PDF template"

### Task 1.5: Write project AGENTS.md + CLAUDE.md + README
- AGENTS.md: source hierarchy, attestable chains, active rules, licensing status
- CLAUDE.md: project config for Claude Code eject sessions
- README.md: user-facing — what it is, how to use it, licensing notices

### Task 1.6: Validation pass
- Run attestable chain validation on final index.html
- Verify Glorantha data module loads correctly
- Verify PDF export produces valid output
- Verify all trademark statements present
- Cook review loop on final state

---

## Phase 2: Pregen Validation & Pipeline (future, needs local files)

### Task 2.1: Upload pregen assets
- 10 input JSONs (one per pregen)
- 10 folio cover PDFs
- PDF template (already in repo from Phase 1)

### Task 2.2: Validate pregens against attestable chains
- For each pregen:
  - Verify characteristics sum to 75
  - Verify all skill formulas match Mythras Core attestable chain
  - Verify derived attributes (AP, Initiative, Damage Mod, HP per location)
  - Verify combat styles match culture data from AiG attestable chain
  - Verify passions match type formulas from Mythras Core
  - Verify rune affinities follow AiG system
  - Verify cult identity matches cult one-pagers
- Generate pregen validation report with page citations

### Task 2.3: Browser-side pregen loading
- Add "Load Starter Set Pregen" option to chargen wizard
- Load pregen JSON → populate CharacterData → enter Play Mode
- Export to same PDF template with 4-page cover option

### Task 2.4: Pregen PDF generation in browser
- Port `generate_starter_set_pregens.py` logic to browser JS
- Prepend folio cover as page 1 (via pdf-lib page insertion)
- Patch cover page mechanics text and rune sidebar

---

## Phase 3: Eject Skill (project-agnostic)

### Task 3.1: Create workspace skill `eject`
- Skill location: `~/.openclaw/workspace/skills/eject/SKILL.md`
- Trigger: user says "eject" or "eject this project"
- Action:
  1. Identify current project directory
  2. Gather: all project files, AGENTS.md, relevant memory files
  3. Generate CLAUDE.md (Claude Code project config)
  4. Generate CONTINUE.md (current state, what's done, what's next, key decisions)
  5. Zip everything
  6. Send zip as file attachment in chat
- Project-agnostic: works for any project, not just mythras-chargen

---

## Execution Plan

| Task | Method | Est. Time |
|------|--------|-----------|
| 1.1 Repo setup | Manual (exec) | 5 min |
| 1.2 Glorantha data extraction | Cook dispatch | 10 min |
| 1.3 PDF export | Cook dispatch | 15 min |
| 1.4 Import rqim docs | Subagent | 5 min |
| 1.5 Write AGENTS/CLAUDE/README | Manual | 10 min |
| 1.6 Validation pass | Cook dispatch | 10 min |
| **Phase 1 total** | | **~55 min** |
| 3.1 Eject skill | Manual | 15 min |

Phase 2 is blocked on pregen asset upload.
