#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["pdfplumber"]
# requires-python = ">=3.11"
# ///
"""Build the rune glyph mapping table by scanning all cult PDFs.

Enumerates every character rendered in GloranthaCoreRunes font across all
cult one-pager PDFs, producing references/rune-glyph-map.json.

Usage:
    ./scripts/build-rune-map.py              # Scan and rebuild mapping
    ./scripts/build-rune-map.py --show       # Just print current glyphs found
"""

import json
import sys
from collections import Counter
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = ROOT / "references" / "cults-upstream"
OUTPUT = ROOT / "references" / "rune-glyph-map.json"

SKIP_PATTERNS = [
    "Pantheon Cult Catalogue",
    "Pantheon Cult Relationships",
    "Pantheon Cult Spell Catalogue",
    "Pantheon Personality Traits",
]


def scan_rune_glyphs() -> tuple[Counter, dict[str, tuple[str, str]]]:
    """Scan all cult PDFs and collect GloranthaCoreRunes characters.

    Returns:
        (char_counts, char_contexts) where contexts maps char → (cult_name, surrounding_text)
    """
    rune_chars: Counter = Counter()
    rune_contexts: dict[str, tuple[str, str]] = {}
    total_pdfs = 0

    for pantheon_dir in sorted(UPSTREAM.iterdir()):
        if not pantheon_dir.is_dir():
            continue
        for pdf_file in sorted(pantheon_dir.glob("*.pdf")):
            if any(skip in pdf_file.name for skip in SKIP_PATTERNS):
                continue

            total_pdfs += 1
            try:
                with pdfplumber.open(str(pdf_file)) as pdf:
                    for page in pdf.pages:
                        chars = page.chars
                        for i, c in enumerate(chars):
                            if "GloranthaCoreRunes" in (c.get("fontname") or ""):
                                char_text = c["text"]
                                rune_chars[char_text] += 1

                                if char_text not in rune_contexts:
                                    context_chars = []
                                    for j in range(i + 1, min(i + 30, len(chars))):
                                        if "GloranthaCoreRunes" not in (chars[j].get("fontname") or ""):
                                            context_chars.append(chars[j]["text"])
                                        else:
                                            break
                                        if len(context_chars) > 15:
                                            break
                                    rune_contexts[char_text] = (
                                        pdf_file.stem,
                                        "".join(context_chars[:15]),
                                    )
            except Exception as e:
                print(f"Error: {pdf_file.name}: {e}", file=sys.stderr)

    print(f"Scanned {total_pdfs} PDFs")
    return rune_chars, rune_contexts


def main():
    show_only = "--show" in sys.argv

    rune_chars, rune_contexts = scan_rune_glyphs()

    print(f"\nFound {len(rune_chars)} unique rune glyph characters:")
    print(f"{'Char':<10} {'Count':<8} {'Context (first occurrence)'}")
    print("-" * 70)
    for char, count in rune_chars.most_common():
        ctx = rune_contexts.get(char, ("?", "?"))
        print(f"'{char}'      {count:<8} {ctx[0]}: {ctx[1]}")

    if show_only:
        return

    # Load existing map if present, to preserve manual annotations
    existing = {}
    if OUTPUT.exists():
        existing = json.loads(OUTPUT.read_text())

    # Update counts in existing glyphs
    glyphs = existing.get("glyphs", {})
    for char, count in rune_chars.items():
        if char in glyphs:
            glyphs[char]["count"] = count
        else:
            # New unmapped glyph
            ctx = rune_contexts.get(char, ("?", "?"))
            glyphs[char] = {
                "rune": f"UNMAPPED (context: {ctx[0]}: {ctx[1]})",
                "count": count,
            }
            print(f"\n⚠️  NEW UNMAPPED GLYPH: '{char}' (count: {count}, context: {ctx[0]}: {ctx[1]})")

    existing["glyphs"] = glyphs
    existing.setdefault("_meta", {})["last_scan"] = f"{len(rune_chars)} unique glyphs"

    OUTPUT.write_text(json.dumps(existing, indent=2) + "\n")
    print(f"\nWritten to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
