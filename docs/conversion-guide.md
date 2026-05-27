# Conversion Guide

## Strict Defaults

This project now uses a strict conversion stance:

- Mythras Core is the mechanical authority.
- Every pregen is rebuilt from a strict **75-point** human characteristic base.
- No custom skills remain on the finished sheets.
- Step allocations remain wizard-possible: no cultural, career, or bonus allocation above 15.
- Passion targets may come from folios, but active values are reconciled to app chargen formulas instead of importing higher RQG percentages.
- RuneQuest weapon skills are replaced by combat styles.
- Rune magic follows **Adventures in Glorantha** and cult one-pagers as future-initiation content; strict ADR-0015 chargen fixtures do not start with devotional pools or miracles.
- Cult one-pagers are the cult-facing packet for the GM and players.

## Current Roster Summary

| Character | Cult packet | Strict characteristics | Main combat style | Magic chassis |
| --- | --- | --- | --- | --- |
| Vasana | Vinga / Orlanth | `14/10/8/10/9/12/12` | `Colymar Bison Cavalry` | Future initiation path; no starting cult miracles/devotional pool |
| Yanioth | Ernalda | `8/9/12/11/12/11/12` | `Ernaldan Guard 65` | `Devotion`, `Exhort`, `Folk Magic`, `Meditation` |
| Harmast | Issaries | `10/7/11/13/15/12/7` | `Issaries Duelist 100` | `Devotion`, `Exhort`, `Folk Magic`, `Meditation` |
| Vishi | Waha | `9/9/10/9/14/13/11` | `Blue Llama Spirit Rider 60` | `Devotion`, `Exhort`, `Folk Magic`, `Binding`, `Trance`, `Meditation` |
| Vostor | Seven Mothers | `11/11/11/11/12/11/8` | `Lunar Infantryman 90` | `Devotion`, `Exhort`, `Folk Magic`, `Meditation` |
| Sorala | Lhankor Mhy | `10/8/10/12/15/9/11` | `Nochet Scholar-Guard 70` | `Devotion`, `Invocation`, `Shaping`, `Meditation` |
| Nathem | Odayla | `10/12/11/12/10/11/9` | `Odaylan Hunter 70` | `Devotion`, `Exhort`, `Folk Magic`, `Meditation` |
| Aranda | Babeester Gor | `12/10/11/12/10/10/10` | `Axe Maiden 100` | `Devotion`, `Exhort`, `Folk Magic`, `Meditation` |
| Dazarim | Yelmalio / White Bull | `10/9/13/9/12/11/11` | `Sable Rider Nomad 85` | `Devotion (Yelmalio)`, `Devotion (White Bull)`, `Exhort`, `Folk Magic`, `Meditation` |
| Ionara | Maran Gor | `8/10/9/11/12/14/11` | `Grazelander Noble` | Future initiation path; no starting cult miracles/devotional pool |

Characteristic order is `STR/CON/SIZ/DEX/INT/POW/CHA`.

## What Changed From The Earlier Draft

- The workbook is no longer the math authority.
- `Locale` and `Perception` now use the Mythras Core formulas.
- Climb and swim outputs now follow Mythras Core movement rules.
- Legacy skills like `Battle`, `Worship`, `Spirit Combat`, `Farm`, and `Herd` have been removed from the sheets.
- The batch generator and validator now enforce the strict rules automatically.
- The validated PDF template now keeps page 3 intact and writes overflow text only to the cloned `P3__More_1..29` rows.

## Source-Bound Interpretation Notes

### Active pregen combat-style exceptions

Combat Styles Encyclopedia remains the closed combat-style authority. Two active RQG Starter Set pregens keep narrative combat styles that are not present in CSE and are therefore recorded as source-blocked exceptions, not CSE promotions:

| Character | Fixture style | Exception record | Source note |
| --- | --- | --- | --- |
| Ionara | `Grazelander Noble` | `pregen:ionara:grazelander-noble` | RQG Starter Set Pregen Folios PDF p.20; Grazelander/Pure Horse culture absent from CSE. |
| Vasana | `Colymar Bison Cavalry` | `pregen:vasana:colymar-bison-cavalry` | RQG Starter Set Pregen Folios PDF p.2; no CSE entry covers this Sartarite bison-cavalry kit. |

See `references/combat-style-exceptions.json`.

### Vasana RQG spirit magic reconciliation

The RQG folio lists Demoralize, Heal 2, and Mobility. Under strict ADR-0015 the folio's spirit/Rune magic is not automatically active in the chargen fixture. The reconciliation is recorded in `references/folk-magic-reconciliation.json`:

| RQG folio spell | Mythras app spelling | Fixture status |
| --- | --- | --- |
| Demoralize | Demoralise | Withheld; requires cult/GM advancement. |
| Heal 2 | Heal | Present as `Heal`; no intensity suffix in fixture spell names. |
| Mobility | Mobility | Withheld; requires cult/GM advancement. |

- Sorala keeps `Invocation` and `Shaping` because her folio explicitly presents her as both a Lhankor Mhy initiate and a sorcerous scholar.
- Vostor's Seven Mothers sheet is anchored to the martial Yanafal Tarnils packet because the one-pager set provides Seven Mothers subcult packets rather than a single generic sheet.
- Dazarim keeps a visible White Bull devotion because his folio explicitly ties him to Argrath and the White Bull movement even though his primary cult packet is Yelmalio.

## Cult Packet Map

Use these one-pagers as the cult packet basis for the current strict roster:

- Vasana: `sources/cults/CultOnePagers2019/Storm/Vinga.pdf` pp. 1-2 and `sources/cults/CultOnePagers2019/Storm/Orlanth.pdf` pp. 1-2
- Yanioth: `sources/cults/CultOnePagers2019/Storm/Ernalda.pdf` pp. 1-2
- Harmast: `sources/cults/CultOnePagers2019/Storm/Issaries.pdf` pp. 1-2
- Vishi: `sources/cults/CultOnePagers2019/Praxian/Waha.pdf` pp. 1-2
- Vostor: currently anchored to `sources/cults/CultOnePagers2019/Lunar/7 Mothers - Yanafal Tarnils.pdf` pp. 1-2 as the martial Seven Mothers packet
- Sorala: `sources/cults/CultOnePagers2019/Storm/Lhankor Mhy.pdf` pp. 1-2
- Nathem: `sources/cults/CultOnePagers2019/Storm/Odayla.pdf` pp. 1-2
- Aranda: `sources/cults/CultOnePagers2019/Storm/Babeester Gor.pdf` pp. 1-2
- Dazarim: `sources/cults/CultOnePagers2019/Yelm/Yelmalio.pdf` pp. 1-2 and `sources/cults/CultOnePagers2019/Praxian/Storm Bull.pdf` pp. 1-2 for the secondary White Bull devotion
- Ionara: `sources/cults/CultOnePagers2019/Storm/Maran Gor.pdf` pp. 1-2

## Validation Status

The current manifest is at `output/validation/starter-set-pregen-manifest.json`.

All ten strict sheets currently pass the validator.
