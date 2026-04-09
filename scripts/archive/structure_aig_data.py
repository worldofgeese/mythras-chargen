#!/usr/bin/env python3
"""
Structure Adventures in Glorantha data into JSON with page citations.
Based on raw text extractions from the PDF.
"""
import json
from datetime import date

OUTPUT_DIR = "references/aig-raw"
SOURCE = "Adventures in Glorantha (GenCon 2015 Preview)"
TODAY = str(date.today())


def create_creation_summary():
    """Create the 12-step character creation summary for AiG."""
    data = {
        "source": SOURCE,
        "extracted_at": TODAY,
        "page": "p.23-25",
        "character_creation_summary": {
            "step_1_concept": {
                "description": "Brief phrase summarizing character concept",
                "page": "p.23"
            },
            "step_2_characteristics": {
                "method_roll": {
                    "dice": {
                        "3d6": ["STR", "CON", "DEX", "POW", "CHA"],
                        "2d6+6": ["SIZ", "INT"]
                    }
                },
                "page": "p.23"
            },
            "step_3_attributes": {
                "note": "Calculate Action Points, Damage Modifier, Experience Modifier, Healing Rate, Hit Points, Initiative Bonus, Luck Points, Magic Points, Movement Rate from characteristics",
                "page": "p.23"
            },
            "step_4_culture_and_homeland": {
                "note": "Choose from 8 cultures: Balazaring, Esrolian, God Forgot, Lunar Heartland, Praxian, Provincial Lunar/Tarsh, Sartarite/Heortling, Telmori",
                "page": "p.23-24"
            },
            "step_5_cultural_skills_and_magic": {
                "skill_points": 100,
                "minimum_per_skill": 5,
                "maximum_per_skill": 15,
                "customs_bonus": 40,
                "native_tongue_bonus": 40,
                "tradetalk": "INT+CHA+30% for all characters",
                "rune_affinities": {
                    "count": 3,
                    "first_rune": "POWx2+30%",
                    "second_rune": "POWx2+20%",
                    "third_rune": "POWx2+10%",
                    "note": "Assign in whatever order player desires"
                },
                "folk_magic": {
                    "skill": "POW+CHA+30%",
                    "spells_from_culture": 3,
                    "note": "Choose from culture's folk magic list"
                },
                "page": "p.24"
            },
            "step_6_passions": {
                "count": 3,
                "base_value": "POW+CHA+30%",
                "note": "Defined by culture",
                "page": "p.24"
            },
            "step_7_background_details": {
                "note": "Optional: family, community, unique past events, social standing",
                "reference": "RuneQuest core rules p.26-35 or 100 Unique Gloranthan Events",
                "page": "p.24"
            },
            "step_8_career": {
                "note": "Choose career according to culture",
                "reference": "RuneQuest pages 39-47",
                "page": "p.24"
            },
            "step_9_career_skills_and_magic": {
                "skill_points": 100,
                "maximum_per_skill": 15,
                "additional_folk_magic": {
                    "spells": 2,
                    "note": "Choose from full Folk Magic list"
                },
                "page": "p.24"
            },
            "step_10_age_and_bonus_points": {
                "reference": "RuneQuest page 48",
                "note": "Determine age and assign final round of skill points",
                "page": "p.24"
            },
            "step_11_starting_money_and_equipment": {
                "note": "Based on culture, rolled in Lunars",
                "currency": "Lunar (has substantially more buying power than standard Silver Piece)",
                "by_culture": {
                    "Balazaring": "4d6x2",
                    "Esrolian": "4d6x15",
                    "God_Forgot": "4d6x15",
                    "Lunar_Heartland": "4d6x10",
                    "Praxian": "4d6x15",
                    "Provincial_Lunar_Tarsh": "4d6x5",
                    "Sartarite_Heortling": "4d6x10",
                    "Telmori": "4d6x2"
                },
                "page": "p.24"
            },
            "step_12_prepare_for_adventure": {
                "note": "Give character a name and prepare to step out into Glorantha",
                "page": "p.25"
            }
        }
    }

    with open(f"{OUTPUT_DIR}/creation-summary-aig.json", "w") as f:
        json.dump(data, f, indent=2)
    print("✓ Created creation-summary-aig.json")


def create_cultures():
    """Create cultures.json with all 8 cultures from p.26-47."""
    # Based on manual reading of /tmp/aig-cultures.txt
    data = {
        "source": SOURCE,
        "extracted_at": TODAY,
        "page": "p.26-47",
        "cultures": [
            {
                "name": "Balazaring",
                "page": "p.26-28",
                "culture_type": "Primitive",
                "description": "Hunter-gatherers divided into small clans, inhabitants of Balazar",
                "standard_skills": [
                    "Athletics", "Brawn", "Endurance", "Evade", "Locale",
                    "Perception", "Stealth", "Boating or Swim"
                ],
                "professional_skills": [
                    "Craft (any)", "Healing", "Lore (any)", "Musicianship",
                    "Navigate", "Survival", "Track"
                ],
                "combat_styles": [
                    {
                        "name": "Hunter Raider",
                        "weapons": ["Spear", "Bow", "Sling"],
                        "traits": ["Skirmisher"]
                    },
                    {
                        "name": "Pony Cavalry",
                        "weapons": ["Spear", "Bow"],
                        "traits": ["Mounted"]
                    },
                    {
                        "name": "Hawk Slayer",
                        "weapons": ["Longspear"],
                        "traits": ["Mounted"]
                    }
                ],
                "passions": [
                    {"type": "Loyalty", "focus": "Clan", "base_value": "POW+CHA+30%"},
                    {"type": "Loyalty", "focus": "City", "base_value": "POW+CHA+30%"},
                    {"type": "Love or Hate", "focus": "character's choice", "base_value": "POW+CHA+30%"}
                ],
                "folk_magic_spells": [
                    "Beastcall (Dog, Pig or Giant Hawk)", "Bladesharp", "Cleanse",
                    "Coordination", "Deflect", "Dry", "Find Game", "Ignite",
                    "Mobility", "Speedart"
                ],
                "starting_money": {"currency": "Lunars", "amount_formula": "4d6x2"}
            }
            # Note: Additional cultures need to be extracted from the raw text
            # Continuing with placeholder structure for now
        ]
    }

    with open(f"{OUTPUT_DIR}/cultures.json", "w") as f:
        json.dump(data, f, indent=2)
    print("✓ Created cultures.json (Balazaring complete, 7 more to extract)")


if __name__ == "__main__":
    print("Structuring Adventures in Glorantha data...\n")
    create_creation_summary()
    create_cultures()
    print("\nDone! Check references/aig-raw/ for output files.")
