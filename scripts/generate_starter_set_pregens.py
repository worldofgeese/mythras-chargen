# NOTE: This script was imported from rqim-starter-set-kit. Some features require local assets not included in this repo. See PLAN.md Phase 2.
from __future__ import annotations

import copy
import importlib.util
import json
import math
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
# External dependency: mythras-glorantha-conversion skill scripts (not included in this repo)
SKILL_ROOT = ROOT / "skills" / "mythras-glorantha-conversion"
SKILL_SCRIPT = SKILL_ROOT / "scripts" / "mythras_glorantha_tools.py"
VASANA_ASSET = ROOT / "assets" / "vasana.json"
VALIDATOR_SCRIPT = ROOT / "scripts" / "validate_character_sheet.py"
TEMPLATE_SOURCE_PDF = ROOT / "templates" / "Mythras Sheet - New Version - 1.1.pdf"
TEMPLATE_PDF = ROOT / "templates" / "Mythras Sheet - RuneQuest-in-Mythras v1.2.pdf"
COVER_PAGE_DIR = ROOT / "assets" / "glorantha-starter-extracted-cover-pages"

RAW_DIR = ROOT / "sources" / "starter-set-legacy-inputs"
INPUT_DIR = ROOT / "output" / "inputs"
JSON_DIR = ROOT / "output" / "json"
PDF_DIR = ROOT / "output" / "pdf"
VALIDATION_DIR = ROOT / "output" / "validation"
MANIFEST_PATH = VALIDATION_DIR / "starter-set-pregen-manifest.json"

COVER_PAGE_FILES = {
    "vasana": "CHA4035 Runquest - Starter Set - Pregen Folios-1.pdf",
    "yanioth": "CHA4035 Runquest - Starter Set - Pregen Folios-3.pdf",
    "harmast": "CHA4035 Runquest - Starter Set - Pregen Folios-5.pdf",
    "vishi": "CHA4035 Runquest - Starter Set - Pregen Folios-7.pdf",
    "vostor": "CHA4035 Runquest - Starter Set - Pregen Folios-9.pdf",
    "sorala": "CHA4035 Runquest - Starter Set - Pregen Folios-11.pdf",
    "nathem": "CHA4035 Runquest - Starter Set - Pregen Folios-13.pdf",
    "aranda": "CHA4035 Runquest - Starter Set - Pregen Folios-15.pdf",
    "dazarim": "CHA4035 Runquest - Starter Set - Pregen Folios-17.pdf",
    "ionara": "CHA4035 Runquest - Starter Set - Pregen Folios-19.pdf",
}

COVER_HOW_TO_PLAY = {
    "aranda": [
        "You're a front-line axe fighter with strong armor and the nerve to hold a line.",
        "You carry yourself like a noble of Nochet even when the axe comes out.",
        "Earth Shield is your anchor against huge hits. Slash is for ending fights fast. Berserker is for crisis only.",
        "Your best Passions are Honor, your Loyalties, and Devotion to Babeester Gor.",
        "Death and Earth define you: grim, practical, and relentless.",
    ],
    "dazarim": [
        "You're a proud Praxian rider. Speak plainly and let the others handle delicate local talk when needed.",
        "Fight hard with kopis and shield, but remember your armor is light and missiles are dangerous.",
        "Your White Bull zeal drives bold action, while Yelmalio training keeps you steady.",
        "Use your rune affinities when the road turns dark or a hard fight needs miracle support.",
        "Truth and Movement make you direct, restless, and hard to pin down.",
    ],
    "harmast": [
        "Negotiate first, draw steel second. You're at your best when a deal can still be made.",
        "You're strongest in trade, household management, and public speech, but you can still settle matters with a duel.",
        "Path Watch is excellent on the road or whenever an ambush feels likely.",
        "Love of family and Loyalty to Sartar are your strongest emotional drivers.",
        "Harmony and Air make you a peacemaker with a streak of pride.",
    ],
    "ionara": [
        "You lead by force of will and carry the destructive face of Earth wherever you ride.",
        "You're good with mace and shield, but average hit points mean failed parries can turn ugly fast.",
        "Create Fissure and Shake Earth are dramatic miracles. Save them for moments that matter because your pool is limited.",
        "Devotion to Maran Gor and loyalty to the Grazelands should steer your biggest choices.",
        "Death, Disorder, and Truth make you intense, blunt, and difficult to compromise.",
    ],
    "nathem": [
        "Fight from range, scout ahead, and let others know what your sharp eyes catch first.",
        "In melee you're only fair and lightly armored, but your toughness keeps you standing longer than most expect.",
        "Odayla miracles and Rurik the shadowcat can change the shape of a fight quickly.",
        "Beast and Movement suit you better than crowded talky scenes.",
        "Bring your quieter Passions in when kin, home, or the hunt are on the line.",
    ],
    "sorala": [
        "You're a scholar first and a sword-hand second. Read the scene before you act.",
        "Your literacy and lore are broad. If there's writing, history, or a clue, it probably runs through you.",
        "Your miracles uncover information, and your sorcery needs preparation rather than a scrum.",
        "Truth is your investigative engine; lean on it whenever mysteries appear.",
        "Honor, Argrath, Samastina, and Lhankor Mhy all pull on you at once.",
    ],
    "vasana": [
        "You're a natural-born leader with CHA {cha}. Take charge when the group needs a decisive voice.",
        "Hate (Lunar Empire), Devotion (Orlanth), Honor, and your Loyalties should drive big choices and augments.",
        "{rune1} and {rune2} shape you: fierce, proud, mobile, and hard to cow.",
        "When the field is open, charge from Molon with your lance. In tighter fights, you're steadier with sword and shield.",
        "Your combat miracles are strong, but your devotional pool is only {dp}. Open with Demoralize or Shield, then spend the rest where it matters.",
    ],
    "vishi": [
        "Your magic is your sharpest edge. Stay useful from just behind the front line rather than trying to be its wall.",
        "Second Sight, Spirit Screen, and spirit work are your real battlefield tools.",
        "Loyalty to Argrath should push you into bold commitments when it matters.",
        "Talk with locals can be rough, so lean on clearer speakers when a scene needs polish.",
        "Cousin Monkey and your llama give you a chaotic support cast. Let them matter.",
    ],
    "vostor": [
        "You're a disciplined heavy infantryman. Pick a leader, support them, and make the line hold.",
        "You are an all-around tough soldier with good armor, solid damage, and reliable fundamentals.",
        "Your loyalties are tangled: Fazzur, the Red Emperor, old Tarsh, and your new allies all pull in different directions.",
        "Your small fire elemental is powerful, but it draws from a very limited pool.",
        "When talk with local barbarians gets rough, keep it short and let someone else smooth the edges.",
    ],
    "yanioth": [
        "You're a leader and healer, not a front-line bruiser. Let others hold the gap while you keep them alive.",
        "Heal 3 handles minor wounds. Heal Body is for when someone is close to death.",
        "Your family ties and other strong Passions should be visible in play, especially around Vasana and Harmast.",
        "Your earth elemental can swing a scene, but it costs most or all of your devotional pool.",
        "Earth, Fertility, and Beast make you worldly, sensual, and close to instinct.",
    ],
}

SPIRITUAL_BINDERS = {"vishi"}
SPIRITUAL_TRANCERS = {"vishi"}

COMPANION_BLOCKS: dict[str, list[str]] = {
    "aranda": [
        "Riding horse baseline: STR 30 CON 17 SIZ 30 DEX 20 POW 17; HP 23 Move 12 AP 1.",
        "Attacks: Bite 25% 1D8+3D6, Kick 25% 1D6+3D6, Rear & Plunge 25% 2D6+3D6, Trample 25% 4D6 vs. downed foes.",
        "Aranda has two riding horses. The folio treats them as mounts, not trained war-companions; use this baseline only if one is forced into danger.",
    ],
    "dazarim": [
        "Sevara the sable antelope: STR 26 CON 12 SIZ 27 DEX 11 POW 15; HP 16 Move 12 AP 1.",
        "Attacks: Butt 35% 2D6+2D6, Kick 35% 1D6+2D6, Bite 25% 2D4. Sevara either butts or bites and kicks in the same round.",
        "Skill note: Evade 65%.",
    ],
    "harmast": [
        "Two riding zebras: the folio only specifies that neither is trained for combat and each has Move 12.",
        "GM note: the strict conversion leaves them as noncombat mounts unless you explicitly import a generic zebra profile from another Mythras source.",
    ],
    "ionara": [
        "Teza the riding horse: STR 30 CON 17 SIZ 30 DEX 20 POW 17; HP 23 Move 12 AP 1.",
        "Attacks: Bite 25% 1D8+3D6, Kick 25% 1D6+3D6, Rear & Plunge 25% 2D6+3D6, Trample 25% 4D6 vs. downed foes.",
        "Horse note: a riding horse normally attacks only when its life is threatened; otherwise Ionara attacks instead.",
        "Skills: Athletics 75%, Evade 25%, Perception 30%, Swim 50%, Track 30% by scent.",
    ],
    "nathem": [
        "Rurik the shadowcat: STR 36 CON 17 SIZ 34 DEX 12 POW 10; HP 14 Move 10 AP 0.",
        "Attacks: Claw (x2) 50% 1D6, Bite 40% 1D6, Rip 80% 3D6.",
        "Attack note: Rurik opens with both claws and bite; if both claws hit, he hangs on and rips with hind claws next round while continuing to bite.",
        "Skills: Evade 50%, Stealth 90% (hide/move quietly).",
    ],
    "vasana": [
        "Molon the bison: STR 36 CON 17 SIZ 34 DEX 12 POW 10; HP 23 Move 12 AP 3.",
        "Attacks: Head Butt 50% 2D10+3D6, Trample 50% 6D6 vs. downed foes. Molon can head butt or trample in a round, but not both.",
        "Charge note: when Vasana attacks from bison-back with her lance, she uses Molon's +3D6 damage bonus and rolls 1D10+10 for hit location vs. targets on foot.",
    ],
    "vishi": [
        "Cousin Monkey: STR 17 CON 11 SIZ 10 DEX 13 INT 13 POW 13 CHA 10; HP 11 Move 10 AP 1.",
        "Attacks: Claw 50% 1D6+1+1D4, Bite 40% 1D8+1+1D4, Short Spear 30% 1D6+1+1D4, Sling 30% 1D8+1D2.",
        "Runes and magic: Beast 80%, Disorder 75%; Countermagic 2, Heal 2, Mobility 1, Spirit Screen 2.",
        "Skills: Lore (Animals) 30%, Athletics 90%, Evade 26%, Perception 40%, Stealth 45%, Language (Beastspeech) 30%, Language (Praxian) 10%, Binding 50%, Track 25%, Devotion (Grandfather Baboon) 35%.",
        "High llama: STR 36 CON 15 SIZ 42 DEX 11 POW 13; HP 22 Move 12 AP 2.",
        "Attacks: Bite 35% 1D8, Kick 50% 1D8+4D6, Rear and Plunge 35% 2D8+4D6.",
        "Skills: Athletics 35%, Evade 25%, Perception 35%, Track 20% by scent.",
        "Llama note: it can bite and kick one or two foes in the same round, or rear and plunge against one foe. On a charge, Vishi uses the llama's +4D6 damage bonus instead of his own.",
    ],
    "vostor": [
        "Small fire elemental: costs 1 devotional point; STR 10 POW 11 HP 10 Move 6 Volume 1m3.",
        "Abilities: ignites flammables, heats metal, bakes stone, sets fires, and floats through the air at its ground Move.",
        "Attack: engulfs one human-sized victim in flame. Roll 3D6 vs. CON at the end of each round engulfed; success deals the full 3D6 to general hit points, failure deals half. Armor gives no protection, but Protection and Shield do.",
    ],
    "yanioth": [
        "Earth elemental: small / medium / large costs 1 / 2 / 3 devotional points.",
        "Small: STR 10 POW 11 HP 10 Move 3 Volume 1m3. Medium: STR 19 POW 17 HP 19 Move 3 Volume 3m3. Large: STR 29 POW 20 HP 29 Move 3 Volume 10m3.",
        "Abilities: shapes earth, finds buried objects, buries objects up to its volume, and can carry willing passengers through soil if they pass CONx5 rolls to avoid suffocation.",
        "Attack: engulfs foes in a pit sized to its volume and closes the earth, doing its damage bonus to engulfed locations. Victims need a successful STR vs. STR resistance roll to break free.",
    ],
}

REMINDER_REWRITES = {
    "Earth Shield is defensive anchor": "Earth Shield anchors line",
    "Slash is best for finishing blows": "Slash for finishing blows",
    "Honor and devotion both steady her": "Honor & devotion steady",
    "Runes favor order and revenge": "Order & revenge runes",
    "Truth and Movement are strongest": "Truth & Movement lead",
    "Never ignore Darkness creatures": "Never ignore Darkness foes",
    "Use Sunbright in dark fights": "Sunbright in dark fights",
    "Best at bargaining or dueling": "Best at trade or duels",
    "Not strong in mounted combat": "Weak in mounted combat",
    "Leader first, singer second": "Leader first, singer next",
    "Destroy with Maran Gor runes": "Maran Gor runes destroy",
    "Use Create Fissure in desperate moments": "Create Fissure in crisis",
    "Good horsewoman, good mace fighter": "Strong rider, good mace",
    "Death and Disorder create pressure": "Death & Disorder press",
    "Speak plainly: Truth over diplomacy": "Truth over diplomacy",
    "Bow and perception are strongest": "Bow & Perception lead",
    "Low cult skills but big CON": "Low cult skill, big CON",
    "Bear magic changes the fight": "Bear magic shifts fights",
    "Movement and Beast runes dominate": "Movement & Beast lead",
    "Use passions to steady quiet scenes": "Passions for quiet scenes",
    "Use Truth rune for investigations": "Truth rune: investig.",
    "Sorcery needs prep, not brawling": "Sorcery: prep, not brawl",
    "Honor 80 and Loyalty Argrath 80": "Honor 80/Loy. Argrath 80",
    "More scholar than front-liner": "More scholar than fighter",
    "Read/write specialist": "R/W specialist",
    "Find Magic matrix spots magic nearby": "Find Mgc mtx spots mgc",
    "Storage crystal adds +10 MP": "Storage crystal: +10 MP",
    "No armor beyond robe and Shield": "Robe + Shield only",
    "Use Second Sight and Spirit Screen": "2nd Sight & Spirit Screen",
    "Cousin Monkey steals scenes": "Cousin Monkey shines",
    "Limited speech with local barbarians": "Talk is rough w/ locals",
    "High Death and Man runes drive choices": "Death & Man runes lead",
    "Low Heortling hinders local talk": "Low Heortling slows talk",
    "Remember the Fire elemental": "Remember Fire elem.",
    "Summon elemental costs full pool": "Summon elem. costs pool",
    "Vasana and Harmast are family": "Vasana & Harmast family",
    "Earth and Fertility shape choices": "Earth & Fertility lead",
    "Use passions to augment social scenes": "Passions aid social scenes",
}


def extract_rune_affinities(cult_lines: list[str]) -> list[dict[str, int]]:
    rows: list[dict[str, int]] = []
    for line in cult_lines:
        match = re.match(r"^(?P<name>.+?)\s+(?P<total>\d+)%$", str(line).strip())
        if not match:
            continue
        rows.append({"name": match.group("name").strip(), "total": int(match.group("total"))})
    return rows


def cover_parent_cult(cult_lines: list[str]) -> str:
    for line in cult_lines:
        text = str(line).strip()
        if text.startswith("Parent cult:"):
            return text
    return ""


def cover_context(source: dict[str, Any]) -> dict[str, Any]:
    affinities = source.get("rune_affinities", [])
    names = [entry["name"] for entry in affinities]
    return {
        "cha": source["character"]["characteristics"]["CHA"],
        "dp": source["character"]["devotional_pool_max"],
        "rune1": names[0] if len(names) >= 1 else "Your lead rune",
        "rune2": names[1] if len(names) >= 2 else "your second rune",
        "rune3": names[2] if len(names) >= 3 else "your third rune",
        "cult": source.get("cult_lines", [""])[0] if source.get("cult_lines") else "",
    }


def build_cover_page(slug: str, source: dict[str, Any]) -> dict[str, Any]:
    cover_pdf = COVER_PAGE_DIR / COVER_PAGE_FILES[slug]
    templates = COVER_HOW_TO_PLAY[slug]
    context = cover_context(source)
    return {
        "pdf": str(cover_pdf),
        "cult_name": source.get("cult_lines", [""])[0] if source.get("cult_lines") else "",
        "parent_cult": cover_parent_cult(source.get("cult_lines", [])),
        "how_to_play": [entry.format(**context) for entry in templates],
    }


def blank_nonempty_expected_fields(fields: dict[str, str], expected: dict[str, str]) -> list[str]:
    missing: list[str] = []
    for name, expected_value in expected.items():
        if name not in fields:
            continue
        if VALIDATOR.clean_text(expected_value) == "":
            continue
        if VALIDATOR.clean_text(fields.get(name, "")) == "":
            missing.append(name)
    return missing


def load_module(name: str, path: Path) -> Any:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


TOOLS = load_module("mythras_glorantha_tools", SKILL_SCRIPT)
VALIDATOR = load_module("validate_character_sheet", VALIDATOR_SCRIPT)


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=True)
        handle.write("\n")


def add_total(target: dict[str, int], name: str, total: int) -> None:
    target[name] = max(target.get(name, 0), int(total))


def scale_characteristics(original: dict[str, int]) -> dict[str, int]:
    minimums = {name: int(value) for name, value in TOOLS.CHARACTERISTIC_MINIMUMS.items()}
    target_pool = TOOLS.CHARACTERISTIC_POINT_TOTAL - sum(minimums.values())
    excess = {name: max(int(original[name]) - minimums[name], 0) for name in minimums}
    total_excess = sum(excess.values())
    if total_excess <= 0:
        raise ValueError(f"Cannot rescale characteristic array {original}")
    raw_values = {
        name: minimums[name] + (excess[name] * target_pool / total_excess)
        for name in minimums
    }
    scaled = {name: math.floor(value) for name, value in raw_values.items()}
    remainder = TOOLS.CHARACTERISTIC_POINT_TOTAL - sum(scaled.values())
    ranked = sorted(
        minimums,
        key=lambda name: (raw_values[name] - scaled[name], int(original[name])),
        reverse=True,
    )
    for name in ranked[:remainder]:
        scaled[name] += 1
    return scaled


def lore_name_from_suffix(name: str) -> str:
    if "(" in name and ")" in name:
        return f"Lore {name[name.find('('):]}"
    trimmed = name.replace(" Lore", "").strip()
    return f"Lore ({trimmed})"


def map_professional_skill(slug: str, name: str) -> tuple[str, str | None]:
    if name in {"Meditation", "Meditate"}:
        return "drop", None
    if name == "Battle":
        return "professional", "Lore (Strategy and Tactics)"
    if name.startswith("Cult Lore "):
        return "professional", lore_name_from_suffix(name.replace("Cult ", "", 1))
    if name == "Farm":
        return "professional", "Craft (Farming)"
    if name == "Herd":
        return "professional", "Craft (Animal Husbandry)"
    if name.startswith("Homeland Lore "):
        return "professional", lore_name_from_suffix(name.replace("Homeland ", "", 1))
    if name.startswith("Read/Write "):
        return "professional", f"Literacy ({name.split(' ', maxsplit=1)[1]})"
    if name == "Orate":
        return "professional", "Oratory"
    if name == "Intimidate":
        return "standard", "Influence"
    if name == "Spirit Combat":
        if slug in SPIRITUAL_BINDERS:
            return "magic", "Binding"
        return "drop", None
    if name.startswith("Worship "):
        return "drop", None
    if name == "Plant Lore":
        return "professional", "Lore (Plants)"
    if name == "Animal Lore":
        return "professional", "Lore (Animals)"
    if name == "Spirit Lore":
        return "professional", "Lore (Spirits)"
    if name in {"Spirit Dance", "Spirit Travel"}:
        if slug in SPIRITUAL_TRANCERS:
            return "magic", "Trance"
        return "drop", None
    if name == "Celestial Lore":
        return "professional", "Lore (Astronomy)"
    if name == "Evaluate":
        return "professional", "Commerce"
    if name == "Peaceful Cut":
        return "professional", "Craft (Butchery)"
    if name == "Bargain":
        return "professional", "Commerce"
    if name == "Manage Household":
        return "professional", "Bureaucracy"
    if name.startswith("Play Instrument"):
        return "professional", "Musicianship"
    if name == "Intrigue":
        return "standard", "Deceit"
    if name.startswith("Elder Race Lore "):
        return "professional", lore_name_from_suffix(name.replace("Elder Race ", "", 1))
    if "Lore" in name:
        return "professional", lore_name_from_suffix(name)
    return "professional", name


def sort_professional_skills(rows: dict[str, int]) -> list[dict[str, int]]:
    def rank(name: str) -> tuple[int, str]:
        prefixes = [
            "Bureaucracy",
            "Commerce",
            "Courtesy",
            "Craft",
            "Healing",
            "Literacy",
            "Lore",
            "Musicianship",
            "Oratory",
            "Survival",
            "Track",
        ]
        for index, prefix in enumerate(prefixes):
            if name.startswith(prefix):
                return index, name
        return len(prefixes), name

    return [{"name": name, "total": rows[name]} for name in sorted(rows, key=rank)]


def sort_magic_skills(rows: dict[str, int]) -> list[dict[str, int]]:
    def rank(name: str) -> tuple[int, str]:
        prefixes = [
            "Devotion",
            "Exhort",
            "Folk Magic",
            "Binding",
            "Trance",
            "Meditation",
            "Invocation",
            "Shaping",
        ]
        for index, prefix in enumerate(prefixes):
            if name.startswith(prefix):
                return index, name
        return len(prefixes), name

    return [{"name": name, "total": rows[name]} for name in sorted(rows, key=rank)]


def strict_assumptions(raw: dict[str, Any]) -> list[str]:
    assumptions = [
        "Characteristics were rebuilt from a strict 75-point Mythras Core base by redistributing the RuneQuest folio's characteristic priorities above the human minimums.",
        "All RuneQuest-era or non-core skills were remapped to Mythras Core skills or specialisations; no custom skills remain on the sheet.",
        "Rune magic follows Adventures in Glorantha pages 71-74: rune affinities launch rune spells, Devotion governs intensity, and devotional pools handle miracle use.",
    ]
    for entry in raw.get("assumptions", []):
        if "workbook" in entry.lower():
            continue
        if "rune points" in entry.lower():
            assumptions.append(
                "Starting devotional pools were set from folio cult access, and visible rune affinities replaced the folio's old rune-handling procedure."
            )
            continue
        assumptions.append(entry)
    return assumptions


TEXT_NORMALISATIONS = (
    ("Play Instrument", "Musicianship"),
)


def normalise_text(value: str) -> str:
    text = str(value)
    for source, target in TEXT_NORMALISATIONS:
        text = text.replace(source, target)
    return text


def normalise_text_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalised: list[dict[str, Any]] = []
    for row in rows:
        next_row = copy.deepcopy(row)
        for key in ("left", "right", "name", "text"):
            if key in next_row and isinstance(next_row[key], str):
                next_row[key] = normalise_text(next_row[key])
        normalised.append(next_row)
    return normalised


def rewrite_reminder(line: str) -> str:
    text = str(line).strip()
    if text.startswith("Reputation ") and " / Ransom " in text:
        reputation, ransom = text.replace("Reputation ", "", 1).split(" / Ransom ", maxsplit=1)
        return f"Rep. {reputation}/Rans. {ransom}"
    return REMINDER_REWRITES.get(text, text)


def build_strict_source(slug: str, raw: dict[str, Any]) -> dict[str, Any]:
    source = copy.deepcopy(raw)
    original_characteristics = source["character"]["characteristics"]
    scaled_characteristics = scale_characteristics(original_characteristics)
    source["character"]["characteristics"] = scaled_characteristics
    source["character"]["player_name"] = ""
    source["character"].pop("strict_80_point_build", None)
    source["character"]["strict_75_point_build"] = True
    source["character"]["magic_points_current"] = scaled_characteristics["POW"]
    pool_cap = math.ceil(scaled_characteristics["POW"] / 2)
    source["character"]["devotional_pool_max"] = min(int(source["character"].get("devotional_pool_max", 0)), pool_cap)
    source["character"]["devotional_pool_current"] = min(
        int(source["character"].get("devotional_pool_current", source["character"]["devotional_pool_max"])),
        source["character"]["devotional_pool_max"],
    )
    source["reminders"] = [rewrite_reminder(line) for line in source.get("reminders", [])]

    standard_skills = {
        name: {"total": int(entry["total"])}
        for name, entry in source.get("standard_skills", {}).items()
    }
    professional_rows: dict[str, int] = {}
    magic_updates: dict[str, int] = {}
    for row in source.get("professional_skills", []):
        bucket, mapped_name = map_professional_skill(slug, row["name"])
        if not mapped_name:
            continue
        if bucket == "standard":
            current_total = int(standard_skills.get(mapped_name, {}).get("total", 0))
            standard_skills[mapped_name] = {"total": max(current_total, int(row["total"]))}
            continue
        if bucket == "magic":
            add_total(magic_updates, mapped_name, row["total"])
            continue
        add_total(professional_rows, mapped_name, row["total"])

    source["standard_skills"] = standard_skills
    source["professional_skills"] = sort_professional_skills(professional_rows)

    magic_rows = {
        row["name"]: int(row["total"])
        for row in source.get("magic_skills", [])
    }
    for name, total in magic_updates.items():
        add_total(magic_rows, name, total)
    source["magic_skills"] = sort_magic_skills(magic_rows)
    source["magic_abilities"] = normalise_text_rows(source.get("magic_abilities", []))
    source["reminders"] = [normalise_text(entry) for entry in source.get("reminders", [])]
    source["mental_health"] = [normalise_text(entry) for entry in source.get("mental_health", [])]
    source["wounds"] = [normalise_text(entry) for entry in source.get("wounds", [])]
    source["notes"] = [normalise_text(entry) for entry in source.get("notes", [])]
    source["assumptions"] = strict_assumptions(raw)
    source["companion_blocks"] = COMPANION_BLOCKS.get(slug, [])
    source["rune_affinities"] = extract_rune_affinities(source.get("cult_lines", []))
    source["cover_page"] = build_cover_page(slug, source)
    return source


def build_roster() -> dict[str, dict[str, Any]]:
    roster: dict[str, dict[str, Any]] = {}
    for path in sorted(RAW_DIR.glob("*-input.json")):
        slug = path.stem.replace("-input", "")
        roster[slug] = build_strict_source(slug, read_json(path))
    return roster


def generate_one(slug: str, source: dict[str, Any]) -> dict[str, Any]:
    input_path = INPUT_DIR / f"{slug}-input.json"
    computed_path = JSON_DIR / f"{slug}-computed.json"
    body_pdf_path = PDF_DIR / f"{slug}-mythras-sheet-body.pdf"
    pdf_path = PDF_DIR / f"{slug}-mythras-sheet.pdf"

    write_json(input_path, source)

    computed = TOOLS.compute_derived(source)
    TOOLS.dump_json(computed_path, computed)
    TOOLS.fill_pdf(TEMPLATE_PDF, body_pdf_path, computed["pdf_fields"])
    cover_pdf = Path(source["cover_page"]["pdf"])
    actual_pdf_path = TOOLS.prepend_cover_page(cover_pdf, body_pdf_path, pdf_path, source)
    if body_pdf_path.exists():
        body_pdf_path.unlink()

    fields = VALIDATOR.read_pdf_fields(actual_pdf_path)
    expected = VALIDATOR.load_expected_fields(computed_path)
    errors, warnings, notes = VALIDATOR.validate_sheet(fields, expected)
    blank_expected = blank_nonempty_expected_fields(fields, expected)
    if blank_expected:
        errors.append(f"Blank non-empty expected form fields: {', '.join(blank_expected)}")
    cover_missing: list[str] = []
    if not source.get("rune_affinities"):
        cover_missing.append("rune_affinities")
    if not source.get("cover_page", {}).get("how_to_play"):
        cover_missing.append("cover_page.how_to_play")
    if not cover_pdf.exists():
        cover_missing.append("cover_page.pdf")
    if cover_missing:
        errors.append(f"Missing cover-page source data: {', '.join(cover_missing)}")

    return {
        "name": source["character"]["name"],
        "input_json": str(input_path),
        "computed_json": str(computed_path),
        "pdf": str(actual_pdf_path),
        "page_count": 4,
        "characteristics": source["character"]["characteristics"],
        "rune_affinities": source.get("rune_affinities", []),
        "blank_nonempty_expected_fields": blank_expected,
        "cover_page_pdf": str(cover_pdf),
        "errors": errors,
        "warnings": warnings,
        "notes": notes,
        "adjustments": computed.get("adjustments", []),
    }


def main() -> int:
    if not TEMPLATE_SOURCE_PDF.exists():
        raise FileNotFoundError(f"Missing source template PDF at {TEMPLATE_SOURCE_PDF}")
    if not RAW_DIR.exists():
        raise FileNotFoundError(f"Missing raw source directory at {RAW_DIR}")
    if not COVER_PAGE_DIR.exists():
        raise FileNotFoundError(f"Missing extracted folio cover-page directory at {COVER_PAGE_DIR}")

    TOOLS.ensure_rqim_template(TEMPLATE_SOURCE_PDF, TEMPLATE_PDF)

    manifest: dict[str, Any] = {"characters": {}, "failed": []}
    roster = build_roster()
    for slug, source in roster.items():
        result = generate_one(slug, source)
        manifest["characters"][slug] = result
        if result["errors"]:
            manifest["failed"].append(slug)

    write_json(MANIFEST_PATH, manifest)
    write_json(VASANA_ASSET, roster["vasana"])

    print(f"Generated {len(manifest['characters'])} strict 75-point starter-set sheets.")
    print(f"Validation manifest: {MANIFEST_PATH}")
    if manifest["failed"]:
        print(f"Validation failures: {', '.join(manifest['failed'])}")
        return 1
    print("All sheets validated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
