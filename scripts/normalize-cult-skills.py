#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# ///
"""Normalize cultSkills arrays in reference JSONs.

Applies the same normalization rules used at runtime in index.html:
  - Strip newlines and excess whitespace
  - Fix "Lore(" → "Lore (" (missing space before parenthesis)
  - Fix "(cult)" → "(Cult)" (capitalize known specialization words)
  - Deduplicate entries
  - Remove empty strings

Usage:
    ./scripts/normalize-cult-skills.py             # Dry run (show changes)
    ./scripts/normalize-cult-skills.py --write     # Apply changes to files
    ./scripts/normalize-cult-skills.py --validate  # Check for remaining issues
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CULTS_RAW = ROOT / "references" / "cults-raw"

# Capitalize these when they appear as the specialization inside parentheses
CAPITALIZE_SPECS = {
    "cult": "Cult",
    "human": "Human",
    "earth": "Earth",
    "ancestors": "Ancestors",
    "animal": "Animal",
    "animals": "Animals",
    "herbs": "Herbs",
    "plants": "Plants",
    "plant": "Plant",
    "farming": "Farming",
    "herding": "Herding",
    "minerals": "Minerals",
    "regional": "Regional",
}

# Known skill name corrections (exact match → replacement)
EXACT_FIXES = {
    "First aid": "First Aid",
    "first aid": "First Aid",
    "Runic affinity": "Runic Affinity",
    "runic affinity": "Runic Affinity",
}


def normalize_skill_name(name: str) -> str:
    """Normalize a single skill name."""
    # Strip newlines and excess whitespace
    name = " ".join(name.split())
    
    # Exact fixes
    if name in EXACT_FIXES:
        name = EXACT_FIXES[name]
    
    # Fix missing space before parenthesis: "Lore(" → "Lore ("
    name = re.sub(r"(\w)\(", r"\1 (", name)
    
    # Capitalize known specializations: "(cult)" → "(Cult)"
    def fix_spec(m):
        spec = m.group(1)
        return f"({CAPITALIZE_SPECS.get(spec.lower(), spec)})"
    
    name = re.sub(r"\(([^)]+)\)", fix_spec, name)
    
    # Strip trailing/leading whitespace
    name = name.strip()
    
    return name


def normalize_cult_skills(skills: list) -> list:
    """Normalize a list of cult skills, deduplicating."""
    seen = set()
    result = []
    for skill in skills:
        if not isinstance(skill, str) or not skill.strip():
            continue
        normalized = normalize_skill_name(skill)
        if normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def process_file(path: Path, write: bool = False) -> list[str]:
    """Process a single reference JSON file. Returns list of changes."""
    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, UnicodeDecodeError):
        return []
    
    if not isinstance(data, dict):
        return []
    
    changes = []
    
    # Normalize cultSkills array
    if "cultSkills" in data and isinstance(data["cultSkills"], list):
        original = data["cultSkills"]
        normalized = normalize_cult_skills(original)
        
        if original != normalized:
            for i, (old, new) in enumerate(zip(original, normalized)):
                if old != new:
                    changes.append(f"  {old!r} → {new!r}")
            
            # Check for removed duplicates
            if len(normalized) < len(original):
                removed = len(original) - len(normalized)
                changes.append(f"  ({removed} duplicate(s) removed)")
            
            if write:
                data["cultSkills"] = normalized
                path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    
    return changes


def main():
    write = "--write" in sys.argv
    validate = "--validate" in sys.argv
    
    if validate:
        # Check for remaining issues
        issues = []
        for path in sorted(CULTS_RAW.rglob("*.json")):
            try:
                data = json.loads(path.read_text())
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue
            if not isinstance(data, dict) or "cultSkills" not in data:
                continue
            for skill in data["cultSkills"]:
                if not isinstance(skill, str):
                    continue
                normalized = normalize_skill_name(skill)
                if skill != normalized:
                    issues.append(f"  {path.relative_to(ROOT)}: {skill!r} → {normalized!r}")
                if "\n" in skill:
                    issues.append(f"  {path.relative_to(ROOT)}: NEWLINE in {skill!r}")
        
        if issues:
            print(f"⚠️  {len(issues)} normalization issues found:")
            for issue in issues[:20]:
                print(issue)
            if len(issues) > 20:
                print(f"  ... and {len(issues) - 20} more")
            sys.exit(1)
        else:
            print("✅ All cultSkills are normalized.")
            sys.exit(0)
    
    # Process all files
    total_changes = 0
    for path in sorted(CULTS_RAW.rglob("*.json")):
        changes = process_file(path, write=write)
        if changes:
            rel_path = path.relative_to(ROOT)
            print(f"\n{'✏️ ' if write else '📋 '}{rel_path}:")
            for change in changes:
                print(change)
            total_changes += len(changes)
    
    if total_changes == 0:
        print("✅ All reference JSONs already normalized.")
    elif write:
        print(f"\n✅ Applied {total_changes} normalization(s).")
    else:
        print(f"\n📋 {total_changes} change(s) found. Run with --write to apply.")


if __name__ == "__main__":
    main()
