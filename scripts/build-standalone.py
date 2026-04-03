#!/usr/bin/env python3
"""Build a standalone mythras-chargen HTML file with Glorantha data inlined.

Usage:
    python scripts/build-standalone.py

Output:
    dist/mythras-chargen-standalone.html
"""
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
GLORANTHA = ROOT / "data" / "glorantha.js"
DIST = ROOT / "dist"


def build():
    DIST.mkdir(exist_ok=True)

    html = INDEX.read_text(encoding="utf-8")
    glorantha = GLORANTHA.read_text(encoding="utf-8")

    # Remove external script tag
    html = html.replace('<script src="data/glorantha.js"></script>\n', '')
    html = html.replace('<script src="data/glorantha.js"></script>', '')

    # Extract culture data
    for line in glorantha.split('\n'):
        if line.startswith('const GLORANTHA_CULTURES_DATA = '):
            cultures_json = line.replace('const GLORANTHA_CULTURES_DATA = ', '').rstrip(';').strip()
            break

    # Extract homeland map (if present)
    homeland_block = '{}'
    if 'const GLORANTHA_HOMELAND_MAP' in glorantha:
        idx = glorantha.index('const GLORANTHA_HOMELAND_MAP')
        end = glorantha.index('};', idx) + 2
        homeland_block = glorantha[idx:end].replace('const GLORANTHA_HOMELAND_MAP = ', '').rstrip(';')

    # Extract suggested builds (if present)
    builds_block = '{}'
    if 'const GLORANTHA_SUGGESTED_BUILDS' in glorantha:
        idx = glorantha.index('const GLORANTHA_SUGGESTED_BUILDS')
        end = glorantha.index('\n};', idx) + 3
        builds_block = glorantha[idx:end].replace('const GLORANTHA_SUGGESTED_BUILDS = ', '').rstrip(';')

    # Replace fallback pattern with direct data
    old_pattern = 'const CULTURES_DATA = window.GLORANTHA_CULTURES_DATA || ['
    if old_pattern in html:
        start = html.index(old_pattern)
        bracket_count = 0
        i = start + len('const CULTURES_DATA = window.GLORANTHA_CULTURES_DATA || ')
        for j in range(i, len(html)):
            if html[j] == '[':
                bracket_count += 1
            elif html[j] == ']':
                bracket_count -= 1
                if bracket_count == 0:
                    end = j + 2  # include ];
                    break
        html = html.replace(html[start:end], f'const CULTURES_DATA = {cultures_json};')

    # Replace homeland and builds (if present)
    if 'window.GLORANTHA_HOMELAND_MAP || {}' in html:
        html = html.replace('window.GLORANTHA_HOMELAND_MAP || {}', homeland_block)
    if 'window.GLORANTHA_SUGGESTED_BUILDS || {}' in html:
        html = html.replace('window.GLORANTHA_SUGGESTED_BUILDS || {}', builds_block)

    # Verify
    remaining = html.count('window.GLORANTHA')
    culture_count = len(re.findall(
        r'"name":"(?:Balazaring|Esrolian|God Forgot|Lunar Heartland|Lunar Provincial|Praxian|Sartarite)',
        html
    ))

    output = DIST / "mythras-chargen-standalone.html"
    output.write_text(html, encoding="utf-8")

    print(f"✅ Built: {output}")
    print(f"   Size: {len(html):,} chars")
    print(f"   Cultures: {culture_count}")
    print(f"   Remaining window.GLORANTHA refs: {remaining}")

    if remaining > 0:
        print("⚠️  WARNING: Some window.GLORANTHA references remain!")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(build())
