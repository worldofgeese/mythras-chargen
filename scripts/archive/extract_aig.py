#!/usr/bin/env python3
"""
Extract reference data from Adventures in Glorantha PDF.
Creates attestable JSON files with page citations.
"""
import json
import re
import subprocess
from datetime import date

AIG_PDF = "/tmp/adventures_in_glorantha.pdf"

def extract_pdf_text(pdf_path, first_page, last_page, layout=False):
    """Extract text from PDF pages using pdftotext."""
    cmd = ["pdftotext"]
    if layout:
        cmd.append("-layout")
    cmd.extend(["-f", str(first_page), "-l", str(last_page), pdf_path, "-"])
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout

def extract_creation_summary():
    """Extract the character creation process from p.23-25."""
    print("Extracting creation summary from p.23-25...")
    text = extract_pdf_text(AIG_PDF, 23, 25, layout=False)

    # Save raw text for manual review
    with open("/tmp/aig-creation-summary.txt", "w") as f:
        f.write(text)

    # Create a structured summary based on the text
    # This needs manual curation to ensure accuracy
    creation_data = {
        "source": "Adventures in Glorantha (GenCon 2015 Preview)",
        "extracted_at": str(date.today()),
        "page": "p.23-25",
        "note": "12-step character creation process for AiG",
        "steps": "See raw extraction in /tmp/aig-creation-summary.txt for manual curation"
    }

    with open("references/aig-raw/creation-summary-aig.json", "w") as f:
        json.dump(creation_data, f, indent=2)
    print("✓ Created creation-summary-aig.json (needs manual review)")

def extract_cultures():
    """Extract cultures from p.26-47."""
    print("Extracting cultures from p.26-47...")
    text = extract_pdf_text(AIG_PDF, 26, 47, layout=False)

    with open("/tmp/aig-cultures.txt", "w") as f:
        f.write(text)

    cultures_data = {
        "source": "Adventures in Glorantha (GenCon 2015 Preview)",
        "extracted_at": str(date.today()),
        "page": "p.26-47",
        "note": "8 cultures for Dragon Pass and Prax. Manual extraction required due to complex formatting.",
        "cultures": "See raw extraction in /tmp/aig-cultures.txt for manual curation"
    }

    with open("references/aig-raw/cultures.json", "w") as f:
        json.dump(cultures_data, f, indent=2)
    print("✓ Created cultures.json (needs manual review)")

def extract_equipment():
    """Extract equipment from p.48-58."""
    print("Extracting equipment from p.48-58...")
    text = extract_pdf_text(AIG_PDF, 48, 58, layout=True)

    with open("/tmp/aig-equipment.txt", "w") as f:
        f.write(text)

    print("✓ Saved equipment text to /tmp/aig-equipment.txt")

def extract_folk_magic():
    """Extract folk magic from p.63-68."""
    print("Extracting folk magic from p.63-68...")
    text = extract_pdf_text(AIG_PDF, 63, 68, layout=False)

    with open("/tmp/aig-folk-magic.txt", "w") as f:
        f.write(text)

    print("✓ Saved folk magic text to /tmp/aig-folk-magic.txt")

def extract_rune_magic():
    """Extract rune magic overview from p.69-122."""
    print("Extracting rune magic overview from p.69-122...")
    # Just extract the overview pages, not full spell descriptions
    text = extract_pdf_text(AIG_PDF, 69, 75, layout=False)

    with open("/tmp/aig-rune-magic.txt", "w") as f:
        f.write(text)

    print("✓ Saved rune magic overview to /tmp/aig-rune-magic.txt")

def extract_monsters_index():
    """Extract monsters index from p.152-212."""
    print("Extracting monsters index from p.152-212...")
    # Extract just the first few pages to get structure
    text = extract_pdf_text(AIG_PDF, 152, 160, layout=False)

    with open("/tmp/aig-monsters-index.txt", "w") as f:
        f.write(text)

    print("✓ Saved monsters sample to /tmp/aig-monsters-index.txt")

if __name__ == "__main__":
    print("Extracting Adventures in Glorantha reference data...")
    print("Note: Due to copyright and complex PDF formatting,")
    print("extractions are saved as text files for manual curation.\n")

    extract_creation_summary()
    extract_cultures()
    extract_equipment()
    extract_folk_magic()
    extract_rune_magic()
    extract_monsters_index()

    print("\n" + "="*60)
    print("NEXT STEPS:")
    print("="*60)
    print("Review the extracted text files in /tmp/aig-*.txt")
    print("Manually create the JSON files based on the text extractions.")
    print("Ensure all data includes page citations and follows the format")
    print("established in references/mythras-raw/ examples.")
    print("\nKey files to create:")
    print("  - references/aig-raw/cultures.json")
    print("  - references/aig-raw/careers.json")
    print("  - references/aig-raw/equipment-aig.json")
    print("  - references/aig-raw/folk-magic-aig.json")
    print("  - references/aig-raw/rune-affinities.json")
    print("  - references/aig-raw/combat-styles-aig.json")
    print("  - references/aig-raw/magic-overview.json")
    print("  - references/aig-raw/creation-summary-aig.json")
    print("  - references/aig-raw/monsters-index.json")
