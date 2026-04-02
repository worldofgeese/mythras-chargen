# NOTE: This script was imported from rqim-starter-set-kit. Some features require local assets not included in this repo. See PLAN.md Phase 2.
from __future__ import annotations

import argparse
import json
import math
import re
from collections import OrderedDict
from pathlib import Path
from typing import Any

from pypdf import PdfReader


CHARACTERISTIC_MINIMUMS = OrderedDict(
    [
        ("STR", 3),
        ("CON", 3),
        ("SIZ", 6),
        ("DEX", 3),
        ("INT", 6),
        ("POW", 3),
        ("CHA", 3),
    ]
)

CHARACTERISTIC_POINT_TOTAL = 75

STANDARD_SKILLS = {
    "Skill Base 1": ("Athletics", "STR + DEX"),
    "Skill Base 2": ("Boating", "STR + CON"),
    "Skill Base 3": ("Conceal", "DEX + POW"),
    "Skill Base 4": ("Customs", "INT x 2"),
    "Skill Base 5": ("Dance", "DEX + CHA"),
    "Skill Base 6": ("Deceit", "INT + CHA"),
    "Skill Base 7": ("Drive", "DEX + POW"),
    "Skill Base 8": ("First Aid", "INT + DEX"),
    "Skill Base 9": ("Influence", "CHA x 2"),
    "Skill Base 10": ("Insight", "INT + POW"),
    "Skill Base 11": ("Locale", "INT x 2"),
    "Skill Base 12": ("Perception", "INT + POW"),
    "Skill Base 13": ("Ride", "DEX + POW"),
    "Skill Base 14": ("Sing", "POW + CHA"),
    "Skill Base 15": ("Stealth", "DEX + INT"),
    "Skill Base 16": ("Swim", "STR + CON"),
    "Skill Base 17": ("Unarmed", "STR + DEX"),
}

RESISTANCES = {
    "Resistance Base 1": ("Brawn", "STR + SIZ"),
    "Resistance Base 2": ("Endurance", "CON x 2"),
    "Resistance Base 3": ("Evade", "DEX x 2"),
    "Resistance Base 4": ("Willpower", "POW x 2"),
}

NAMED_SKILL_FORMULAS = {
    "acting": "CHA x 2",
    "acrobatics": "STR + DEX",
    "art": "POW + CHA",
    "binding": "POW + CHA",
    "bureaucracy": "INT x 2",
    "commerce": "INT + CHA",
    "courtesy": "INT + CHA",
    "craft": "DEX + INT",
    "culture": "INT x 2",
    "devotion": "POW + CHA",
    "disguise": "INT + CHA",
    "engineering": "INT x 2",
    "exhort": "INT + CHA",
    "folkmagic": "POW + CHA",
    "gambling": "INT + POW",
    "healing": "INT + POW",
    "invocation": "INT x 2",
    "language": "INT + CHA",
    "literacy": "INT x 2",
    "lockpicking": "DEX x 2",
    "lore": "INT x 2",
    "mechanisms": "DEX + INT",
    "meditation": "INT + CON",
    "musicianship": "DEX + CHA",
    "mysticism": "POW + CON",
    "navigation": "INT + POW",
    "oratory": "POW + CHA",
    "seamanship": "INT + CON",
    "seduction": "INT + CHA",
    "shaping": "INT + POW",
    "sleight": "DEX + CHA",
    "streetwise": "POW + CHA",
    "survival": "CON + POW",
    "teach": "INT + CHA",
    "track": "INT + CON",
    "trance": "POW + CON",
}

ALIASES = {
    "devot": "devotion",
    "folkmagic": "folkmagic",
    "folkmgc": "folkmagic",
    "invoc": "invocation",
    "medit": "meditation",
    "meditate": "meditation",
    "orate": "oratory",
    "readwrite": "literacy",
}


def read_pdf_fields(path: Path) -> dict[str, str]:
    reader = PdfReader(str(path))
    return {key: clean_text(value) for key, value in (reader.get_form_text_fields() or {}).items()}


def load_expected_fields(path: Path) -> dict[str, str]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    field_map = payload.get("pdf_fields", payload)
    return {key: clean_text(value) for key, value in field_map.items()}


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def parse_number(value: str, field_name: str) -> float:
    if value == "":
        raise ValueError(f"{field_name} is blank")
    return float(value)


def parse_int_field(fields: dict[str, str], name: str) -> int:
    return int(round(parse_number(fields.get(name, ""), name)))


def parse_float_field(fields: dict[str, str], name: str) -> float:
    return float(parse_number(fields.get(name, ""), name))


def eval_formula(formula: str, characteristics: dict[str, int]) -> int:
    compact = formula.replace(" ", "")
    if "+" in compact:
        return sum(characteristics[token] for token in compact.split("+"))
    if "x" in compact:
        token, multiplier = compact.split("x", maxsplit=1)
        return characteristics[token] * int(multiplier)
    return characteristics[compact]


def thresholds(total: int) -> dict[str, int]:
    return {
        "VE": math.ceil(total * 2),
        "E": math.ceil(total + (total / 2)),
        "HD": math.ceil(total - (total / 3)),
        "FM": math.ceil(total / 2),
        "HC": math.ceil(total / 10),
    }


def compute_action_points(total: int) -> int:
    if total <= 12:
        return 1
    if total <= 24:
        return 2
    if total <= 36:
        return 3
    return 3 + math.ceil((total - 36) / 12)


def compute_band_value(total: int, low_max: int, first: int, step: int) -> int:
    if total <= low_max:
        return first
    return first + math.ceil((total - low_max) / step)


def compute_damage_modifier(total: int) -> str:
    bands = [
        (5, "-1d8"),
        (10, "-1d6"),
        (15, "-1d4"),
        (20, "-1d2"),
        (25, "+0"),
        (30, "+1d2"),
        (35, "+1d4"),
        (40, "+1d6"),
        (45, "+1d8"),
        (50, "+1d10"),
        (60, "+1d12"),
        (70, "+2d6"),
        (80, "+1d8+1d6"),
        (90, "+2d8"),
        (100, "+1d10+1d8"),
        (110, "+2d10"),
        (120, "+2d10+1d2"),
        (130, "+2d10+1d4"),
    ]
    for upper, value in bands:
        if total <= upper:
            return value
    return "+2d10+1d4"


def compute_hit_points(total: int) -> int:
    return max(math.ceil(total / 5), 1)


def hit_locations(total: int) -> dict[str, int]:
    base_hp = compute_hit_points(total)
    return {
        "Head": base_hp,
        "Chest": base_hp + 2,
        "Abdomen": base_hp + 1,
        "Right Arm": max(base_hp - 1, 1),
        "Left Arm": max(base_hp - 1, 1),
        "Right Leg": base_hp,
        "Left Leg": base_hp,
    }


def normalise_formula_name(name: str) -> str:
    lowered = re.sub(r"\s+", " ", name.strip().lower())
    if lowered.startswith("speak "):
        return "language"
    if lowered.startswith("read/write") or lowered.startswith("read / write"):
        return "literacy"
    for prefix, normalised in [
        ("binding", "binding"),
        ("craft", "craft"),
        ("culture", "culture"),
        ("devotion", "devotion"),
        ("folk magic", "folkmagic"),
        ("healing", "healing"),
        ("invocation", "invocation"),
        ("language", "language"),
        ("literacy", "literacy"),
        ("lore", "lore"),
        ("meditation", "meditation"),
        ("musicianship", "musicianship"),
        ("trance", "trance"),
    ]:
        if lowered.startswith(prefix):
            return normalised
    key = re.sub(r"\(.*?\)", "", lowered)
    key = re.sub(r"[^a-z]+", "", key)
    return ALIASES.get(key, key)


def compare_values(actual: str, expected: str) -> bool:
    a = clean_text(actual)
    b = clean_text(expected)
    if a == b:
        return True
    try:
        return math.isclose(float(a), float(b), rel_tol=0, abs_tol=0.01)
    except ValueError:
        return False


def display_number(value: float | int) -> str:
    numeric = float(value)
    if math.isclose(numeric, round(numeric), rel_tol=0, abs_tol=0.0001):
        return str(int(round(numeric)))
    return f"{numeric:.1f}".rstrip("0").rstrip(".")


def validate_named_skill(name: str) -> bool:
    return normalise_formula_name(name) in NAMED_SKILL_FORMULAS


def validate_sheet(fields: dict[str, str], expected_fields: dict[str, str] | None) -> tuple[list[str], list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    notes: list[str] = []

    required_fields = [
        "Character Name",
        "Race/Culture",
        "Homeland",
        "Career",
        "Social Class",
        "STR",
        "CON",
        "SIZ",
        "DEX",
        "INT",
        "POW",
        "CHA",
    ]
    for name in required_fields:
        if clean_text(fields.get(name, "")) == "":
            errors.append(f"Required field `{name}` is blank.")

    if errors:
        return errors, warnings, notes

    characteristics = {name: parse_int_field(fields, name) for name in CHARACTERISTIC_MINIMUMS}
    characteristic_total = sum(characteristics.values())
    if characteristic_total != CHARACTERISTIC_POINT_TOTAL:
        errors.append(
            f"Characteristic total is `{characteristic_total}` but strict starter-set builds must total `{CHARACTERISTIC_POINT_TOTAL}`."
        )
    for name, minimum in CHARACTERISTIC_MINIMUMS.items():
        if characteristics[name] < minimum:
            errors.append(f"`{name}` is `{characteristics[name]}` but must be at least `{minimum}`.")

    expected_action_points = compute_action_points(characteristics["INT"] + characteristics["DEX"])
    expected_damage_modifier = compute_damage_modifier(characteristics["STR"] + characteristics["SIZ"])
    expected_experience_modifier = compute_band_value(characteristics["CHA"], 6, -1, 6)
    expected_healing_rate = compute_band_value(characteristics["CON"], 6, 1, 6)
    expected_luck_points = compute_band_value(characteristics["POW"], 6, 1, 6)
    expected_magic_points_max = characteristics["POW"] + parse_int_field(fields, "T_MP")
    expected_native_language_base = characteristics["INT"] + characteristics["CHA"]
    expected_locations = hit_locations(characteristics["CON"] + characteristics["SIZ"])
    expected_devotional_cap = math.ceil(characteristics["POW"] / 2)

    checks = {
        "Action Points": str(expected_action_points),
        "Action Points Max": str(expected_action_points),
        "Damage Modifier": expected_damage_modifier,
        "Damage Modifier Max": expected_damage_modifier,
        "Experience Modifier": str(expected_experience_modifier),
        "Experience Modifdier Max": str(expected_experience_modifier),
        "Healing Rate": str(expected_healing_rate),
        "Healing Rate Max": str(expected_healing_rate),
        "Initiative": str(math.ceil((characteristics["INT"] + characteristics["DEX"]) / 2)),
        "Initiative Max": str(math.ceil((characteristics["INT"] + characteristics["DEX"]) / 2)),
        "Luck Points": str(expected_luck_points),
        "Luck Points Max": str(expected_luck_points),
        "MP_Max": str(expected_magic_points_max),
        "Native Language Base": str(expected_native_language_base),
    }
    for name, expected in checks.items():
        if name in fields and not compare_values(fields.get(name, ""), expected):
            errors.append(f"`{name}` is `{fields.get(name, '')}` but expected `{expected}`.")

    dp_max = clean_text(fields.get("DP_Max", ""))
    dp_current = clean_text(fields.get("DP", ""))
    if dp_max:
        dp_max_value = int(round(float(dp_max)))
        if dp_max_value > expected_devotional_cap:
            errors.append(f"`DP_Max` is `{dp_max_value}` but may not exceed half POW, here `{expected_devotional_cap}`.")
        if dp_current and int(round(float(dp_current))) > dp_max_value:
            errors.append(f"`DP` is `{dp_current}` but exceeds `DP_Max` `{dp_max_value}`.")

    for name, expected in expected_locations.items():
        for field_name in [name, f"{name} Max"]:
            if field_name in fields and not compare_values(fields.get(field_name, ""), str(expected)):
                errors.append(f"`{field_name}` is `{fields.get(field_name, '')}` but expected `{expected}`.")

    for field_name, (_, formula) in STANDARD_SKILLS.items():
        expected = eval_formula(formula, characteristics)
        if not compare_values(fields.get(field_name, ""), str(expected)):
            errors.append(f"`{field_name}` is `{fields.get(field_name, '')}` but expected `{expected}`.")

    for field_name, (_, formula) in RESISTANCES.items():
        expected = eval_formula(formula, characteristics)
        if not compare_values(fields.get(field_name, ""), str(expected)):
            errors.append(f"`{field_name}` is `{fields.get(field_name, '')}` but expected `{expected}`.")

    for prefix, total_prefix, count in [("SK", "Total_SK_", 17), ("RE", "Total_RE_", 4), ("LG", "Total_LG_", 6), ("PK", "Total_PK_", 14), ("MK", "Total_MK_", 9), ("CS", "Total_CS_", 4)]:
        for index in range(1, count + 1):
            total_raw = clean_text(fields.get(f"{total_prefix}{index}", ""))
            if total_raw == "":
                continue
            total = int(round(float(total_raw)))
            expected_thresholds = thresholds(total)
            for key, value in expected_thresholds.items():
                field_name = f"{key}_{prefix}_{index}"
                if field_name in fields and not compare_values(fields.get(field_name, ""), str(value)):
                    errors.append(f"`{field_name}` is `{fields.get(field_name, '')}` but expected `{value}`.")

    for index in range(1, 15):
        skill_name = clean_text(fields.get(f"Prof Skill {index}", ""))
        base_field = f"Prof Base {index}"
        if skill_name == "" and clean_text(fields.get(base_field, "")) == "":
            continue
        if skill_name == "":
            errors.append(f"`Prof Skill {index}` is blank while `{base_field}` is populated.")
            continue
        if not validate_named_skill(skill_name):
            errors.append(f"`Prof Skill {index}` uses unsupported non-core skill `{skill_name}`.")
            continue
        expected = eval_formula(NAMED_SKILL_FORMULAS[normalise_formula_name(skill_name)], characteristics)
        if not compare_values(fields.get(base_field, ""), str(expected)):
            errors.append(f"`{base_field}` for `{skill_name}` is `{fields.get(base_field, '')}` but expected `{expected}`.")

    for index in range(1, 10):
        skill_name = clean_text(fields.get(f"Magic Skill {index}", ""))
        base_field = f"Magic Base {index}"
        if skill_name == "" and clean_text(fields.get(base_field, "")) == "":
            continue
        if skill_name == "":
            errors.append(f"`Magic Skill {index}` is blank while `{base_field}` is populated.")
            continue
        if not validate_named_skill(skill_name):
            errors.append(f"`Magic Skill {index}` uses unsupported non-core skill `{skill_name}`.")
            continue
        expected = eval_formula(NAMED_SKILL_FORMULAS[normalise_formula_name(skill_name)], characteristics)
        if not compare_values(fields.get(base_field, ""), str(expected)):
            errors.append(f"`{base_field}` for `{skill_name}` is `{fields.get(base_field, '')}` but expected `{expected}`.")

    armor_enc = sum(int(round(float(clean_text(fields.get(f"Armor ENC {index}", "0") or "0")))) for index in range(1, 8))
    expected_armor_penalty = math.ceil(armor_enc / 5) if armor_enc else 0
    if not compare_values(fields.get("Total Armor ENC", ""), str(armor_enc)):
        errors.append(f"`Total Armor ENC` is `{fields.get('Total Armor ENC', '')}` but expected `{armor_enc}`.")
    if not compare_values(fields.get("Armor Penalty", ""), str(expected_armor_penalty)):
        errors.append(f"`Armor Penalty` is `{fields.get('Armor Penalty', '')}` but expected `{expected_armor_penalty}`.")

    item_enc = sum(int(round(float(clean_text(fields.get(f"Item ENC {index}", "0") or "0")))) for index in range(1, 13))
    melee_enc = sum(int(round(float(clean_text(fields.get(f"WS ENC {index}", "0") or "0")))) for index in range(1, 8))
    ranged_enc = sum(int(round(float(clean_text(fields.get(f"RW ENC {index}", "0") or "0")))) for index in range(1, 4))
    expected_total_enc = item_enc + melee_enc + ranged_enc + math.ceil(armor_enc / 2)
    if not compare_values(fields.get("calc_TotalENC", ""), str(expected_total_enc)):
        errors.append(f"`calc_TotalENC` is `{fields.get('calc_TotalENC', '')}` but expected `{expected_total_enc}`.")

    strength = characteristics["STR"]
    thresholds_expected = {
        "Unencumbered_Black": str(strength),
        "Burdened_Orange": str(strength * 2),
        "Overloaded_Red": str(strength * 3),
    }
    for name, expected in thresholds_expected.items():
        if not compare_values(fields.get(name, ""), expected):
            errors.append(f"`{name}` is `{fields.get(name, '')}` but expected `{expected}`.")

    current_enc_fields = ["ItemTotalENC_Black", "ItemTotalENC_Orange", "ItemTotalENC_Red"]
    filled_current = [name for name in current_enc_fields if clean_text(fields.get(name, "")) != ""]
    if len(filled_current) != 1:
        errors.append("Exactly one colored total-encumbrance field should be populated.")
    else:
        filled_name = filled_current[0]
        if not compare_values(fields.get(filled_name, ""), str(expected_total_enc)):
            errors.append(f"`{filled_name}` is `{fields.get(filled_name, '')}` but expected `{expected_total_enc}`.")

    movement_rate = parse_float_field(fields, "Movement Rate")
    athletics_total = parse_float_field(fields, "Total_SK_1")
    swim_total = parse_float_field(fields, "Total_SK_16")
    height_m = parse_float_field(fields, "Height") / 100
    expected_walk = movement_rate
    expected_run = ((movement_rate + (math.floor(athletics_total / 25) * 0.5)) * 3) - expected_armor_penalty
    expected_sprint = ((movement_rate + math.floor(athletics_total / 25)) * 5) - expected_armor_penalty
    expected_horizontal_jump = max((2 * height_m) + math.floor(athletics_total / 20) - math.ceil(expected_armor_penalty / 2), 1)
    expected_vertical_jump = max((0.5 * height_m) + (math.floor(athletics_total / 20) * 0.2) - math.ceil(expected_armor_penalty / 2), 1)
    swim_speed = movement_rate + math.floor(swim_total / 20)
    expected_swim = max(math.ceil(swim_speed / 2) - expected_armor_penalty, 0) if expected_armor_penalty else swim_speed
    expected_movement_outputs = {
        "Walk": display_number(expected_walk),
        "Run": display_number(expected_run),
        "Sprint": display_number(expected_sprint),
        "Horizontal Jump": display_number(expected_horizontal_jump),
        "Vertical Jump": display_number(expected_vertical_jump),
        "Rugged Surface Climb": display_number(max(movement_rate - math.ceil(expected_armor_penalty / 2), 0)),
        "Steep Surface Climb": display_number(max(movement_rate - expected_armor_penalty, 0)),
        "Sheer Surface Climb": display_number(max(movement_rate - (expected_armor_penalty * 2), 0)),
        "Swim": display_number(expected_swim),
    }
    for name, expected in expected_movement_outputs.items():
        if not compare_values(fields.get(name, ""), expected):
            errors.append(f"`{name}` is `{fields.get(name, '')}` but expected `{expected}`.")

    if expected_fields is not None:
        for name, expected in expected_fields.items():
            if name not in fields:
                continue
            actual = clean_text(fields.get(name, ""))
            if expected == "" and actual == "":
                continue
            if not compare_values(actual, expected):
                errors.append(f"Expected-map mismatch for `{name}`: PDF has `{actual}` but expected `{expected}`.")

    return errors, warnings, notes


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Validate a filled Mythras character sheet against strict Mythras Core starter-set rules.")
    parser.add_argument("--pdf", required=True, help="Path to the filled PDF character sheet.")
    parser.add_argument("--expected-json", help="Optional computed JSON containing a pdf_fields map.")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    fields = read_pdf_fields(Path(args.pdf))
    expected_fields = load_expected_fields(Path(args.expected_json)) if args.expected_json else None
    errors, warnings, notes = validate_sheet(fields, expected_fields)

    print(f"Validated {len(fields)} text fields from {args.pdf}")
    if notes:
        print("Notes:")
        for note in notes:
            print(f"- {note}")
    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"- {warning}")
    if errors:
        print("Errors:")
        for error in errors:
            print(f"- {error}")
        print(f"FAILED with {len(errors)} error(s).")
        return 1
    print("PASS: sheet is a valid strict 75-point Mythras Core starter-set build.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
