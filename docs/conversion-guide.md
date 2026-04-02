# Conversion Guide

## Strict Defaults

This project now uses a strict conversion stance:

- Mythras Core is the mechanical authority.
- Every pregen is rebuilt from a strict **75-point** human characteristic base.
- No custom skills remain on the finished sheets.
- RuneQuest weapon skills are replaced by combat styles.
- Rune magic follows **Adventures in Glorantha** with rune-affinity casting and devotional pools.
- Cult one-pagers are the cult-facing packet for the GM and players.

## Current Roster Summary

| Character | Cult packet | Strict characteristics | Main combat style | Magic chassis |
| --- | --- | --- | --- | --- |
| Vasana | Vinga / Orlanth | `12/9/9/8/12/11/14` | `Vinga Cavalry 90` | `Devotion`, `Exhort`, `Folk Magic`, `Meditation` |
| Yanioth | Ernalda | `8/9/12/11/12/11/12` | `Ernaldan Guard 65` | `Devotion`, `Exhort`, `Folk Magic`, `Meditation` |
| Harmast | Issaries | `10/7/11/13/15/12/7` | `Issaries Duelist 100` | `Devotion`, `Exhort`, `Folk Magic`, `Meditation` |
| Vishi | Waha | `9/9/10/9/14/13/11` | `Blue Llama Spirit Rider 60` | `Devotion`, `Exhort`, `Folk Magic`, `Binding`, `Trance`, `Meditation` |
| Vostor | Seven Mothers | `11/11/11/11/12/11/8` | `Lunar Infantryman 90` | `Devotion`, `Exhort`, `Folk Magic`, `Meditation` |
| Sorala | Lhankor Mhy | `10/8/10/12/15/9/11` | `Nochet Scholar-Guard 70` | `Devotion`, `Invocation`, `Shaping`, `Meditation` |
| Nathem | Odayla | `10/12/11/12/10/11/9` | `Odaylan Hunter 70` | `Devotion`, `Exhort`, `Folk Magic`, `Meditation` |
| Aranda | Babeester Gor | `12/10/11/12/10/10/10` | `Axe Maiden 100` | `Devotion`, `Exhort`, `Folk Magic`, `Meditation` |
| Dazarim | Yelmalio / White Bull | `10/9/13/9/12/11/11` | `Sable Rider Nomad 85` | `Devotion (Yelmalio)`, `Devotion (White Bull)`, `Exhort`, `Folk Magic`, `Meditation` |
| Ionara | Maran Gor | `8/9/10/10/14/12/12` | `Earthshaker Horse Guard 100` | `Devotion`, `Exhort`, `Folk Magic`, `Meditation` |

Characteristic order is `STR/CON/SIZ/DEX/INT/POW/CHA`.

## What Changed From The Earlier Draft

- The workbook is no longer the math authority.
- `Locale` and `Perception` now use the Mythras Core formulas.
- Climb and swim outputs now follow Mythras Core movement rules.
- Legacy skills like `Battle`, `Worship`, `Spirit Combat`, `Farm`, and `Herd` have been removed from the sheets.
- The batch generator and validator now enforce the strict rules automatically.
- The validated PDF template now keeps page 3 intact and writes overflow text only to the cloned `P3__More_1..29` rows.

## Source-Bound Interpretation Notes

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
