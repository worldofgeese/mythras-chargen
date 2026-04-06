#!/usr/bin/env python3
"""Extract structured JSON from CultOnePagers2019 PDFs.

Usage:
    python3 scripts/extract-cults.py references/cults-upstream/Storm/Orlanth.pdf
    python3 scripts/extract-cults.py references/cults-upstream/Storm/  # all in folder
    python3 scripts/extract-cults.py --all  # all culture-relevant cults

Outputs JSON to references/cults-raw/<pantheon>/<cult-name>.json
"""
import json
import os
import re
import sys
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    print("ERROR: pypdf not installed. Run: uv pip install pypdf", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = ROOT / "references" / "cults-upstream"
OUTPUT = ROOT / "references" / "cults-raw"

# Skip pantheon summary PDFs (not individual cults)
SKIP_PATTERNS = [
    "Pantheon Cult Catalogue",
    "Pantheon Cult Relationships", 
    "Pantheon Cult Spell Catalogue",
    "Pantheon Personality Traits",
    "cover pages",
]

def extract_text(pdf_path: Path) -> str:
    """Extract all text from a PDF."""
    reader = PdfReader(str(pdf_path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)

def parse_list(text: str, prefix: str) -> list[str]:
    """Extract a comma/double-space separated list after a prefix."""
    pattern = re.escape(prefix) + r"[:\s]*(.+?)(?:\n|$)"
    m = re.search(pattern, text, re.IGNORECASE)
    if not m:
        return []
    raw = m.group(1).strip()
    # Split on double-space or comma
    items = re.split(r"\s{2,}|,\s*", raw)
    return [i.strip() for i in items if i.strip()]

def parse_cult(pdf_path: Path) -> dict:
    """Parse a cult one-pager PDF into structured JSON."""
    text = extract_text(pdf_path)
    pantheon = pdf_path.parent.name
    name = pdf_path.stem

    cult = {
        "name": name,
        "pantheon": pantheon,
        "source": f"CultOnePagers2019/{pantheon}/{pdf_path.name}",
        "sourceVersion": "2019 edition v5.2",
        "runes": [],
        "requirements": {
            "initiate": "",
            "runelord": ""
        },
        "cultSkills": [],
        "folkMagic": [],
        "miracles": [],
        "personalityTraits": [],
        "enemyCults": [],
        "hostileCults": [],
        "friendlyCults": [],
        "associatedCults": [],
        "areas": [],
        "holyDays": [],
        "spiritSocieties": [],
        "runeAssociations": {},
        "rawText": text[:500]  # First 500 chars for debugging
    }

    # Runes - extract from the rune symbols area (tricky with PDF extraction)
    # Look for "Opposing Runes" or "Opposite:" patterns
    opp = re.search(r"Opposite[:\s]*(\w+)", text)
    if opp:
        cult["oppositeRune"] = opp.group(1).strip()

    # Requirements
    init_match = re.search(r"Initiate needs?(.*?)(?:Rune levels|$)", text, re.DOTALL | re.IGNORECASE)
    if init_match:
        cult["requirements"]["initiate"] = init_match.group(1).strip()[:200]
    
    rune_match = re.search(r"Rune levels?\s*need?(.*?)(?:Cult Skills|$)", text, re.DOTALL | re.IGNORECASE)
    if rune_match:
        cult["requirements"]["runelord"] = rune_match.group(1).strip()[:200]

    # Cult Skills
    skills_match = re.search(r"Cult Skills.*?\n(.*?)(?:Folk Magic|$)", text, re.DOTALL | re.IGNORECASE)
    if skills_match:
        raw = skills_match.group(1).strip()
        cult["cultSkills"] = [s.strip() for s in re.split(r",\s*", raw) if s.strip() and len(s.strip()) > 1]

    # Folk Magic
    fm_match = re.search(r"Folk Magic for Initiates.*?\n(.*?)(?:Theist Miracles|$)", text, re.DOTALL | re.IGNORECASE)
    if fm_match:
        raw = fm_match.group(1).strip()
        # Remove (*) markers
        raw = re.sub(r"\(\*\)", "", raw)
        cult["folkMagic"] = [s.strip() for s in re.split(r",\s*", raw) if s.strip() and len(s.strip()) > 1]

    # Enemy, Hostile, Friendly, Associated cults
    cult["enemyCults"] = parse_list(text, "Enemy Cults")
    cult["hostileCults"] = parse_list(text, "Hostile Cults")
    cult["friendlyCults"] = parse_list(text, "Friendly Cults")
    cult["associatedCults"] = parse_list(text, "Associated Cults")

    # Personality Traits - extract from the traits line
    traits_match = re.search(r"Personality Traits\n(.*?)$", text, re.MULTILINE | re.IGNORECASE)
    if traits_match:
        raw = traits_match.group(1).strip()
        # Traits often have rune symbols appended - clean them
        traits = re.findall(r"[A-Z][a-z]+(?:\s[A-Z][a-z]+)?", raw)
        cult["personalityTraits"] = list(dict.fromkeys(traits))  # deduplicate

    # Areas
    areas_match = re.search(r"(?:Main Areas|Localities)[:\s]*(.*?)(?:\n|Personality|$)", text, re.IGNORECASE)
    if areas_match:
        cult["areas"] = [a.strip() for a in re.split(r"\s{2,}", areas_match.group(1)) if a.strip()]

    # Holy Days
    holy_match = re.search(r"Holy Days\n(.*?)(?:Sacrifices|Spirit|$)", text, re.DOTALL | re.IGNORECASE)
    if holy_match:
        raw = holy_match.group(1).strip()
        cult["holyDays"] = [h.strip() for h in re.split(r"\s{2,}", raw) if h.strip()]

    # Clean up rawText for smaller output
    del cult["rawText"]

    return cult


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extract-cults.py <pdf_or_dir> | --all")
        sys.exit(1)

    if sys.argv[1] == "--all":
        # Process all priority pantheons
        priority = ["Storm", "Yelm", "Lunar", "Praxian", "Darkness"]
        paths = []
        for p in priority:
            folder = UPSTREAM / p
            if folder.exists():
                paths.extend(sorted(folder.glob("*.pdf")))
    elif Path(sys.argv[1]).is_dir():
        paths = sorted(Path(sys.argv[1]).glob("*.pdf"))
    else:
        paths = [Path(sys.argv[1])]

    results = []
    for pdf_path in paths:
        # Skip summary PDFs
        if any(skip in pdf_path.stem for skip in SKIP_PATTERNS):
            continue

        try:
            cult = parse_cult(pdf_path)
            # Write individual JSON
            out_dir = OUTPUT / cult["pantheon"].lower().replace(" - ", "-").replace(" ", "-")
            out_dir.mkdir(parents=True, exist_ok=True)
            out_file = out_dir / f"{cult['name'].lower().replace(' ', '-').replace('&', 'and')}.json"
            with open(out_file, "w") as f:
                json.dump(cult, f, indent=2)
            results.append(cult)
            print(f"✓ {cult['pantheon']}/{cult['name']} -> {out_file.name}")
        except Exception as e:
            print(f"✗ {pdf_path.name}: {e}", file=sys.stderr)

    # Write consolidated file
    if results:
        consolidated = OUTPUT / "cults.json"
        with open(consolidated, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\n{len(results)} cults extracted -> {consolidated}")


if __name__ == "__main__":
    main()
