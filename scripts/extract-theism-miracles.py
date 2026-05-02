#!/usr/bin/env python3
"""Extract theist miracles from individual cult one-pager PDFs.

Each cult has its own PDF with a clear "Theist Miracles" section.
Much more reliable than parsing the Spell Catalogue table layout.

Run: cd /home/node/.openclaw/devbox-env && devbox run -- uv run python3 \
     /home/node/.openclaw/workspace/projects/mythras-chargen/scripts/extract-theism-miracles.py
"""
import json
import re
import sys
from pathlib import Path

from pdfminer.high_level import extract_text

PROJECT = Path("/home/node/.openclaw/workspace/projects/mythras-chargen")
CULTS_RAW = PROJECT / "references/cults-raw"
CULTS_UPSTREAM = PROJECT / "references/cults-upstream"

# Rune prefix codes found in the spell catalogues and one-pagers
RUNE_MAP = {
    "y": "Fire/Sky", ".y": "Fire/Sky", "p": "Fire/Sky", ".p": "Fire/Sky",
    "4g": "Air", "g": "Air", "Rce": "Air", "ce": "Air", "gs": "Air", "cg": "Air",
    "gw": "Water", "w": "Water", "sw": "Water", "ow": "Water", "go": "Water",
    "e": "Earth", "ex": "Earth", "xe": "Earth", ".e": "Earth", "et": "Earth",
    "t": "Death", "ot": "Death", "dt": "Death", "Xt": "Death",
    "B": "Beast", "Bb": "Beast", "Rb": "Beast", "Bg": "Beast", "be": "Beast",
    "l": "Harmony", "lx": "Harmony", "hl": "Harmony", "Wl": "Harmony",
    "s": "Movement", "st": "Movement",
    "m": "Moon", "lm": "Moon",
    "d": "Darkness", "dk": "Darkness", "o": "Darkness",
    "i": "Illusion", "ij": "Illusion", "hi": "Illusion",
    "f": "Fertility",
    "ch": "Mastery", "j": "Disorder",
    "ay": "Magic", "RS": "Magic",
}

COMMON_SPELLS = {
    "Excommunication", "Extension", "Find (Specific Thing)", "Mindlink",
    "Sanctify", "Summon Spirit of Reprisal", "Divination", "Chastise",
}


def load_canonical_cults():
    with open(CULTS_RAW / "cults.json") as f:
        data = json.load(f)
    return data


def find_cult_pdf(cult_name, pantheon):
    """Find the individual cult PDF in cults-upstream/."""
    pantheon_dir = CULTS_UPSTREAM / pantheon
    if not pantheon_dir.exists():
        return None
    
    # Try exact name match
    pdf = pantheon_dir / f"{cult_name}.pdf"
    if pdf.exists():
        return pdf
    
    # Try case-insensitive or partial match
    for f in pantheon_dir.iterdir():
        if f.suffix.lower() == '.pdf' and cult_name.lower() in f.stem.lower():
            # Avoid matching catalogue/relationship files
            if 'Catalogue' not in f.stem and 'Relationship' not in f.stem and 'Personality' not in f.stem:
                return f
    
    return None


def parse_miracle_line(text):
    """Parse a single miracle entry, extracting rune prefix if present."""
    text = text.strip()
    if not text or len(text) < 3:
        return None
    
    # Remove trailing (s) markers for subservient
    is_subservient = '(s)' in text
    text = text.replace('(s)', '').strip()
    
    # Check for associated: "CultName(a):prefix SpellName"
    assoc_match = re.match(r'([\w\s]+?)\(a\):?(\w{0,4})?\s*(.+)', text)
    if assoc_match:
        from_cult = assoc_match.group(1).strip()
        prefix = assoc_match.group(2) or ""
        spell_name = assoc_match.group(3).strip()
        rune = "Any"
        if prefix and prefix in RUNE_MAP:
            rune = RUNE_MAP[prefix]
        return {"name": spell_name, "runes": [rune], "source": "associated", "from_cult": from_cult}
    
    # Check for rune prefix
    prefix_match = re.match(r'([.A-Za-z0-9]{1,5})\s+([A-Z].{2,})', text)
    if prefix_match:
        prefix = prefix_match.group(1)
        spell_name = prefix_match.group(2).strip()
        if prefix in RUNE_MAP:
            source = "subservient" if is_subservient else "normal"
            return {"name": spell_name, "runes": [RUNE_MAP[prefix]], "source": source}
        elif not prefix[0].isupper():
            source = "subservient" if is_subservient else "normal"
            return {"name": spell_name, "runes": ["UNVERIFIED"], "source": source}
    
    # No prefix
    if text in COMMON_SPELLS:
        return {"name": text, "runes": ["Any"], "source": "common"}
    
    source = "subservient" if is_subservient else "normal"
    return {"name": text, "runes": ["UNVERIFIED"], "source": source}


def extract_miracles_from_pdf(pdf_path):
    """Extract the Theist Miracles section from a cult one-pager PDF."""
    text = extract_text(str(pdf_path))
    
    # Find "Theist Miracles" section
    # Pattern: "Theist Miracles" followed by rank info and spell list
    miracles_match = re.search(
        r'Theist Miracles\s*[-–—]?\s*(.*?)(?:Pantheon|Source|Areas|Personality|Holy Days|Opposing|Spirit Societ)',
        text, re.DOTALL | re.IGNORECASE
    )
    
    if not miracles_match:
        # Try alternate header
        miracles_match = re.search(
            r'(?:Initiate|Runelord):\s*Return to holy place.*?(?=Pantheon|Source|Areas|$)',
            text, re.DOTALL
        )
    
    if not miracles_match:
        return None
    
    section = miracles_match.group(0) if miracles_match else ""
    
    # Split into initiate and runelord sections
    initiate_miracles = []
    runelord_miracles = []
    
    # Find initiate section
    init_match = re.search(r'Initiate[:\s].*?(?:Return|sacrifice).*?\n(.*?)(?:Runelord|Rune\s*lord|$)', section, re.DOTALL | re.IGNORECASE)
    if init_match:
        init_text = init_match.group(1)
        # Split on commas, handling multiline
        init_text = re.sub(r'\n\s*', ' ', init_text)
        parts = re.split(r',\s*', init_text)
        for part in parts:
            m = parse_miracle_line(part)
            if m:
                m["rank"] = "initiate"
                initiate_miracles.append(m)
    
    # Find runelord section
    rl_match = re.search(r'Runelord[:\s].*?(?:Return|sacrifice).*?\n(.*?)(?:Pantheon|Source|Areas|$)', section, re.DOTALL | re.IGNORECASE)
    if rl_match:
        rl_text = rl_match.group(1)
        rl_text = re.sub(r'\n\s*', ' ', rl_text)
        parts = re.split(r',\s*', rl_text)
        for part in parts:
            m = parse_miracle_line(part)
            if m:
                m["rank"] = "runelord"
                runelord_miracles.append(m)
    
    return initiate_miracles + runelord_miracles


def main():
    cults_data = load_canonical_cults()
    all_cults = {}
    no_pdf = []
    no_miracles = []
    verification_needed = []
    
    for cult in cults_data:
        name = cult["name"]
        pantheon = cult["pantheon"]
        
        pdf = find_cult_pdf(name, pantheon)
        if not pdf:
            no_pdf.append(f"{name} ({pantheon})")
            continue
        
        miracles = extract_miracles_from_pdf(pdf)
        if miracles is None:
            no_miracles.append(f"{name} ({pantheon})")
            continue
        
        if not miracles:
            no_miracles.append(f"{name} ({pantheon}) [empty parse]")
            continue
        
        unverified = sum(1 for m in miracles if "UNVERIFIED" in m["runes"])
        if unverified > 0:
            verification_needed.append(f"{name}: {unverified} unverified")
        
        all_cults[name] = {
            "pantheon": pantheon,
            "pdf_source": pdf.name,
            "miracles": miracles,
        }
    
    print(f"Total cults processed: {len(cults_data)}")
    print(f"Extracted miracles: {len(all_cults)}")
    print(f"No PDF found: {len(no_pdf)}")
    print(f"No miracles section: {len(no_miracles)}")
    print(f"Verification needed: {len(verification_needed)}")
    
    if no_pdf:
        print(f"\nNo PDF: {', '.join(no_pdf[:10])}")
    if no_miracles:
        print(f"\nNo miracles: {', '.join(no_miracles[:10])}")
    
    output = {
        "source": "Notes from Pavis Cult One-Pagers (2019 v5.2)",
        "extracted_at": "2026-05-02",
        "extraction_method": "pdfminer.six from individual cult PDFs",
        "rune_code_legend": RUNE_MAP,
        "stats": {
            "total_canonical": len(cults_data),
            "total_extracted": len(all_cults),
            "no_pdf_found": len(no_pdf),
            "no_miracles_section": len(no_miracles),
            "verification_needed": len(verification_needed),
        },
        "cults": all_cults,
        "no_pdf_found": no_pdf,
        "no_miracles_section": no_miracles,
        "verification_needed": verification_needed,
    }
    
    out_path = PROJECT / "references/theism-miracles.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"\nWritten to {out_path}")


if __name__ == "__main__":
    main()
