# Task Brief: Passions & Combat Styles — Data + Code Fixes

## Starting Point
Work in `/home/node/.openclaw/workspace/projects/mythras-chargen` on branch `fix/passions-combat-v2`.
Base: current `main` (commit `98bd4d6`).

## The Core Problem
The chargen is for Adventures in Glorantha (RuneQuest using Mythras rules). Each Gloranthan culture grants specific passions and combat styles. Currently:

1. **Passions lack specific objects** — "Hate (Opposing Clan)" is not specific enough. It should be "Hate (Telmori)" or offer the player culture-appropriate choices
2. **Combat styles are not auto-applied** — cultures define combat styles but they don't appear on the character sheet unless manually added as hobby skills
3. **Combat styles in the data are non-specific** — need named styles with weapons and traits per culture

## Reference: How skoll.xyz Does It
The Mythras Encounter Generator (skoll.xyz) treats passions as fully specified strings:
- "Loyalty to Pavis" at POW+CHA+30
- "Hate Nomads" at POW+CHA+30
- "Hate Trolls" at POW+CHA+30

Combat styles are named with specific weapons: "Pavis Ambush" at STR+DEX+10, with Battleaxe, Light Crossbow, Javelin, Scutum Shield.

## What to Fix

### 1. Culture Passion Data
For EVERY culture in CULTURES_DATA, ensure passions have specific objects. Where the passion object varies by player choice, use the existing `{"choice":[...], "needsSubject": true}` pattern but populate the choices with culture-appropriate options.

Read the AiG cultures data at `references/aig-raw/cultures.json` and `references/aig-raw/cultures-mistral.json` for source data. Cross-reference with skoll.xyz templates for each culture.

For each culture, check what skoll.xyz shows by fetching: https://mythras.skoll.xyz/ and searching for the culture name + "pregen".

### 2. Combat Style Auto-Application
In `App.selectCulture()`, the worker already added auto-application of the first unrestricted combat style. Verify this works correctly for ALL cultures. The combat style should appear:
- In the character's skills with STR+DEX base value
- In Play Mode with name, weapons, traits, and skill %
- In PDF export with the same info

### 3. Verify All Cultures
For each culture in CULTURES_DATA, verify:
- All passions have specific objects (or appropriate player-choice mechanism)
- Combat style is auto-applied
- Passions render in Wizard, Play, and PDF modes
- Combat styles render in all three modes

### 4. CSS & PDF Issues
- Bullets colliding with divider lines in Play Mode — needs margin fix
- PDF truncates long spell names like "Beastcall (Dog, Pi..." — needs wider columns or text wrapping
- PDF should show combat style name + weapons + skill%, not just a bare weapon name

## Remotes
- origin: git@github.com:worldofgeese/mythras-chargen.git
- paphos: ssh://forgejo@paphos.hound-celsius.ts.net/kypris/mythras-chargen.git

Push to BOTH remotes when done.
