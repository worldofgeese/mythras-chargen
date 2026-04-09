#!/usr/bin/env python3
"""
Extract equipment data from Mythras Core Rulebook.
Extracts structured JSON with page citations from PDF text.
"""
import json
import re
import subprocess
from datetime import date

MYTHRAS_PDF = "/home/node/.openclaw/media/inbound/Mythras_-_TDM_-_Core_Rulebook_3rd_Printing_03-11-2018---5ab8871a-b6e9-43ca-afea-aa3ed1e07b1b.pdf"

def extract_pdf_text(pdf_path, first_page, last_page, layout=True):
    """Extract text from PDF pages using pdftotext."""
    cmd = ["pdftotext"]
    if layout:
        cmd.append("-layout")
    cmd.extend(["-f", str(first_page), "-l", str(last_page), pdf_path, "-"])
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout

def create_armour_json():
    """Extract armour table from p.58-59."""
    # Extract the armour data manually from the table
    armour_data = {
        "source": "Mythras Core Rulebook, 3rd Printing (2018)",
        "extracted_at": str(date.today()),
        "page": "p.58-59",
        "notes": {
            "ap": "Armour Points per location",
            "enc": "Encumbrance per location",
            "cost_per_location": "Cost in Silver Pieces per location",
            "suit_penalty": "Initiative penalty for full suit (all 7 locations)",
            "worn_enc_rule": "When worn, only half the total ENC of armour counts towards Encumbrance Capacity",
            "carried_enc_rule": "When carried, the full ENC value counts towards Encumbrance Capacity"
        },
        "armour_types": [
            {
                "base_material": "Flexible",
                "construction": "Natural/Cured",
                "examples": ["Furs", "Hides"],
                "ap": 1,
                "enc_per_location": 2,
                "cost_per_location": 20,
                "suit_enc": 14,
                "suit_cost": 140,
                "suit_penalty": 3,
                "milieu": ["P", "A", "M", "R", "E", "I"]
            },
            {
                "base_material": "Flexible",
                "construction": "Padded/Quilted",
                "examples": ["Aketon", "Gambeson"],
                "ap": 2,
                "enc_per_location": 1,
                "cost_per_location": 80,
                "suit_enc": 7,
                "suit_cost": 560,
                "suit_penalty": 2,
                "milieu": ["P", "A", "M", "R", "E", "I"]
            },
            {
                "base_material": "Flexible",
                "construction": "Laminated",
                "examples": ["Linothorax", "Bezainted"],
                "ap": 3,
                "enc_per_location": 2,
                "cost_per_location": 180,
                "suit_enc": 14,
                "suit_cost": 1260,
                "suit_penalty": 3,
                "milieu": ["A", "M"]
            },
            {
                "base_material": "Flexible",
                "construction": "Scaled",
                "examples": ["Brigandine", "Lamellar"],
                "ap": 4,
                "enc_per_location": 3,
                "cost_per_location": 320,
                "suit_enc": 21,
                "suit_cost": 2240,
                "suit_penalty": 5,
                "milieu": ["A", "M", "R"]
            },
            {
                "base_material": "Flexible",
                "construction": "Half Plate",
                "examples": ["Hoplite Plate"],
                "ap": 5,
                "enc_per_location": 4,
                "cost_per_location": 500,
                "suit_enc": 28,
                "suit_cost": 3500,
                "suit_penalty": 6,
                "milieu": ["A", "M", "R"]
            },
            {
                "base_material": "Flexible",
                "construction": "Mail",
                "examples": ["Mail Hauberk", "Laminar"],
                "ap": 6,
                "enc_per_location": 5,
                "cost_per_location": 900,
                "suit_enc": 35,
                "suit_cost": 6300,
                "suit_penalty": 7,
                "milieu": ["A", "M", "R"]
            },
            {
                "base_material": "Rigid",
                "construction": "Plated Mail",
                "examples": ["Splinted Chainmail"],
                "ap": 7,
                "enc_per_location": 6,
                "cost_per_location": 1400,
                "suit_enc": 42,
                "suit_cost": 9800,
                "suit_penalty": 9,
                "milieu": ["M", "E"]
            },
            {
                "base_material": "Rigid",
                "construction": "Articulated Plate",
                "examples": ["Gothic Plate"],
                "ap": 8,
                "enc_per_location": 7,
                "cost_per_location": 2400,
                "suit_enc": 49,
                "suit_cost": 16800,
                "suit_penalty": 10,
                "milieu": ["M", "E"]
            }
        ],
        "material_modifiers": {
            "note": "ENC modifiers for different materials (from p.59)",
            "page": "p.59",
            "materials": [
                {"name": "Bone", "enc_modifier": 1.5, "notes": "Bulky though light, for Laminated/Scaled/Plate"},
                {"name": "Bronze", "enc_modifier": 1.0, "notes": "Default for rigid armours"},
                {"name": "Chitin", "enc_modifier": 0.75, "notes": "Lighter, carved not moulded, requires large insects"},
                {"name": "Iron", "enc_modifier": 1.0, "notes": "Default for rigid armours"},
                {"name": "Ivory", "enc_modifier": 1.25, "notes": "Teeth/tusks for Laminated/Scaled/Plate"},
                {"name": "Leather", "enc_modifier": 2.0, "notes": "Can be tanned/boiled, any armour except mail"},
                {"name": "Linen", "enc_modifier": 1.0, "notes": "Default for flexible armours up to Laminated"},
                {"name": "Shell", "enc_modifier": 2.0, "notes": "Thick and heavy, fragile, for Laminated/Scaled"}
            ]
        }
    }

    with open("references/mythras-raw/armour.json", "w") as f:
        json.dump(armour_data, f, indent=2)
    print("✓ Created armour.json")

def create_encumbrance_json():
    """Extract encumbrance rules from p.78."""
    enc_data = {
        "source": "Mythras Core Rulebook, 3rd Printing (2018)",
        "extracted_at": str(date.today()),
        "page": "p.78",
        "encumbrance_capacity": {
            "base_capacity": "STR × 2",
            "notes": "Everyday clothing does not count, armour does"
        },
        "burdened_threshold": {
            "condition": "Total ENC > STR × 2",
            "effects": [
                "Skills using STR or DEX become one grade harder (including combat)",
                "Base Movement Rate drops by 2 metres",
                "Cannot sprint",
                "Carrying the load counts as Medium activity for Fatigue"
            ]
        },
        "armour_enc_rules": {
            "worn": "Only half the total ENC of armour counts towards Encumbrance Capacity",
            "carried": "Full ENC value of armour counts towards Encumbrance Capacity"
        },
        "enc_to_siz_ratio": {
            "default": "3 ENC = 1 SIZ",
            "notes": "May adjust to 2:1 or 1:1 depending on item density. 20 zero-ENC items = 1 ENC"
        },
        "non_human_encumbrance": {
            "rule": "Multiply total ENC by ratio of creature's average SIZ to human average SIZ",
            "page": "p.78"
        }
    }

    with open("references/mythras-raw/encumbrance.json", "w") as f:
        json.dump(enc_data, f, indent=2)
    print("✓ Created encumbrance.json")

def parse_weapon_table(text, weapon_type):
    """Parse weapon tables - needs manual curation due to complex layout."""
    # This is a placeholder - the actual table parsing would need
    # careful manual extraction due to complex PDF formatting
    return []

if __name__ == "__main__":
    print("Extracting Mythras equipment data...")
    create_armour_json()
    create_encumbrance_json()
    print("\nNOTE: Weapon tables (melee-weapons.json, ranged-weapons.json)")
    print("need manual extraction due to complex table layout in PDF.")
    print("Extracting text for manual review...")

    # Extract weapon pages for manual review
    weapons_text = extract_pdf_text(MYTHRAS_PDF, 62, 67, layout=True)
    with open("/tmp/mythras-weapons-extract.txt", "w") as f:
        f.write(weapons_text)
    print("✓ Saved weapons text to /tmp/mythras-weapons-extract.txt for manual extraction")
