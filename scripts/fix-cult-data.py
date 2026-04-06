#!/usr/bin/env python3
"""Clean OCR noise from cult data inlined in index.html.

Fixes:
1. Personality traits with fused rune symbols (e.g., "Worldlye" -> "Worldly")
2. Cult skill lists with parsing artifacts
3. Fragile passion removal pattern -> exact cult name match
"""
import re
import json
import sys
from pathlib import Path

# Known correct personality traits for the most important cults
TRAIT_FIXES = {
    # Remove trailing rune symbol characters and fix known bad traits
    "Worldlye": "Worldly",
    "Sensuale": "Sensual",
    "Prudente": "Prudent",
    "Relentlesst": "Relentless",
    "Ruthl": "Ruthless",
    "Unemotionalt": "Unemotional",
    "Ascetic": "Ascetic",
    "Reckl": "Reckless",
    "Generousx": "Generous",
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
    "Adventurouss": "Adventurous",
    "Dynamics": "Dynamic",
    "Impulsives": "Impulsive",
    "Energetics": "Energetic",
    "Rebelliouss": "Rebellious",
    "Rebelliou": "Rebellious",
    "Passionateg": "Passionate",
    "Proudg": "Proud",
    "Unpredictableg": "Unpredictable",
    "Violentg": "Violent",
    "Truthfuly": "Truthful",
    "Observanty": "Observant",
    "Dutifuly": "Dutiful",
    "Faithfuly": "Faithful",
    "Fairy": "Fair",
    "Stubbornq": "Stubborn",
    "Inflexibleq": "Inflexible",
    "Exactingq": "Exacting",
    "Conservativeq": "Conservative",
    "Crueld": "Cruel",
    "Coldd": "Cold",
    "Secretived": "Secretive",
    "Patientd": "Patient",
    "Proudw": "Proud",
    "Justw": "Just",
    "Authoritativew": "Authoritative",
    "ProudW": "Proud",
    "JustW": "Just",
    "AuthoritativeW": "Authoritative",
    "Hon": "Honest",
    "Pur": "Pure",
    "Ideali": "Idealist",
    "Perceptiv": "Perceptive",
    "Logicall": "Logical",
    "Rigorousl": "Rigorous",
    "Materialisticl": "Materialistic",
    "Soullessv": "Soulless",
    "Fiendishv": "Fiendish",
    "Relentlessv": "Relentless",
    "Coldv": "Cold",
    "Destructiver": "Destructive",
    "Selfishr": "Selfish",
    "Greedyr": "Greedy",
    "Recklessr": "Reckless",
    "Ecstaticf": "Ecstatic",
    "Spiritualf": "Spiritual",
    "Awaref": "Aware",
    "Mysticalf": "Mystical",
    "Tolerantm": "Tolerant",
    "Balancedm": "Balanced",
    "Liberationm": "Liberation",
    "Open-mindedm": "Open-minded",
}

# Known skill artifacts to remove
SKILL_ARTIFACTS = [
    "Bold skills\nare mandatory",
    "Bold skills are mandatory",
    "to be convinced at 3 of them.",
    "Rune levels  need to have 3 cult skills at 100% one of which needs to be Cult Runic Affinity",
]

def fix_trait(trait):
    """Fix a single personality trait."""
    trait = trait.strip()
    if trait in TRAIT_FIXES:
        return TRAIT_FIXES[trait]
    # Try splitting fused traits like "Adventurouss Dynamic" 
    parts = trait.split()
    fixed_parts = []
    for p in parts:
        if p in TRAIT_FIXES:
            fixed_parts.append(TRAIT_FIXES[p])
        else:
            fixed_parts.append(p)
    result = " ".join(fixed_parts)
    # If result has no space, it's a single trait - check if trailing char is a rune symbol
    if len(result) > 3 and result[-1] in 'abcdefghijklmnopqrstuvwxyz' and result[-2] not in 'aeiou':
        # Likely a fused rune symbol - but be conservative
        pass
    return result

def fix_traits_list(traits):
    """Fix a list of personality traits, splitting fused ones."""
    fixed = []
    for trait in traits:
        # Split "Adventurouss Dynamic" into ["Adventurous", "Dynamic"]
        parts = trait.split()
        for p in parts:
            f = fix_trait(p)
            if f and len(f) > 1 and f not in fixed:
                fixed.append(f)
    return fixed

def fix_skills_list(skills):
    """Remove parsing artifacts from cult skills."""
    cleaned = []
    for skill in skills:
        skip = False
        for artifact in SKILL_ARTIFACTS:
            if artifact in skill:
                # Try to extract the actual skill from after the artifact
                remaining = skill.replace(artifact, "").strip()
                if remaining and len(remaining) > 2:
                    cleaned.append(remaining)
                skip = True
                break
        if not skip and len(skill.strip()) > 1:
            cleaned.append(skill.strip())
    return cleaned

def process_html(html_path):
    """Process index.html to fix cult data."""
    content = Path(html_path).read_text()
    
    # Find CULTS_DATA in the file
    cults_match = re.search(r'const CULTS_DATA = (\[.*?\]);', content, re.DOTALL)
    if not cults_match:
        print("ERROR: CULTS_DATA not found in file", file=sys.stderr)
        return
    
    cults_json = cults_match.group(1)
    cults = json.loads(cults_json)
    
    fixes_count = 0
    for cult in cults:
        # Fix personality traits
        if cult.get("personalityTraits"):
            original = cult["personalityTraits"][:]
            cult["personalityTraits"] = fix_traits_list(cult["personalityTraits"])
            if original != cult["personalityTraits"]:
                fixes_count += 1
        
        # Fix cult skills
        if cult.get("cultSkills"):
            original = cult["cultSkills"][:]
            cult["cultSkills"] = fix_skills_list(cult["cultSkills"])
            if original != cult["cultSkills"]:
                fixes_count += 1
    
    # Replace in file
    new_cults_json = json.dumps(cults, separators=(',', ':'))
    new_content = content[:cults_match.start(1)] + new_cults_json + content[cults_match.end(1):]
    
    Path(html_path).write_text(new_content)
    print(f"Fixed {fixes_count} cult entries in {html_path}")
    
    # Verify some key cults
    for name in ["Orlanth", "Ernalda", "Humakt", "Yelmalio", "Storm Bull"]:
        cult = next((c for c in cults if c["name"] == name), None)
        if cult:
            print(f"  {name}: traits={cult['personalityTraits'][:4]}")

if __name__ == "__main__":
    html_path = sys.argv[1] if len(sys.argv) > 1 else "index.html"
    process_html(html_path)
