#!/usr/bin/env python3
"""
Extract Theist Miracle data from Cult Spell Catalogue PDFs.

Parses the 5 main pantheon catalogues (Storm, Darkness, Lunar, Praxian, Yelm)
and extracts miracle lists with rune prefix codes.

Output: references/theism-miracles.json
"""

import subprocess
import json
import re
from pathlib import Path

# Rune prefix code mappings (from observation + ADR-002)
RUNE_MAP = {
    '.y': ['Fire/Sky'],
    'y': ['Fire/Sky'],
    'Rce': ['Air'],
    'g': ['Air'],
    'gs': ['Air'],
    'gw': ['Air'],
    'go': ['Air'],
    'gj': ['Air'],
    'cg': ['Air'],
    '.g': ['Air'],
    '4g': ['Air'],
    '.4g': ['Air'],
    'Wo': ['Air'],
    'Wego': ['Air'],
    '.Wegow': ['Air'],
    'w': ['Water'],
    'gw': ['Water', 'Air'],  # compound
    'sw': ['Water'],
    'ow': ['Water'],
    'e': ['Earth'],
    'ex': ['Earth'],
    'el': ['Earth'],
    'ei': ['Earth'],
    'et': ['Earth'],
    'ej': ['Earth'],
    'etj': ['Earth'],
    'be': ['Earth'],
    'xel': ['Earth'],
    't': ['Death'],
    'ct': ['Death'],
    'jt': ['Death'],
    'Xt': ['Death'],
    'etX': ['Earth', 'Death'],
    'o': ['Darkness'],
    'ol': ['Darkness'],
    'oBX': ['Darkness'],
    'Bo': ['Beast'],
    'B': ['Beast'],
    'Bg': ['Beast'],
    'Bl': ['Beast'],
    '?B': ['Beast'],
    '.4Bego': ['Beast'],
    'b': ['Spirit'],
    'Bb': ['Beast'],  # could be Spirit, needs context
    'Rb': ['Spirit'],
    'RS': ['Magic'],
    'RW': ['Magic'],
    'h': ['Stasis'],
    'hl': ['Illusion', 'Movement'],
    'ch': ['Stasis'],
    'hs': ['Stasis'],
    'Rh': ['Magic', 'Stasis'],
    'l': ['Harmony'],
    'lx': ['Harmony'],
    'bl': ['Harmony'],
    'lp': ['Harmony'],
    'px': ['Fertility'],
    'x': ['Fertility'],
    'bx': ['Fertility'],
    'ay': ['Truth'],
    '.gy': ['Air', 'Fire/Sky'],
    'cy': ['Truth'],
    'i': ['Illusion'],
    'ij': ['Illusion'],
    'hi': ['Illusion'],
    'is': ['Illusion'],
    'ji': ['Illusion'],
    'j': ['Disorder'],
    'jt': ['Disorder', 'Death'],
    'jo': ['Disorder'],
    'hj': ['Disorder'],
    '.j': ['Disorder'],
    '?j': ['Disorder'],
    'xj': ['Fertility', 'Disorder'],
    's': ['Movement'],
    'W': ['Moon'],
    'K': ['Stasis'],
    'Ke': ['Stasis', 'Earth'],
    'xeK': ['Fertility', 'Earth', 'Stasis'],
    'c': ['Stasis'],
    'Qo': ['Darkness'],
    'oc': ['Darkness'],
    'oe': ['Darkness', 'Earth'],
    'os': ['Darkness'],
    'oB': ['Darkness', 'Beast'],
    'ls': ['Harmony', 'Movement'],
    'ce': ['Air'],
    'a': ['Beast'],  # varies by context
    'p': ['Fertility'],
    'sg': ['Movement', 'Air'],
    'Wsg': ['Moon', 'Movement', 'Air'],
}

PANTHEONS = ['Storm', 'Darkness', 'Lunar', 'Praxian', 'Yelm']
BASE_DIR = Path('/home/node/.openclaw/workspace/projects/mythras-chargen')

def extract_pdf_text(pdf_path):
    """Extract text from PDF using pdftotext."""
    result = subprocess.run(
        ['pdftotext', str(pdf_path), '-'],
        capture_output=True,
        text=True,
        check=True
    )
    return result.stdout

def parse_catalogue(text, pantheon):
    """Parse a Cult Spell Catalogue text into structured miracle data."""
    cults = {}

    # Split by cult entries (each starts with cult name as bold/header)
    # The format is: CultName \n Description \n RuneCodes \n Pantheon \n FolkMagic \n Miracles

    # Find all cult blocks - they start with a cult name followed by description
    # and end before the next cult or footer
    lines = text.split('\n')

    current_cult = None
    current_section = None
    miracle_buffer = []

    for i, line in enumerate(lines):
        line = line.strip()

        # Skip empty lines and footer
        if not line or 'This document uses trademarks' in line or 'Chaosium' in line or 'Mythras' in line:
            continue

        # Detect cult name headers (followed by description on next line)
        # Cult names are typically title case and followed by a description
        if i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            # Check if this looks like a cult header (title case, short, followed by description)
            if (len(line.split()) <= 3 and
                line[0].isupper() and
                next_line and
                not next_line[0].isdigit() and
                'Excommunication' not in line):

                # Save previous cult's miracles
                if current_cult and miracle_buffer:
                    miracles = parse_miracle_text(' '.join(miracle_buffer))
                    cults[current_cult]['miracles'] = miracles
                    miracle_buffer = []

                current_cult = line
                cults[current_cult] = {'miracles': [], 'pantheon': pantheon}
                current_section = 'header'
                continue

        # Detect miracle section (starts with "Excommunication")
        if 'Excommunication' in line and current_cult:
            current_section = 'miracles'
            miracle_buffer.append(line)
            # Capture continuation lines
            for j in range(i + 1, len(lines)):
                next_line = lines[j].strip()
                if not next_line or 'This document' in next_line:
                    break
                # Stop if we hit next cult (title case short line)
                if (len(next_line.split()) <= 3 and
                    next_line[0].isupper() and
                    j + 1 < len(lines) and
                    lines[j + 1].strip() and
                    'Excommunication' not in next_line):
                    break
                miracle_buffer.append(next_line)
            break  # Process accumulated buffer at cult end

    # Process final cult
    if current_cult and miracle_buffer:
        miracles = parse_miracle_text(' '.join(miracle_buffer))
        cults[current_cult]['miracles'] = miracles

    return cults

def parse_miracle_text(text):
    """Parse miracle text into structured list with rune tags."""
    miracles = []

    # Remove common theist spells prefix
    text = text.replace('Excommunication, Extension, Find (Specific Thing), Mindlink, Sanctify, Summon Spirit of Reprisal, Divination, Chastise, ', '')

    # Split by comma, but be careful with parens
    parts = re.split(r',\s*(?![^()]*\))', text)

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Extract rune prefix and spell name
        # Pattern: optional rune code + space + spell name
        match = re.match(r'^([a-zA-Z.?0-9]+)\s+(.+)$', part)

        if match:
            rune_code = match.group(1)
            spell_name = match.group(2)

            # Handle associated cult notation: CultName(a):runeCode SpellName
            if '(' in spell_name and ':' in spell_name:
                # Associated cult spell
                assoc_match = re.match(r'(.+?)\((?:a|s)\):([a-zA-Z.?0-9]+)\s+(.+)', spell_name)
                if assoc_match:
                    assoc_cult = assoc_match.group(1)
                    rune_code = assoc_match.group(2)
                    spell_name = assoc_match.group(3)
                    spell_name = f"{spell_name} (via {assoc_cult})"

            # Map rune code to rune names
            runes = RUNE_MAP.get(rune_code, ['UNVERIFIED'])

            # Clean spell name
            spell_name = spell_name.replace('(s)', '').strip()

            miracles.append({
                'name': spell_name,
                'runes': runes,
                'runeCode': rune_code,
                'rank': 'initiate'  # Default; runelord spells are harder to detect
            })
        else:
            # No rune prefix detected - common spell
            if part not in ['Excommunication', 'Extension', 'Find (Specific Thing)',
                           'Mindlink', 'Sanctify', 'Summon Spirit of Reprisal',
                           'Divination', 'Chastise']:
                miracles.append({
                    'name': part,
                    'runes': ['UNVERIFIED'],
                    'runeCode': 'UNKNOWN',
                    'rank': 'initiate'
                })

    return miracles

def main():
    all_cults = {}

    for pantheon in PANTHEONS:
        catalogue_path = BASE_DIR / 'references' / 'cults-upstream' / pantheon / f'{pantheon} Pantheon Cult Spell Catalogue.pdf'

        if not catalogue_path.exists():
            print(f"Warning: {catalogue_path} not found")
            continue

        print(f"Processing {pantheon}...")
        text = extract_pdf_text(catalogue_path)
        cults = parse_catalogue(text, pantheon)

        print(f"  Found {len(cults)} cults")
        all_cults.update(cults)

    # Write output
    output = {
        'source': 'Notes from Pavis Cult Spell Catalogues (2019 v5.2)',
        'extracted_at': '2026-05-02',
        'extraction_method': 'pdftotext + Python parsing',
        'note': 'Rune codes marked UNVERIFIED require manual verification. OCR on rune prefixes is error-prone.',
        'cults': all_cults
    }

    output_path = BASE_DIR / 'references' / 'theism-miracles.json'
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nWrote {len(all_cults)} cults to {output_path}")

    # Summary stats
    total_miracles = sum(len(c['miracles']) for c in all_cults.values())
    unverified = sum(1 for c in all_cults.values() for m in c['miracles'] if 'UNVERIFIED' in m['runes'])

    print(f"Total miracles: {total_miracles}")
    print(f"Unverified runes: {unverified} ({unverified*100//total_miracles if total_miracles else 0}%)")

if __name__ == '__main__':
    main()
