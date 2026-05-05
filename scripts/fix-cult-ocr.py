#!/usr/bin/env python3
"""Fix OCR artifacts in cult reference JSON files.

Reads upstream PDFs from references/cults-upstream/ using pdfplumber,
extracts clean structured data, and writes corrected JSON to references/cults-raw/.

The cult one-pager PDFs use a custom Gloranthan rune font. Text extractors misread
these rune glyphs as letters appended to words. This script strips those artifacts.

Usage:
    python3.11 scripts/fix-cult-ocr.py              # Process all cult PDFs
    python3.11 scripts/fix-cult-ocr.py --dry-run    # Show changes without writing
    python3.11 scripts/fix-cult-ocr.py Storm/Humakt.pdf  # Process one file
"""
import json
import os
import re
import sys
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("ERROR: pdfplumber not installed. Run: pip install pdfplumber", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = ROOT / "references" / "cults-upstream"
OUTPUT = ROOT / "references" / "cults-raw"

# Skip non-cult PDFs
SKIP_PATTERNS = [
    "Pantheon Cult Catalogue",
    "Pantheon Cult Relationships",
    "Pantheon Cult Spell Catalogue",
    "Pantheon Personality Traits",
    "cover pages",
    "dragged",
]

# ============================================================
# RUNE NOTATION CLEANUP
# ============================================================

# Known personality trait corrections: garbled -> correct
# The suffix character represents a rune glyph:
#   t/† = Death, y/Y = Truth, W = Mastery, s = Movement,
#   g/G = Storm/Air, B = Beast, e = Earth, l = Life/Fertility,
#   d = Darkness, r = Disorder, f = Spirit/Shamanic, q = Stasis,
#   h = Harmony, i = Illusion, j = Disorder, x = Lunar/Moon,
#   w = Water, o = Darkness, m = Moon/Balance, v = Undeath/Vivamort
TRAIT_FIXES = {
    "Relentlesst": "Relentless",
    "Ruthlesst": "Ruthless",
    "Unemotionalt": "Unemotional",
    "Ascetict": "Ascetic",
    "Truthfuly": "Truthful",
    "Observanty": "Observant",
    "Dutifuly": "Dutiful",
    "Faithfuly": "Faithful",
    "Fairy": "Fair",
    "ProudW": "Proud",
    "JustW": "Just",
    "AuthoritativeW": "Authoritative",
    "Proudw": "Proud",
    "Justw": "Just",
    "Authoritativew": "Authoritative",
    "Adventurouss": "Adventurous",
    "Dynamics": "Dynamic",
    "Impulsives": "Impulsive",
    "Recklesss": "Reckless",
    "Energetics": "Energetic",
    "Rebelliouss": "Rebellious",
    "Passionateg": "Passionate",
    "Proudg": "Proud",
    "Unpredictableg": "Unpredictable",
    "Violentg": "Violent",
    "UncouthB": "Uncouth",
    "Rough-edgedB": "Rough-edged",
    "LoyalB": "Loyal",
    "WildB": "Wild",
    "InstinctiveB": "Instinctive",
    "SavageB": "Savage",
    "Worldlye": "Worldly",
    "Sensuale": "Sensual",
    "Prudente": "Prudent",
    "Pragmatice": "Pragmatic",
    "Generousx": "Generous",
    "Lustfulx": "Lustful",
    "Pleasureseekingx": "Pleasure-seeking",
    "Forgivingl": "Forgiving",
    "Mercifull": "Merciful",
    "Peacefull": "Peaceful",
    "Generousl": "Generous",
    "Compassionatel": "Compassionate",
    "Deceitfuli": "Deceitful",
    "Cowardlyi": "Cowardly",
    "Corruptedi": "Corrupted",
    "Imaginativei": "Imaginative",
    "Subjectivei": "Subjective",
    "Fairdealingh": "Fair-dealing",
    "Openmindedh": "Open-minded",
    "Mercurialw": "Mercurial",
    "Capriciousw": "Capricious",
    "Mutablew": "Mutable",
    "Crueld": "Cruel",
    "Coldd": "Cold",
    "Cruelo": "Cruel",
    "Coldo": "Cold",
    "Secretived": "Secretive",
    "Patientd": "Patient",
    "Secretiveo": "Secretive",
    "Patiento": "Patient",
    "Destructivej": "Destructive",
    "Recklessj": "Reckless",
    "Selfishj": "Selfish",
    "Greedyj": "Greedy",
    "Stubbornq": "Stubborn",
    "Inflexibleq": "Inflexible",
    "Exactingq": "Exacting",
    "Conservativeq": "Conservative",
    "Ecstaticb": "Ecstatic",
    "Spiritualb": "Spiritual",
    "Awareb": "Aware",
    "Mysticalb": "Mystical",
    "Ecstaticf": "Ecstatic",
    "Spiritualf": "Spiritual",
    "Awaref": "Aware",
    "Mysticalf": "Mystical",
    "Tolerantm": "Tolerant",
    "Balancedm": "Balanced",
    "Liberationm": "Liberation",
    "Open-mindedm": "Open-minded",
    "Relentlessv": "Relentless",
    "Coldv": "Cold",
    "Soullessv": "Soulless",
    "Fiendishv": "Fiendish",
    "Destructiver": "Destructive",
    "Selfishr": "Selfish",
    "Greedyr": "Greedy",
    "Recklessr": "Reckless",
    "Logicall": "Logical",
    "Rigorousl": "Rigorous",
    "Materialisticl": "Materialistic",
    # Stasis rune (c) - typically paired with Law/Stasis cults
    "Stubbornc": "Stubborn",
    "Inflexiblec": "Inflexible",
    "Exactingc": "Exacting",
    "Conservativec": "Conservative",
    # Lunar/Moon rune (4) - Lunar cults
    "Tolerant4": "Tolerant",
    "Balanced4": "Balanced",
    "Spiritualliberation4": "Spiritual Liberation",
    "Open-minded4": "Open-minded",
    # Fertility/Plant rune (p)
    "UnstoppableGrowthp": "Unstoppable Growth",
    "Nurturingp": "Nurturing",
    # Undeath rune (u)
    "Soullessu": "Soulless",
    "Fiendishu": "Fiendish",
    "Relentlessu": "Relentless",
    # Fire/Sky rune (O or punctuation artifacts)
    "LoyalO": "Loyal",
    "HonestO": "Honest",
    "PurityO": "Purity",
    # Law/Stasis (a)
    "Logicala": "Logical",
    "Rigorousa": "Rigorous",
    "Materialistica": "Materialistic",
    # Earth/Darkness rune (K)
    "RecklessK": "Reckless",
    "FatalisticK": "Fatalistic",
}

# Traits that appear with trailing punctuation (from Fire/Sky rune glyph)
TRAIT_PUNCT_FIXES = {
    "Loyal,": "Loyal",
    "Honest.": "Honest",
    "Pure.": "Pure",
    "Idealist.": "Idealist",
    "Chastity.": "Chastity",
    "Tribal,": "Tribal",
    "Social,": "Social",
}

# Rune prefix patterns in miracle lines (these appear before miracle names)
# They represent which rune(s) power the miracle
MIRACLE_RUNE_PREFIXES = re.compile(
    r'^(?:'
    r'[ytgBWesolhijxcwadfrqm,\.;:4]+\s+'  # Single/multi char rune codes
    r'|Rce\s+'          # Garbled multi-rune sequence
    r'|Wo\s+'           # Another garbled sequence
    r'|Wegow\s+'        # Yet another
    r')',
    re.IGNORECASE
)

# Known miracle names for splitting combined strings
KNOWN_MIRACLES = [
    "Dismiss Elemental", "Dismiss Air Elemental", "Dismiss Large Air Elemental",
    "Multispell", "Shield", "Warding", "Bat Wings", "Fangs", "Power Drain",
    "Summon Lune", "True Weapon", "Path Watch", "Reflection", "Seal", "Special Lock",
    "Exchange Spells", "Extension", "Find", "Divination", "Chastise",
    "Command", "Dismiss Magic", "Heal Wound", "Spirit Block", "Appease Earth",
    "Fear", "Command Swine", "Death Binding", "Pain Tooth", "Seal wound",
    "Berserk", "Face Chaos", "Impede Chaos", "Defend Against Chaos",
    "Summon Sylph", "Summon Large Sylph", "Decrease Wind", "Increase Wind",
    "Wind Warp", "Detect Truth", "Oath", "Turn Undead", "Bind Ghost",
    "Sword Trance", "Sanctify", "Sever Spirit", "Mindlink", "Morale",
    "Excommunication", "Summon Spirit of Reprisal", "Strongblade",
    "Lightning", "Flight", "Leap", "Mist Cloud", "Cloud Call", "Cloud Clear",
    "Wind Words", "Dark Walk", "Command Worshippers", "Command Priests",
    "Detect Honor", "Fearless", "Bless Thunderstone", "Bless Woad",
    "Earth Shield", "Thunderbolt", "Guided Teleportation", "Teleportation",
    "Heal Body", "Bear's Strength", "Earthpower", "Snow", "Rain",
    "Command Sheep", "Identify Scent", "Analyze Magic", "Charisma",
    "Tame Bull", "Restore Health", "Cure Chaos Wound",
    "Speak To/With Specific Creatures",
]

# Metadata text that leaks into cultSkills arrays
SKILL_ARTIFACTS = [
    r"to be convinced at \d+ of them\.",
    r"Rune levels?\s+need to have \d+ cult skills at \d+%.*",
    r"Bold skills\s*are mandatory",
    r"Cult Skills \(.*?\)",
    r"\(\*\)\s*=\s*progressive spell",
]


def extract_text(pdf_path: Path) -> str:
    """Extract all text from a PDF using pdfplumber."""
    with pdfplumber.open(str(pdf_path)) as pdf:
        pages = []
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
        return "\n".join(pages)


def fix_trait(word: str) -> str:
    """Fix a single personality trait word."""
    word = word.strip()
    if not word:
        return ""
    # Direct lookup in main fixes
    if word in TRAIT_FIXES:
        return TRAIT_FIXES[word]
    # Check punctuation fixes
    if word in TRAIT_PUNCT_FIXES:
        return TRAIT_PUNCT_FIXES[word]
    # Try case variations
    for key, val in TRAIT_FIXES.items():
        if key.lower() == word.lower():
            return val
    # Strip CID references: "Social(cid:0)" -> "Social"
    word = re.sub(r'\(cid:\d+\)', '', word)
    # Strip trailing digits that are rune markers
    word = re.sub(r'(\w+?)[0-9]$', r'\1', word)
    # Strip trailing punctuation that's not part of the word
    word = re.sub(r'([a-zA-Z\-]+)[,\.\;\:]$', r'\1', word)
    # Skip words that are clearly not traits (too short, or clearly metadata)
    if len(word) < 3:
        return ""
    if word.lower() in ("with", "the", "and", "for", "are", "its", "has", "not", "any", "all"):
        return ""
    return word


def parse_personality_traits(text: str) -> list:
    """Extract and clean personality traits from PDF text."""
    match = re.search(r"Personality Traits\n(.+?)(?:\n(?:Opposing|Rune Meanings|$))", text, re.DOTALL)
    if not match:
        return []
    raw = match.group(1).strip()
    # Only take the first line (traits are on one line; subsequent lines are other sections)
    first_line = raw.split('\n')[0]
    # Split on whitespace - each word may have a rune suffix
    words = first_line.split()
    traits = []
    # Words that are clearly NOT personality traits (leaked from adjacent sections)
    not_traits = {"Evil?", "Chaos?", "Days", "Holy", "association", "Pavis's", "Chaos's"}
    for word in words:
        if word in not_traits:
            continue
        # Skip words containing '/' (holy day entries that leaked)
        if '/' in word:
            continue
        # Skip possessives
        if "'s" in word:
            continue
        fixed = fix_trait(word)
        if fixed and len(fixed) > 2 and fixed not in traits:
            traits.append(fixed)
    return traits


def parse_cult_skills(text: str) -> list:
    """Extract cult skills, removing metadata leakage."""
    match = re.search(
        r"Cult Skills\s*\(.*?\)\s*\n(.*?)(?:Folk Magic|$)",
        text, re.DOTALL | re.IGNORECASE
    )
    if not match:
        return []
    raw = match.group(1).strip()
    # Remove known artifacts
    for pattern in SKILL_ARTIFACTS:
        raw = re.sub(pattern, "", raw, flags=re.IGNORECASE)
    # Split on comma
    skills = [s.strip() for s in re.split(r",\s*", raw)]
    # Clean each skill
    cleaned = []
    for skill in skills:
        skill = skill.strip()
        # Remove superscript markers
        skill = re.sub(r'[\u00b9\u00b2\u00b3\u2074-\u2079]', '', skill)
        # Remove newlines within a skill name
        skill = skill.replace('\n', ' ').strip()
        # Skip empty or very short entries
        if len(skill) < 2:
            continue
        # Skip if it's clearly metadata
        if any(re.search(p, skill, re.IGNORECASE) for p in SKILL_ARTIFACTS):
            continue
        cleaned.append(skill)
    return cleaned


def parse_folk_magic(text: str) -> list:
    """Extract folk magic spells."""
    match = re.search(
        r"Folk Magic for Initiates.*?\n(.*?)(?:Theist Miracles|$)",
        text, re.DOTALL | re.IGNORECASE
    )
    if not match:
        return []
    raw = match.group(1).strip()
    # Remove (*) progressive markers
    raw = re.sub(r"\(\*\)", "", raw)
    # Remove the "= progressive spell" note
    raw = re.sub(r"\*?\s*=\s*progressive spell", "", raw, flags=re.IGNORECASE)
    spells = [s.strip() for s in re.split(r",\s*", raw)]
    return [s for s in spells if s and len(s) > 1]


def clean_miracle_name(name: str) -> str:
    """Remove rune prefix notation from a miracle name."""
    name = name.strip()
    if not name:
        return ""
    # Remove known garbled multi-char rune sequences (mixed case)
    for prefix in ['Rce ', 'RW ', 'Rc ', 'Wo ', 'Wegow ', '4o ', '?t ', 'Bb ', 'RS ', 'Xt ']:
        if name.startswith(prefix):
            name = name[len(prefix):]
    # Remove leading rune characters (lowercase letters, digits, punctuation before a capital letter)
    cleaned = re.sub(r'^[a-z,\.;:0-9]+\s+', '', name)
    # Remove leading symbols
    cleaned = re.sub(r'^[,\.;:\s]+', '', cleaned)
    return cleaned.strip()


def split_combined_miracles(text: str) -> list:
    """Split a string that may contain multiple miracles separated by rune glyphs."""
    # Try to find known miracle names in the string
    results = []
    remaining = text
    # Sort by length descending to match longest names first
    sorted_miracles = sorted(KNOWN_MIRACLES, key=len, reverse=True)
    while remaining:
        found = False
        for miracle in sorted_miracles:
            idx = remaining.find(miracle)
            if idx != -1:
                results.append(miracle)
                remaining = remaining[idx + len(miracle):].strip()
                # Strip any rune prefix chars before next miracle
                remaining = re.sub(r'^[a-z,\.;:0-9\?\s]+', '', remaining).strip()
                found = True
                break
        if not found:
            # No known miracle found - check for "Find (Specific Thing)" pattern
            m = re.match(r'Find\s*\([^)]+\)', remaining)
            if m:
                results.append(m.group(0))
                remaining = remaining[m.end():].strip()
                remaining = re.sub(r'^[a-z,\.;:0-9\?\s]+', '', remaining).strip()
            else:
                break
    return results


def parse_miracles(text: str) -> list:
    """Extract theist miracles from PDF text."""
    # Find the miracles section
    match = re.search(
        r"Theist Miracles\s*-\s*Initiate:.*?\n(.*?)(?:Initiate\s*-\s*associate|Runelord|Pantheons|$)",
        text, re.DOTALL | re.IGNORECASE
    )
    if not match:
        return []
    raw = match.group(1).strip()
    # Normalize newlines to spaces
    raw = raw.replace('\n', ' ')
    # Protect commas inside parentheses before splitting
    # e.g., "Command (Specific Species, Monster or Spirit)"
    protected = re.sub(r'\(([^)]*)\)', lambda m: '(' + m.group(1).replace(',', ';') + ')', raw)
    # Split on comma
    parts = [p.strip() for p in re.split(r",\s*", protected)]
    miracles = []
    for part in parts:
        # Restore protected commas
        part = part.replace(';', ',')
        name = clean_miracle_name(part)
        if name and len(name) > 1:
            # Remove footnote markers
            name = re.sub(r'[\u00b9\u00b2\u00b3\u2074-\u2079]', '', name)
            # Check if this is a combined string (multiple miracles without comma separators)
            # Heuristic: contains lowercase rune chars between uppercase words, is very long,
            # and has multiple capital-letter words not matching a known single miracle
            if len(name) > 50 and re.search(r'[a-z]\s+[A-Z].*[a-z]\s+[A-Z]', name):
                # Try to split it
                split = split_combined_miracles(name)
                if len(split) > 1:
                    for s in split:
                        if s not in miracles:
                            miracles.append(s)
                    continue
            if name not in miracles:
                miracles.append(name)
    return miracles


def parse_associate_miracles(text: str) -> list:
    """Extract associate cult miracles."""
    match = re.search(
        r"Initiate\s*-\s*associate:.*?\n(.*?)(?:Runelord|Initiate\s*-\s*subservient|Pantheons|$)",
        text, re.DOTALL | re.IGNORECASE
    )
    if not match:
        return []
    raw = match.group(1).strip().replace('\n', ' ')
    # Format: "CultName(a):rune MiracleName, CultName(a):rune MiracleName"
    entries = re.findall(r'(\w[\w\s]*?)\(a\)[:\s]*(.*?)(?=\w[\w\s]*?\(a\)|$)', raw)
    results = []
    for cult_name, miracle_part in entries:
        miracle_part = miracle_part.strip().rstrip(',').strip()
        # Strip rune prefix from miracle name (includes Rce, Xt, Bx, px, ei, et, etc.)
        miracle_name = re.sub(r'^[A-Za-z]{1,4}\s+', '', miracle_part) if re.match(r'^[a-zA-Z]{1,4}\s+[A-Z]', miracle_part) else miracle_part
        miracle_name = clean_miracle_name(miracle_name) if miracle_name == miracle_part else miracle_name
        if miracle_name:
            results.append(f"{cult_name.strip()}:{miracle_name}")
    return results


def parse_runelord_miracles(text: str) -> list:
    """Extract runelord miracles."""
    match = re.search(
        r"Runelord:\s*.*?\n(.*?)(?:Runelord\s*-\s*associate|Pantheons|Source|$)",
        text, re.DOTALL | re.IGNORECASE
    )
    if not match:
        return []
    raw = match.group(1).strip()
    parts = [p.strip() for p in re.split(r",\s*", raw)]
    miracles = []
    for part in parts:
        name = clean_miracle_name(part)
        if name and len(name) > 1:
            name = re.sub(r'[\u00b9\u00b2\u00b3\u2074-\u2079]', '', name)
            if name not in miracles:
                miracles.append(name)
    return miracles


def parse_holy_days(text: str) -> list:
    """Extract holy days, properly splitting entries."""
    match = re.search(
        r"Holy Days\n(.*?)(?:Sacrifices|Spirit Societies|Rune Meanings|This document|$)",
        text, re.DOTALL | re.IGNORECASE
    )
    if not match:
        return []
    raw = match.group(1).strip()
    # Replace newlines with spaces for consistent parsing
    raw = raw.replace('\n', ' ')
    # Holy day entries are Season/Rune/Day patterns - find all of them
    # Pattern: Word/Word/Word (with optional "Sacred Time" as Season)
    entries = re.findall(r'(?:Sacred Time|Sea|Fire|Earth|Dark|Storm)/[\w\s/]+?/\w+', raw)
    if entries:
        return [e.strip() for e in entries]
    # Fallback: split on double-space
    parts = re.split(r'\s{2,}', raw)
    return [p.strip() for p in parts if p.strip() and '/' in p]


def parse_areas(text: str) -> list:
    """Extract areas (Main Areas)."""
    match = re.search(r"Main Areas:\s*(.*?)(?:Localities|Personality|$)", text, re.DOTALL)
    if not match:
        return []
    raw = match.group(1).strip().replace('\n', ' ')
    # Try double-space splitting first
    areas = re.split(r'\s{2,}', raw)
    if len(areas) <= 1 and len(raw) > 20:
        # Known multi-word area names
        known_areas = [
            "Coastal Pamaltela", "Dragon Pass", "Holy Country",
            "Inland Pamaltela", "East Wilds", "Elder Wilds",
        ]
        temp = raw
        placeholders = {}
        for i, name in enumerate(sorted(known_areas, key=len, reverse=True)):
            if name in temp:
                ph = f"__A{i}__"
                placeholders[ph] = name
                temp = temp.replace(name, ph)
        parts = temp.split()
        areas = []
        for part in parts:
            if part in placeholders:
                areas.append(placeholders[part])
            else:
                areas.append(part)
    return [a.strip() for a in areas if a.strip()]


def parse_spirit_societies(text: str) -> list:
    """Extract spirit societies."""
    match = re.search(r"Spirit Societies\n(.*?)(?:Can converse|Rune Meanings|This document|$)", text, re.DOTALL)
    if not match:
        return []
    raw = match.group(1).strip()
    if not raw or raw.startswith("Rune") or raw.startswith("This"):
        return []
    societies = [s.strip() for s in re.split(r",\s*", raw)]
    return [s for s in societies if s and len(s) > 2]


def parse_list_field(text: str, prefix: str) -> list:
    """Extract a list field like 'Enemy Cults: A  B  C'."""
    match = re.search(re.escape(prefix) + r"[:\s]*(.*?)$", text, re.MULTILINE | re.IGNORECASE)
    if not match:
        return []
    raw = match.group(1).strip()
    # Try double-space splitting first
    items = re.split(r'\s{2,}', raw)
    if len(items) <= 1 and len(raw) > 20:
        # Fallback: these are known multi-word names - split carefully
        # Known cult/deity names that contain spaces
        known_multiword = [
            "Argan Argar", "Babeester Gor", "Chalana Arroy", "Maran Gor",
            "Storm Bull", "Zorak Zoran", "Seven Mothers", "Crimson Bat",
            "Primal Chaos", "Lhankhor Mhy", "Lhankor Mhy", "Kyger Litor",
            "Xiola Umbar", "Ana Gor", "Ty Kora Tek", "Grain Goddesses",
            "Hykim & Mikyh", "Ygg of Threestep", "3 Bean Circus",
            "In Essence All Chaos Cults", "Horned Man Spirit Society",
            "Dark Eater", "Hearth Mother", "Hungry Ghosts", "Zola Fel",
            "Sun Dragon", "Black Sun", "Bloody Tusk", "Gerak Kag",
            "Mee Vorala", "Tokaz Varaz", "East Isles",
        ]
        # Replace known multi-word names with placeholders
        placeholders = {}
        temp = raw
        for i, name in enumerate(sorted(known_multiword, key=len, reverse=True)):
            if name in temp:
                ph = f"__PH{i}__"
                placeholders[ph] = name
                temp = temp.replace(name, ph)
        # Now split on spaces
        parts = temp.split()
        # Restore placeholders
        items = []
        for part in parts:
            if part in placeholders:
                items.append(placeholders[part])
            else:
                items.append(part)
    return [i.strip() for i in items if i.strip()]


def parse_cult(pdf_path: Path) -> dict:
    """Parse a cult one-pager PDF into clean structured JSON."""
    text = extract_text(pdf_path)
    pantheon = pdf_path.parent.name
    name = pdf_path.stem

    # Extract cult title (first line is usually the name)
    first_line = text.split('\n')[0].strip()
    # The first line often has rune chars prepended (e.g., "tyt Humakt")
    # Extract the actual name after rune prefix
    name_match = re.match(r'^[a-z,\.;:&\s]+([A-Z].*)', first_line)
    if name_match:
        display_name = name_match.group(1).strip()
    else:
        display_name = name

    # Extract subtitle/description
    subtitle = ""
    lines = text.split('\n')
    for line in lines[1:5]:
        line = line.strip()
        # Skip rune chars, version info, format markers
        if re.match(r'^(\d{4}\s+version|AIG|[a-z]+$)', line):
            continue
        if line and len(line) > 5 and line[0].isupper():
            subtitle = line
            break

    cult = {
        "name": display_name if display_name else name,
        "pantheon": pantheon,
        "source": f"CultOnePagers2019/{pantheon}/{pdf_path.name}",
        "sourceVersion": "2019 edition v5.2",
        "subtitle": subtitle,
        "runes": [],
        "requirements": {"initiate": "", "runelord": ""},
        "cultSkills": [],
        "folkMagic": [],
        "miracles": {
            "initiate": [],
            "associate": [],
            "runelord": [],
        },
        "personalityTraits": [],
        "enemyCults": [],
        "hostileCults": [],
        "friendlyCults": [],
        "associatedCults": [],
        "areas": [],
        "holyDays": [],
        "spiritSocieties": [],
        "oppositeRune": "",
    }

    # Requirements
    init_match = re.search(
        r"Initiate\s+needs?\s+to\s+(.*?)(?:Rune levels|Bold skills|$)",
        text, re.DOTALL | re.IGNORECASE
    )
    if init_match:
        req = init_match.group(1).strip().replace('\n', ' ')
        cult["requirements"]["initiate"] = "to " + req[:300]

    rune_match = re.search(
        r"Rune levels?\s+need\s+to\s+(.*?)(?:Bold skills|Cult Skills|$)",
        text, re.DOTALL | re.IGNORECASE
    )
    if rune_match:
        req = rune_match.group(1).strip().replace('\n', ' ')
        cult["requirements"]["runelord"] = "to " + req[:300]

    # Cult Skills
    cult["cultSkills"] = parse_cult_skills(text)

    # Folk Magic
    cult["folkMagic"] = parse_folk_magic(text)

    # Miracles
    cult["miracles"]["initiate"] = parse_miracles(text)
    cult["miracles"]["associate"] = parse_associate_miracles(text)
    cult["miracles"]["runelord"] = parse_runelord_miracles(text)

    # Personality Traits
    cult["personalityTraits"] = parse_personality_traits(text)

    # Cult relationships
    cult["enemyCults"] = parse_list_field(text, "Enemy Cults")
    cult["hostileCults"] = parse_list_field(text, "Hostile Cults")
    cult["friendlyCults"] = parse_list_field(text, "Friendly Cults")
    cult["associatedCults"] = parse_list_field(text, "Associated Cults")

    # Areas
    cult["areas"] = parse_areas(text)

    # Holy Days
    cult["holyDays"] = parse_holy_days(text)

    # Spirit Societies
    cult["spiritSocieties"] = parse_spirit_societies(text)

    # Opposite Rune
    opp = re.search(r"Opposite[:\s]*([A-Z]\w+)", text)
    if opp:
        cult["oppositeRune"] = opp.group(1).strip()

    # Pantheons (some cults belong to multiple)
    pantheon_match = re.search(r"Pantheons\n(.*?)(?:Source|$)", text, re.DOTALL)
    if pantheon_match:
        pantheons = [p.strip() for p in pantheon_match.group(1).strip().split('\n') if p.strip()]
        if pantheons:
            cult["pantheon"] = pantheons[0]  # Primary
            if len(pantheons) > 1:
                cult["additionalPantheons"] = pantheons[1:]

    return cult


def write_cult(cult: dict, dry_run: bool = False) -> Path:
    """Write a cult dict to its JSON file."""
    pantheon_dir = cult["pantheon"].lower().replace(" - ", "-").replace(" ", "-")
    out_dir = OUTPUT / pantheon_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    filename = cult["name"].lower().replace(" ", "-").replace("&", "and").replace("'", "")
    # Remove special chars
    filename = re.sub(r'[^a-z0-9\-]', '', filename)
    out_file = out_dir / f"{filename}.json"

    if not dry_run:
        with open(out_file, "w") as f:
            json.dump(cult, f, indent=2, ensure_ascii=False)
    return out_file


def main():
    dry_run = "--dry-run" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]

    if args:
        # Process specific file(s)
        paths = []
        for arg in args:
            p = Path(arg)
            if not p.is_absolute():
                p = UPSTREAM / arg
            if p.is_dir():
                paths.extend(sorted(p.glob("*.pdf")))
            elif p.exists():
                paths.append(p)
            else:
                print(f"Not found: {arg}", file=sys.stderr)
    else:
        # Process ALL cult PDFs
        paths = sorted(UPSTREAM.rglob("*.pdf"))

    results = []
    errors = []
    for pdf_path in paths:
        # Skip non-cult PDFs
        if any(skip.lower() in pdf_path.name.lower() for skip in SKIP_PATTERNS):
            continue

        try:
            cult = parse_cult(pdf_path)
            out_file = write_cult(cult, dry_run=dry_run)
            results.append(cult)
            status = "[DRY]" if dry_run else "  OK "
            print(f"{status} {cult['pantheon']}/{cult['name']}")
            if cult["personalityTraits"]:
                print(f"       traits: {cult['personalityTraits'][:5]}")
        except Exception as e:
            errors.append((pdf_path, str(e)))
            print(f" FAIL {pdf_path.name}: {e}", file=sys.stderr)

    # Write consolidated cults.json
    if results and not dry_run:
        consolidated = OUTPUT / "cults.json"
        with open(consolidated, "w") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\n{'='*60}")
        print(f"Processed: {len(results)} cults")
        print(f"Errors: {len(errors)}")
        print(f"Output: {consolidated}")
    elif dry_run:
        print(f"\n[DRY RUN] Would process {len(results)} cults, {len(errors)} errors")

    if errors:
        print("\nFailed PDFs:")
        for path, err in errors:
            print(f"  {path.name}: {err}")

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
