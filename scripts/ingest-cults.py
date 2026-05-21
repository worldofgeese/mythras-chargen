#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["pdfplumber"]
# requires-python = ">=3.11"
# ///
"""Deterministic cult PDF ingestion pipeline.

Font-aware extraction that separates GloranthaCoreRunes glyphs from body text,
producing clean miracle entries without OCR garbage.

Usage:
    ./scripts/ingest-cults.py                    # Process all, show diff
    ./scripts/ingest-cults.py --write            # Process all, write JSONs
    ./scripts/ingest-cults.py --validate         # Validate existing JSONs
    ./scripts/ingest-cults.py path/to/cult.pdf   # Process single PDF
    ./scripts/ingest-cults.py --diff             # Show changes vs existing

Self-contained: uv handles pdfplumber dependency automatically.
"""

import json
import re
import sys
from pathlib import Path
from typing import Optional

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = ROOT / "references" / "cults-upstream"
OUTPUT = ROOT / "references" / "cults-raw"
GLYPH_MAP_PATH = ROOT / "references" / "rune-glyph-map.json"

# Load rune glyph mapping
GLYPH_MAP = {}
IGNORED_GLYPHS = set()
if GLYPH_MAP_PATH.exists():
    glyph_data = json.loads(GLYPH_MAP_PATH.read_text())
    for char, info in glyph_data.get("glyphs", {}).items():
        GLYPH_MAP[char] = info["rune"]
    IGNORED_GLYPHS = set(glyph_data.get("ignored_in_rune_font", {}).keys())

# Standard runelord miracles (every theist cult gets these)
STANDARD_RUNELORD = {"Excommunication", "Mindlink", "Sanctify", "Summon Spirit of Reprisal"}

# Common initiate miracles (appear in almost every cult)
COMMON_MIRACLES = {"Extension", "Find (Specific Thing)", "Divination", "Chastise"}

# Skip patterns for catalogue/relationship PDFs
SKIP_PATTERNS = [
    "Pantheon Cult Catalogue",
    "Pantheon Cult Relationships",
    "Pantheon Cult Spell Catalogue",
    "Pantheon Personality Traits",
]


def is_rune_font(char_dict: dict) -> bool:
    """Check if a character is rendered in the GloranthaCoreRunes font."""
    fontname = char_dict.get("fontname", "")
    return "GloranthaCoreRunes" in fontname


def extract_tokens(page) -> list[dict]:
    """Extract a token stream from a PDF page, separating rune glyphs from text.
    
    Returns list of:
        {"type": "rune", "char": "g", "rune": "Air"}
        {"type": "text", "value": "Cloud Call"}
        {"type": "newline"}
    """
    chars = page.chars
    tokens = []
    current_text = ""
    last_y = None
    
    for c in chars:
        char_text = c["text"]
        y_pos = round(c["top"], 0)
        
        # Detect line breaks (y position change > 3pt)
        if last_y is not None and abs(y_pos - last_y) > 3:
            if current_text.strip():
                tokens.append({"type": "text", "value": current_text.strip()})
                current_text = ""
            tokens.append({"type": "newline"})
        last_y = y_pos
        
        if is_rune_font(c):
            # Emit accumulated text first
            if current_text.strip():
                tokens.append({"type": "text", "value": current_text.strip()})
                current_text = ""
            
            # Skip ignored characters (spaces, commas, periods in rune font)
            if char_text in IGNORED_GLYPHS:
                continue
            
            # Emit rune token
            rune_name = GLYPH_MAP.get(char_text, f"UNKNOWN:{char_text}")
            tokens.append({"type": "rune", "char": char_text, "rune": rune_name})
        else:
            current_text += char_text
    
    # Emit final text
    if current_text.strip():
        tokens.append({"type": "text", "value": current_text.strip()})
    
    # Normalize non-breaking spaces in text tokens
    for token in tokens:
        if token["type"] == "text":
            token["value"] = token["value"].replace("\xa0", " ")
    
    return tokens


def find_section_boundaries(tokens: list[dict]) -> dict:
    """Find the boundaries of miracle sections in the token stream.
    
    Returns dict with keys: 'initiate', 'runelord', 'initiate_sub', 'runelord_sub', 'associate'
    Each value is (start_idx, end_idx) in the token list.
    """
    sections = {}
    
    # Rebuild text lines to find section headers
    lines = []
    current_line_tokens = []
    current_line_start = 0
    
    for i, token in enumerate(tokens):
        if token["type"] == "newline":
            if current_line_tokens:
                text = " ".join(t.get("value", "") for t in current_line_tokens if t["type"] == "text")
                lines.append({"text": text, "start": current_line_start, "end": i, "tokens": current_line_tokens})
            current_line_tokens = []
            current_line_start = i + 1
        else:
            current_line_tokens.append(token)
    if current_line_tokens:
        text = " ".join(t.get("value", "") for t in current_line_tokens if t["type"] == "text")
        lines.append({"text": text, "start": current_line_start, "end": len(tokens), "tokens": current_line_tokens})
    
    # Find section headers
    # Order matters: more specific patterns must come first to avoid
    # "Runelord - subservient" matching the generic "Runelord" pattern
    section_markers = [
        ("initiate_sub", r"Initiate\s*[-\u2013\u2014]\s*(?:subservient|associate)"),
        ("runelord_sub", r"Runelord\s*[-\u2013\u2014]\s*(?:subservient|associate)"),
        ("initiate", r"Theist Miracles\s*[-\u2013\u2014]\s*Initiate"),
        ("runelord", r"^Runelord:\s*Return"),
    ]
    
    # End markers (sections after miracles)
    end_markers = r"(?:Pantheons|Source\s*[-–—]|Areas|Spirit\s*Societ|Enemy\s*Cult|Hostile|Friendly|Associated\s*Cult|Personality|Holy\s*Days|Sacrifices|Rune\s*Meanings)"
    
    found_sections = []
    for line in lines:
        matched = False
        for section_name, pattern in section_markers:
            if re.search(pattern, line["text"], re.IGNORECASE):
                found_sections.append((section_name, line["end"] + 1))  # Content starts after the header line
                matched = True
                break
        if not matched and re.match(end_markers, line["text"], re.IGNORECASE):
            found_sections.append(("_end", line["start"]))
    
    # Build boundaries: each section runs from its start to the next section's start
    for i, (name, start) in enumerate(found_sections):
        if name == "_end":
            continue
        # Find end: next section start or document end
        end = len(tokens)
        for j in range(i + 1, len(found_sections)):
            end = found_sections[j][1]
            break
        sections[name] = (start, end)
    
    return sections


def resolve_runes(rune_tokens: list[dict]) -> list[str]:
    """Resolve a sequence of rune tokens into rune name(s).
    
    Rules:
    - Single rune → [that rune]
    - 2 runes → [both runes]  
    - 3+ runes → ["Any"] (multi-element, available to all)
    """
    if not rune_tokens:
        return ["Any"]
    
    runes = []
    for t in rune_tokens:
        rune = t.get("rune", "")
        if rune and not rune.startswith("UNKNOWN") and rune != "Element-All":
            runes.append(rune)
        elif rune == "Element-All":
            return ["Any"]
    
    # Deduplicate
    runes = list(dict.fromkeys(runes))
    
    if len(runes) >= 3:
        return ["Any"]
    elif len(runes) == 0:
        return ["Any"]
    
    return runes


def parse_miracles_from_tokens(tokens: list[dict], start: int, end: int, 
                                rank: str, is_subservient: bool = False) -> list[dict]:
    """Parse miracle entries from a slice of the token stream.
    
    Miracles are comma-separated. Rune tokens before a miracle name indicate its rune.
    """
    miracles = []
    section_tokens = tokens[start:end]
    
    # Build entries: collect rune tokens, then text until comma or newline
    current_runes = []
    current_text = ""
    
    saw_rune_since_last_text = False
    pending_subcult_prefix = ""  # Holds "SubcultName(s):" while we wait for the miracle name
    
    for token in section_tokens:
        if token["type"] == "rune":
            # If we have accumulated text, it means this rune starts a new entry
            if current_text.strip() and current_text.strip() not in (",", ""):
                stripped = current_text.strip()
                # Check if this text is a subcult prefix (ends with "(s):" or "(a):")
                if re.search(r'\([sa]\):$', stripped):
                    # Don't emit — hold as prefix for the next miracle name
                    pending_subcult_prefix = stripped
                    current_text = ""
                    current_runes = []
                else:
                    # Save previous entry
                    entry = _build_entry(stripped, current_runes, rank, is_subservient)
                    if entry:
                        miracles.extend(entry if isinstance(entry, list) else [entry])
                    current_runes = []
                    current_text = ""
            current_runes.append(token)
            saw_rune_since_last_text = True
        elif token["type"] == "text":
            text = token["value"]
            
            # Prepend any pending subcult prefix
            if pending_subcult_prefix:
                text = pending_subcult_prefix + text
                pending_subcult_prefix = ""
            
            # If no rune token preceded this text and we already have text,
            # this is a line-wrap continuation (e.g., "Create" + "Wine")
            if not saw_rune_since_last_text and current_text.strip() and not text.startswith(("Initiate", "Runelord", "Pantheon", "Source")):
                # Continuation — append to current entry
                # But still split on commas within this continuation
                parts = text.split(",")
                for pi, part in enumerate(parts):
                    part = part.strip()
                    if pi > 0 and current_text.strip():
                        open_parens = current_text.count("(") - current_text.count(")")
                        if open_parens > 0:
                            current_text += ", " + part
                            continue
                        entry = _build_entry(current_text.strip(), current_runes, rank, is_subservient)
                        if entry:
                            miracles.extend(entry if isinstance(entry, list) else [entry])
                        current_runes = []
                        current_text = ""
                    if part:
                        current_text += (" " if current_text else "") + part
                saw_rune_since_last_text = False
                continue
            
            saw_rune_since_last_text = False
            # Split on commas — each comma-separated piece is a potential entry
            parts = text.split(",")
            for pi, part in enumerate(parts):
                part = part.strip()
                if pi > 0 and current_text.strip():
                    # Only split on commas that aren't inside parentheses
                    open_parens = current_text.count("(") - current_text.count(")")
                    if open_parens > 0:
                        # Inside parens — comma is part of the name
                        current_text += ", " + part
                        continue
                    # Comma boundary — save previous entry
                    entry = _build_entry(current_text.strip(), current_runes, rank, is_subservient)
                    if entry:
                        miracles.extend(entry if isinstance(entry, list) else [entry])
                    current_runes = []
                    current_text = ""
                if part:
                    current_text += (" " if current_text else "") + part
        elif token["type"] == "newline":
            # Newlines within a section don't delimit entries — miracle lists
            # wrap across lines. But if the next non-newline token is a rune,
            # it starts a new entry. We handle that via the rune-token branch above.
            # For text continuation (e.g., "Create" / "Wine"), we just keep going.
            pass
    
    # Save final entry
    if current_text.strip():
        entry = _build_entry(current_text.strip(), current_runes, rank, is_subservient)
        if entry:
            miracles.extend(entry if isinstance(entry, list) else [entry])
    
    return miracles


def _build_entry(text: str, rune_tokens: list, rank: str, is_subservient: bool) -> Optional[dict | list]:
    """Build a miracle entry from accumulated text and rune tokens."""
    # Normalize non-breaking spaces
    text = text.replace("\xa0", " ").strip().rstrip(",").strip()
    if not text or len(text) < 2:
        return None
    
    # Filter known OCR noise
    if text.strip() in ("Behold", "behold"):
        return None
    
    # Skip section header remnants
    if any(text.startswith(h) for h in ["Return to", "One time use", "holy place"]):
        return None
    
    # Strip trailing section header text that leaked in
    for header in ["Runelord:", "Runelord :", "Runelord -", "Initiate -", "Initiate:", "Pantheons", "Source"]:
        idx = text.find(header)
        if idx > 0:
            text = text[:idx].strip().rstrip(",").strip()
            if not text or len(text) < 2:
                return None
            # Re-check noise filter after stripping
            if text.strip() in ("Behold", "behold"):
                return None
    
    # Handle double-space-separated entries (PDF line wraps without commas)
    if "  " in text and ":" not in text:
        parts = [p.strip() for p in re.split(r'\s{2,}', text) if p.strip() and len(p.strip()) > 2]
        if len(parts) > 1:
            entries = []
            for part in parts:
                entry = _build_entry(part, rune_tokens, rank, is_subservient)
                if entry:
                    entries.extend(entry if isinstance(entry, list) else [entry])
            return entries if entries else None
    
    # Handle concatenated standard runelord miracles (space-separated in PDFs)
    if rank == "runelord" and not is_subservient:
        # Check if this text contains multiple standard runelord miracles
        std_found = [s for s in STANDARD_RUNELORD if s in text]
        if len(std_found) >= 2:
            # Split into individual standard miracles + any remainder
            entries = []
            remainder = text
            for std in sorted(STANDARD_RUNELORD, key=len, reverse=True):
                if std in remainder:
                    entries.append({
                        "name": std,
                        "runes": ["Any"],
                        "source": "normal",
                        "rank": "runelord",
                    })
                    remainder = remainder.replace(std, " ", 1)
            # Parse any remaining cult-specific miracles
            remainder = remainder.strip()
            if remainder and len(remainder) > 2:
                for part in re.split(r'\s{2,}', remainder):
                    part = part.strip()
                    if part and len(part) > 2:
                        entries.append({
                            "name": part,
                            "runes": resolve_runes(rune_tokens),
                            "source": "normal",
                            "rank": "runelord",
                        })
            return entries
    
    runes = resolve_runes(rune_tokens)
    
    # Determine source
    source = "subservient" if is_subservient else "normal"
    if text in COMMON_MIRACLES:
        source = "common"
        runes = ["Any"]
    
    # Handle subcult syntax: "SubcultName(s):MiracleName"
    subcult_match = re.match(r'([\w\s]+?)\(([sa])\):\s*(.+)', text)
    if subcult_match:
        subcult_name = subcult_match.group(1).strip()
        subcult_type = subcult_match.group(2)
        miracle_name = subcult_match.group(3).strip()
        source = "subservient" if subcult_type == "s" else "associated"
        return {
            "name": f"{subcult_name}({subcult_type}):{miracle_name}",
            "runes": runes,
            "source": source,
            "rank": rank,
        }
    
    # Handle associate syntax: "CultName(a):MiracleName"  
    assoc_match = re.match(r'([\w\s]+?)\(a\):\s*(.+)', text)
    if assoc_match:
        from_cult = assoc_match.group(1).strip()
        miracle_name = assoc_match.group(2).strip()
        return {
            "name": miracle_name,
            "runes": runes,
            "source": "associated",
            "rank": rank,
            "from_cult": from_cult,
        }
    
    # Standard runelord miracles always get "Any"
    if text in STANDARD_RUNELORD:
        runes = ["Any"]
    
    return {
        "name": text,
        "runes": runes,
        "source": source,
        "rank": rank,
    }


def extract_cult_miracles(pdf_path: Path) -> Optional[dict]:
    """Extract miracles from a cult one-pager PDF.
    
    Returns dict with:
        cult_name: str
        miracles: list of miracle entry dicts
    Or None if no theist miracles section found.
    """
    with pdfplumber.open(str(pdf_path)) as pdf:
        # Most cult one-pagers are 1-2 pages
        all_tokens = []
        for page in pdf.pages:
            page_tokens = extract_tokens(page)
            all_tokens.extend(page_tokens)
            all_tokens.append({"type": "newline"})
    
    # Extract cult name from first text token
    cult_name = None
    for token in all_tokens:
        if token["type"] == "text" and len(token["value"]) > 2:
            cult_name = token["value"].strip()
            break
    
    if not cult_name:
        return None
    
    # Find section boundaries
    sections = find_section_boundaries(all_tokens)
    
    if not sections:
        return None  # No theist miracles section
    
    miracles = []
    
    # Parse each section
    if "initiate" in sections:
        start, end = sections["initiate"]
        entries = parse_miracles_from_tokens(all_tokens, start, end, "initiate", False)
        miracles.extend(entries)
    
    if "initiate_sub" in sections:
        start, end = sections["initiate_sub"]
        entries = parse_miracles_from_tokens(all_tokens, start, end, "initiate", True)
        miracles.extend(entries)
    
    if "runelord" in sections:
        start, end = sections["runelord"]
        entries = parse_miracles_from_tokens(all_tokens, start, end, "runelord", False)
        miracles.extend(entries)
    
    if "runelord_sub" in sections:
        start, end = sections["runelord_sub"]
        entries = parse_miracles_from_tokens(all_tokens, start, end, "runelord", True)
        miracles.extend(entries)
    
    return {
        "cult_name": cult_name,
        "miracles": miracles,
    }


def validate_entries(miracles: list[dict], cult_name: str) -> list[str]:
    """Validate extracted miracle entries, returning list of warnings."""
    warnings = []
    
    for m in miracles:
        name = m["name"]
        # Name starts with lowercase (possible leaked rune code)
        if name[0].islower() and not name.startswith("de") and ":" not in name:
            warnings.append(f'  ⚠️  "{name}" starts with lowercase (garbled?)')
        # Very short name (allow known short miracles: Lie, Rut, Omen)
        if len(name) < 3 and name not in ("Lie", "Rut"):
            warnings.append(f'  ⚠️  "{name}" very short (noise?)')
        # Contains UNKNOWN rune
        if any("UNKNOWN" in r for r in m["runes"]):
            warnings.append(f'  ⚠️  "{name}" has unmapped rune glyph')
        # Name is "Behold" (known noise)
        if name == "Behold":
            warnings.append(f'  ⚠️  "{name}" is known OCR noise')
    
    # Check miracle count
    initiate_count = len([m for m in miracles if m["rank"] == "initiate"])
    runelord_count = len([m for m in miracles if m["rank"] == "runelord"])
    
    if initiate_count == 0:
        warnings.append(f"  ⚠️  No initiate miracles found")
    if runelord_count == 0:
        warnings.append(f"  ⚠️  No runelord miracles found")
    
    return warnings



def read_reference_json(relative_path: str) -> dict | list:
    """Read a committed reference JSON file relative to the repository root."""
    return json.loads((ROOT / relative_path).read_text())


def validate_waha_authority() -> list[str]:
    """Fail closed if stale Waha duplicates can still masquerade as app authority."""
    issues: list[str] = []
    manifest = read_reference_json("references/sources/manifest.json")
    page_doc = read_reference_json("references/sources/pages/waha.json")
    praxian = read_reference_json("references/cults-raw/praxian/waha.json")
    storm = read_reference_json("references/cults-raw/storm/waha.json")
    aggregate = read_reference_json("references/cults-raw/cults.json")

    waha_source = next((source for source in manifest.get("sources", []) if source.get("source_id") == "waha"), None)
    if not waha_source:
        issues.append("Waha source missing from references/sources/manifest.json")
        source_revision_id = None
    else:
        source_revision_id = waha_source.get("source_revision_id")
        if waha_source.get("acceptance_state") != "blocked_pending_vision_verification":
            issues.append("Waha source must remain blocked_pending_vision_verification until vision verification exists")
        if not waha_source.get("acceptance_blockers"):
            issues.append("Waha source blocked state must list acceptance_blockers")
        public_source = waha_source.get("source_access", {}).get("public_copyparty_source", {})
        if public_source.get("status") == "not_found" and waha_source.get("acceptance_state") != "blocked_pending_vision_verification":
            issues.append("Unavailable public Copyparty Waha source must block acceptance")
        duplicate_sources = waha_source.get("duplicate_sources", [])
        if not any(
            duplicate.get("locator") == "references/cults-upstream/Storm/Waha.pdf"
            and duplicate.get("lifecycle_state") == "superseded"
            and duplicate.get("do_not_use_for_app_generation") is True
            for duplicate in duplicate_sources
        ):
            issues.append("Storm Waha source duplicate must be recorded as superseded in the manifest")

    if page_doc.get("source_revision_id") != source_revision_id:
        issues.append("Waha page manifest source_revision_id must match manifest")
    if page_doc.get("coverage_state") != "blocked":
        issues.append("Waha page coverage must be blocked until extraction and independent verification exist")
    if not page_doc.get("blockers"):
        issues.append("Blocked Waha page coverage must list blockers")
    for page in page_doc.get("pages", []):
        work_state = page.get("work_state")
        if work_state == "blocked" and not page.get("blockers"):
            issues.append(f"Waha page {page.get('pdf_page')} blocked state must list blockers")
        if work_state in {"verified", "normalized", "accepted"}:
            verification = page.get("verification")
            if not page.get("extraction") or not verification or verification.get("independent") is not True:
                issues.append(f"Waha page {page.get('pdf_page')} cannot be {work_state} without independent verification metadata")

    authority = praxian.get("sourceAuthority", {})
    if not praxian.get("canonicalRecord") or praxian.get("doNotUseForAppGeneration") is not False:
        issues.append("Praxian Waha must be the single canonical raw record")
    if praxian.get("verified") is not False or praxian.get("verificationState") != "blocked_pending_vision_verification":
        issues.append("Praxian Waha must not claim a completed verification refresh")
    if authority.get("source_revision_id") != source_revision_id or authority.get("canonical_record") is not True:
        issues.append("Praxian Waha sourceAuthority must point at the Waha source revision as canonical")

    storm_authority = storm.get("sourceAuthority", {})
    if storm.get("recordStatus") != "superseded" or storm.get("doNotUseForAppGeneration") is not True:
        issues.append("Storm Waha raw record must be marked superseded and doNotUseForAppGeneration")
    if storm.get("supersededBy") != "references/cults-raw/praxian/waha.json":
        issues.append("Storm Waha raw record must redirect to Praxian Waha")
    if storm_authority.get("authority_status") != "superseded_duplicate":
        issues.append("Storm Waha sourceAuthority must mark superseded_duplicate")

    aggregate_waha = [cult for cult in aggregate if cult.get("name") == "Waha"]
    if len(aggregate_waha) < 2:
        issues.append("Aggregate cults.json should retain explicit Waha duplicate disposition records")
    app_eligible = [cult for cult in aggregate_waha if cult.get("doNotUseForAppGeneration") is not True]
    if app_eligible:
        sources = ", ".join(cult.get("source", "<missing>") for cult in app_eligible)
        issues.append(f"Aggregate Waha entries must not be app-generation eligible: {sources}")
    if not any(cult.get("recordStatus") == "redirected-to-canonical" for cult in aggregate_waha):
        issues.append("Aggregate Praxian Waha entry must redirect to canonical raw record")
    if not any(cult.get("recordStatus") == "superseded" for cult in aggregate_waha):
        issues.append("Aggregate Storm Waha entry must be superseded")

    return issues

def process_pdf(pdf_path: Path, write: bool = False, diff: bool = True) -> dict:
    """Process a single cult PDF and optionally write/diff the result."""
    result = extract_cult_miracles(pdf_path)
    
    if result is None:
        return {"status": "no_miracles", "path": str(pdf_path)}
    
    cult_name = result["cult_name"]
    miracles = result["miracles"]
    
    # Validate
    warnings = validate_entries(miracles, cult_name)
    
    # Determine output path
    pantheon_dir = pdf_path.parent.name.lower().replace(" - ", "-").replace(" ", "-")
    cult_filename = cult_name.lower().replace(" ", "-").replace("&", "and") + ".json"
    out_dir = OUTPUT / pantheon_dir
    out_path = out_dir / cult_filename
    
    # Diff against existing
    changes = []
    if diff and out_path.exists():
        existing = json.loads(out_path.read_text())
        existing_miracles = existing.get("miracles", {})
        # Compare miracle lists
        if isinstance(existing_miracles, dict):
            # Old format: {initiate: [...], runelord: [...]}
            old_initiate = set(existing_miracles.get("initiate", []))
            old_runelord = set(existing_miracles.get("runelord", []))
            new_initiate = set(m["name"] for m in miracles if m["rank"] == "initiate")
            new_runelord = set(m["name"] for m in miracles if m["rank"] == "runelord")
            
            added_init = new_initiate - old_initiate
            removed_init = old_initiate - new_initiate
            added_rl = new_runelord - old_runelord
            removed_rl = old_runelord - new_runelord
            
            if added_init: changes.append(f"  + initiate: {added_init}")
            if removed_init: changes.append(f"  - initiate: {removed_init}")
            if added_rl: changes.append(f"  + runelord: {added_rl}")
            if removed_rl: changes.append(f"  - runelord: {removed_rl}")
    
    # Write if requested
    if write:
        out_dir.mkdir(parents=True, exist_ok=True)
        if out_path.exists():
            existing = json.loads(out_path.read_text())
        else:
            existing = {"name": cult_name}
        
        # Update miracles in reference format
        existing["miracles"] = {
            "initiate": [m["name"] for m in miracles if m["rank"] == "initiate" and m["source"] != "subservient"],
            "associate": [m["name"] for m in miracles if m["source"] == "associated"],
            "runelord": [m["name"] for m in miracles if m["rank"] == "runelord" and m["source"] != "subservient"],
        }
        
        # Add subservient sections if present
        sub_init = [m["name"] for m in miracles if m["rank"] == "initiate" and m["source"] == "subservient"]
        sub_rl = [m["name"] for m in miracles if m["rank"] == "runelord" and m["source"] == "subservient"]
        if sub_init:
            existing["miracles"]["initiate_subservient"] = sub_init
        if sub_rl:
            existing["miracles"]["runelord_subservient"] = sub_rl
        
        out_path.write_text(json.dumps(existing, indent=2) + "\n")
    
    return {
        "status": "ok",
        "cult_name": cult_name,
        "path": str(pdf_path),
        "miracles_count": len(miracles),
        "warnings": warnings,
        "changes": changes,
    }


def main():
    args = sys.argv[1:]
    write = "--write" in args
    validate_only = "--validate" in args
    diff = "--diff" in args or not write
    
    # Remove flags from args
    paths = [a for a in args if not a.startswith("--")]
    
    if validate_only:
        # Validate existing reference JSONs
        print("=== Validating existing reference JSONs ===\n")
        issues = 0
        for json_file in sorted(OUTPUT.rglob("*.json")):
            if json_file.name == "cults.json":
                continue
            data = json.loads(json_file.read_text())
            # Check for leftover garbled flags
            if "miracles" in data and isinstance(data["miracles"], list):
                for m in data["miracles"]:
                    if m.get("split_from_garbled") or m.get("rune_inferred"):
                        print(f"  {json_file.relative_to(ROOT)}: has garbled flags")
                        issues += 1
                        break
        waha_issues = validate_waha_authority()
        for issue in waha_issues:
            print(f"  references/cults-raw/*/waha.json: {issue}")
        issues += len(waha_issues)
        print(f"\n{'✅ All clean' if issues == 0 else f'⚠️  {issues} files with issues'}")
        sys.exit(0 if issues == 0 else 1)
    
    # Process PDFs
    if paths:
        pdf_paths = [Path(p) for p in paths]
    else:
        # Find all cult PDFs
        pdf_paths = []
        for pantheon_dir in sorted(UPSTREAM.iterdir()):
            if not pantheon_dir.is_dir():
                continue
            for pdf_file in sorted(pantheon_dir.glob("*.pdf")):
                if any(skip in pdf_file.name for skip in SKIP_PATTERNS):
                    continue
                pdf_paths.append(pdf_file)
    
    print(f"=== Processing {len(pdf_paths)} cult PDFs ===\n")
    
    ok = 0
    no_miracles = 0
    with_warnings = 0
    with_changes = 0
    
    for pdf_path in pdf_paths:
        result = process_pdf(pdf_path, write=write, diff=diff)
        
        if result["status"] == "no_miracles":
            no_miracles += 1
            continue
        
        ok += 1
        has_issues = False
        
        if result.get("warnings"):
            with_warnings += 1
            has_issues = True
        
        if result.get("changes"):
            with_changes += 1
            has_issues = True
        
        if has_issues:
            print(f"{result['cult_name']} ({result['miracles_count']} miracles):")
            for w in result.get("warnings", []):
                print(w)
            for c in result.get("changes", []):
                print(c)
            print()
    
    print(f"\n--- Summary ---")
    print(f"Processed: {ok} cults with miracles")
    print(f"No miracles section: {no_miracles} (animist/sorcery cults)")
    print(f"With warnings: {with_warnings}")
    print(f"With changes vs existing: {with_changes}")
    if write:
        print(f"✅ Reference JSONs updated")
        # Post-process: normalize skill names in updated JSONs
        import subprocess
        norm_script = Path(__file__).parent / "normalize-cult-skills.py"
        if norm_script.exists():
            subprocess.run([sys.executable, str(norm_script), "--write"], check=False)
    else:
        print(f"(dry run — use --write to update JSONs)")


if __name__ == "__main__":
    main()
