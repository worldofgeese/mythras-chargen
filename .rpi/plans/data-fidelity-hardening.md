# Plan: Data Fidelity Hardening

**Status:** active
**Design:** ../designs/data-fidelity-hardening.md
**Spec:** ../specs/data-fidelity-hardening.md

## Phase 1: Folk Magic Master List (LOW RISK)

Add 11 AiG-attested spells to `FOLK_MAGIC_SPELLS` at line 17132:
- Find Food, Find Herd Animal, Find Prey, Find Safe Shelter, Find Truth, Find Water, Heat, Incognito, Preserve

**Verification:** Sort check, no duplicates, all spells from CULTURES_DATA folk magic lists have a match in FOLK_MAGIC_SPELLS.

- [ ] Add spells alphabetically
- [ ] Verify all 8 culture folkMagic entries have their spells in the master list

## Phase 2: Fix "Longbow or Javelin" (LOW RISK)

Replace `"Longbow or Javelin"` → `"Longbow","Javelin"` in Sartarite Hill Clan Levy weapons array.

- [ ] Edit CULTURES_DATA

## Phase 3: OCR Artifact Cleanup in CULTS_DATA (MEDIUM RISK)

Clean all CULTS_DATA entries:
1. Remove `\n` from within string values (join split words)
2. Strip unicode superscript markers (¹²³⁴⁵⁶⁷⁸⁹⁰ → empty)
3. Fix known typos: `"Runic Affinityion"` → `"Runic Affinity"`
4. Normalize non-breaking spaces (`\u00a0`) to regular spaces
5. Strip Gorgorma's mangled cultSkills/folkMagic (OCR produced garbage)
6. Remove garbage entries from "Hearth Mother" and "Shaman Spirit Society" folkMagic arrays
7. Remove "Gerak Kag" and other entries where cultSkills is entirely OCR garbage

**Approach:** Write a one-time cleanup pass as inline JS executed at load time, rather than manually editing the massive CULTS_DATA line. This is more maintainable and auditable.

- [ ] Add `cleanCultsData()` function after CULTS_DATA declaration
- [ ] Call it immediately
- [ ] Verify no `\n` remains in any cult skill/spell name

## Phase 4: Tech-Level Weapon Filtering (MEDIUM RISK)

Add `CULTURE_WEAPON_POOLS` constant and modify `BACKGROUND_EQUIPMENT` fallback pools to use culture-appropriate weapons.

- [ ] Add CULTURE_WEAPON_POOLS constant after CULTURE_ARMOUR
- [ ] Modify `autoPopulateStartingEquipment()` to pass culture tech level
- [ ] Modify BACKGROUND_EQUIPMENT fallback pools to accept culture filter

## Phase 5: loadCharacter() Validation (MEDIUM RISK)

Add `validateLoadedData()` function that checks for placeholder skills and blocks corrupt loads.

- [ ] Add validateLoadedData() function
- [ ] Modify loadCharacter() to call it before Object.assign()
- [ ] Show specific error messages for different failure modes

## Phase 6: Cult Skill Resolution (LOW RISK)

Remove `Devotion (Pantheon, Cult or God)`, `Binding (Cult, Totem or Tradition)`, `Invocation (Cult, School or Grimoire)` from `KNOWN_CONCRETE_SPECIALIZATIONS` and add resolution logic when cult is selected.

- [ ] Remove from whitelist
- [ ] Add resolution in cult selection handler
- [ ] Add resolution in random generation
