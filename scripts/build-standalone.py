#!/usr/bin/env python3
"""Build a standalone mythras-chargen HTML file.

Since index.html is already self-contained (all JS + data inlined),
this script just copies it to dist/ for distribution.

Usage:
    python scripts/build-standalone.py

Output:
    dist/mythras-chargen-standalone.html
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
DIST = ROOT / "dist"


def build():
    DIST.mkdir(exist_ok=True)
    html = INDEX.read_text(encoding="utf-8")
    
    # Verify self-containment
    if '<script src=' in html:
        print("WARNING: index.html has external script references!")
        print("  Design rule: all JS must be inlined.")
        # Don't fail — just warn
    
    output = DIST / "mythras-chargen-standalone.html"
    output.write_text(html, encoding="utf-8")
    
    size_kb = len(html) // 1024
    print(f"Built {output} ({size_kb}KB)")
    print(f"Self-contained: {'<script src=' not in html}")


if __name__ == "__main__":
    build()
