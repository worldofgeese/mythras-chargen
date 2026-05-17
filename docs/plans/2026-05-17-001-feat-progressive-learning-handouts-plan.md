# Progressive Learning Handouts: Combat & Magic Systems

Created: 2026-05-17  
Status: active  
Type: feat  

---

## Summary

Create three progressive learning handouts (styled HTML, replacing existing quickstarts) that guide the entire table — GM and players alike — through Mythras combat and all 5 magic systems in a step-by-step "map of the path" structure. Each stage builds on the previous one, with exact page references to source books so everyone knows what to read first, then next, and so on.

Inspired by the Nine Progressive Stages of Mental Development (Shamatha) painting: a winding path from bottom (beginner) to top (mastery), where each stage is visually distinct and builds on what came before.

---

## Problem Frame

Mythras is a deep, interconnected system. New players (and GMs) face a wall of rules spread across multiple books. Without a guided reading path, people either:
- Read linearly and get overwhelmed by combat before understanding basic resolution
- Skip around and miss foundational concepts that later rules depend on
- Never learn the magic systems because they seem impenetrable

The handouts solve this by providing a **progressive disclosure path** — each stage introduces exactly what's needed for the next level of play, with precise page references so you can read the minimum viable section and get playing.

---

## Source Books (with abbreviations used in handouts)

| Abbreviation | Book | Notes |
|---|---|---|
| **MYT** | Mythras Core Rulebook (3rd Printing, 2018) | Primary rules source |
| **AiG** | Adventures in Glorantha | Glorantha-specific adaptations |
| **MI** | Monster Island | Spirit cult template, spirit examples |
| **BH** | A Bird in the Hand | Spirit stat block examples |

---

## Document Structure

### Document 1: The Combat Path
**File:** `docs/handouts/combat-progressive-path.html`  
**Replaces:** Part of `mythras-rq-player-quickstart.html`

Progressive stages from "I've never rolled dice" to "I can run a complex multi-round combat with special effects, reach, and engagement":

| Stage | Title | Core Concept | Source |
|---|---|---|---|
| 1 | The Basic Roll | d100, skill %, success levels | MYT p.38-40 |
| 2 | Opposed Rolls | Attacker vs Defender, differential success | MYT p.40-42 |
| 3 | Action Points & Initiative | How turns work, who goes when | MYT p.74-77 |
| 4 | Attack & Parry | The core combat exchange | MYT p.78-82 |
| 5 | Damage & Hit Locations | Rolling damage, applying to locations | MYT p.82-84 |
| 6 | Special Effects | The heart of Mythras combat — choosing effects on success | MYT p.86-96 |
| 7 | Weapon Size & Reach | How weapon properties affect exchanges | MYT p.84-86 |
| 8 | Armour & Damage Reduction | AP, coverage, layering | MYT p.82-83 |
| 9 | Movement & Engagement | Closing, withdrawing, outmaneuvering | MYT p.77-78 |
| 10 | Wounds & Recovery | Serious/Major wounds, healing, death | MYT p.96-100 |
| 11 | Situational Modifiers | Darkness, terrain, fatigue, mounted | MYT p.100-106 |
| 12 | Putting It Together | Full combat example with all elements | MYT p.106 + custom |

### Document 2: The Magic Path
**File:** `docs/handouts/magic-progressive-path.html`  
**Replaces:** Part of `mythras-rq-player-quickstart.html`

Progressive stages from "what is magic in this world" to "I understand all 5 systems and know which one my cult uses":

| Stage | Title | Core Concept | Source |
|---|---|---|---|
| 1 | Magic in Glorantha | The cosmological framework, runes, gods | AiG p.24-30, MYT p.129-130 |
| 2 | Magic Points | The universal fuel, POW, regeneration | MYT p.130 |
| 3 | Folk Magic (Everyone) | Cantrips all characters know, simple casting | AiG p.63-68, MYT p.107-114 |
| 4 | Rune Affinities | Your connection to cosmic forces, how they work | AiG p.24-30 |
| 5 | Theist Rune Magic | Devotional Pool, miracles, casting via Rune Affinity | AiG p.69-122, ADR-002 |
| 6 | The Animist Way | Spirits, the Spirit World, Trance, fetishes | MYT p.131-154, MI spirit cult template |
| 7 | Spirit Rune & Binding | How Gloranthan animism adapts Mythras (Hannu's rules) | AiG p.134-151, Hannu adaptation |
| 8 | Sorcery | Invocation, Shaping, spell parameters, schools | MYT p.162-178, AiG p.60 adaptation |
| 9 | Mysticism | Meditation, paths, talents (for completeness) | MYT p.155-161 |
| 10 | Hybrid Cults | When your cult has both theism AND animism (Waha, etc.) | One-pager skill patterns |
| 11 | Your Cult's System | How to identify which system your cult uses | ADR-0006 detection rules |

### Document 3: Combat + Magic Combined
**File:** `docs/handouts/combat-magic-combined-path.html`  
**Replaces:** `mythras-rq-gm-quickstart.html`

How combat and magic interact in play:

| Stage | Title | Core Concept | Source |
|---|---|---|---|
| 1 | Casting in Combat | Action cost, concentration, interruption | MYT p.130-131 |
| 2 | Folk Magic in a Fight | Quick cantrips, Bladesharp, Protection | AiG p.63-68 |
| 3 | Miracles Under Pressure | Devotional Pool management, rune choice | AiG p.69-80 |
| 4 | Spirits in Combat | Commanding bound spirits, spirit combat basics | MYT p.138-141 |
| 5 | Sorcery in Battle | Shaping for combat, duration management | MYT p.163-166 |
| 6 | Dispelling & Resistance | Countermagic, magical defences | MYT p.130-131 |
| 7 | The Full Picture | A complete combat round with magic, spirits, and steel | Custom example |

---

## Design Principles

1. **Each stage is self-contained** — you can stop at any stage and play at that level
2. **Page references are exact** — "Read MYT p.86-96" not "see the combat chapter"
3. **Examples at every stage** — not just rules, but "here's what it looks like in play"
4. **Visual progression** — the HTML design should evoke the winding path metaphor (stages connected by a visual thread, getting "higher" as you progress)
5. **No forward references** — Stage 3 never says "we'll explain this in Stage 7"
6. **Glorantha-specific** — examples use Gloranthan context (Orlanth initiates, Praxian shamans, etc.)

---

## Implementation Units

### U1. Extract combat chapter page references

**Goal:** Verify exact page numbers for all combat stages against the Mythras Core PDF.  
**Files:** `references/mythras-raw/combat-resolution.json` (verify/update)  
**Approach:** Cross-reference the existing `combat-resolution.json` and `special-effects.json` with the PDF to confirm page ranges for each progressive stage.  
**Verification:** Each stage has a verified page range that matches the actual PDF content.

### U2. Extract magic chapter page references

**Goal:** Verify exact page numbers for all magic stages against source PDFs.  
**Files:** `references/mythras-raw/animism.json`, `references/mythras-raw/sorcery.json`, `references/mythras-raw/mysticism.json`, `references/mythras-raw/magic-overview.json`  
**Approach:** Cross-reference existing JSONs with PDFs. Add any missing page refs for casting-in-combat rules.  
**Verification:** Each magic stage has verified page ranges.

### U3. Write Combat Path handout content

**Goal:** Write the full progressive combat handout with all 12 stages.  
**Dependencies:** U1  
**Files:** `docs/handouts/combat-progressive-path.html`  
**Approach:** Write each stage as a self-contained section with: concept explanation, page reference callout, worked example, "you can now" summary. Use the existing quickstart HTML styling as the base.  
**Verification:** A player can read stages 1-6 and run a basic combat. Reading through stage 12 covers all combat rules.

### U4. Write Magic Path handout content

**Goal:** Write the full progressive magic handout with all 11 stages.  
**Dependencies:** U2  
**Files:** `docs/handouts/magic-progressive-path.html`  
**Approach:** Write each stage building on the previous. Folk Magic first (everyone has it), then Theism (most common), then Animism, Sorcery, Mysticism. Final stages show how to identify your own cult's system.  
**Verification:** A player can identify which magic system their cult uses and understand how to cast.

### U5. Write Combined Path handout content

**Goal:** Write the combat+magic integration handout with all 7 stages.  
**Dependencies:** U3, U4  
**Files:** `docs/handouts/combat-magic-combined-path.html`  
**Approach:** Assumes reader has completed both previous paths. Shows how magic interacts with the combat action economy. Culminates in a full worked example.  
**Verification:** The table can run a combat encounter involving both martial and magical characters.

### U6. Visual path design (CSS/HTML)

**Goal:** Create the visual "winding path" aesthetic that evokes the Shamatha painting.  
**Dependencies:** U3 (needs content to style)  
**Files:** All three HTML files (shared CSS)  
**Approach:** Design a visual thread connecting stages — could be a sidebar path indicator, numbered waypoints, or a literal winding SVG path. Each stage gets a visual marker showing progress. Use the existing handout color palette (parchment/rust/sage/gold).  
**Verification:** The handouts look like a journey map, not just a numbered list.

### U7. Remove old quickstart handouts

**Goal:** Delete the replaced quickstart files.  
**Dependencies:** U3, U4, U5  
**Files:** Remove `docs/handouts/mythras-rq-player-quickstart.html`, `docs/handouts/mythras-rq-gm-quickstart.html`  
**Verification:** Only the new progressive handouts exist in `docs/handouts/`.

---

## Key Technical Decisions

- **HTML over Markdown** — matches existing handout format, allows visual path design, printable
- **Three documents** — separation of concerns; players can focus on what they need
- **Exact page references** — the core value proposition; must be verified against physical PDFs
- **Glorantha-flavored examples** — uses cult names, rune names, Praxian context throughout
- **Progressive disclosure** — each stage explicitly states its prerequisites and what it unlocks

---

## Scope Boundaries

### In Scope
- Combat rules (Mythras Core chapters 7-8)
- All 5 magic systems with Gloranthan adaptations
- Exact page references to source books
- Worked examples at each stage
- Visual path design evoking the Shamatha painting

### Deferred to Follow-Up Work
- Interactive elements (clickable stages, progress tracking)
- Print-optimized CSS (@media print)
- Separate "quick reference cards" for at-the-table use
- Video/audio companions
- Spirit combat detailed walkthrough (beyond basics in Combined Path)
