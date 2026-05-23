#!/usr/bin/env python3
"""Inspect and validate source page-work manifests without extracting text."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "references/sources/manifest.json"
PAGE_DIR = ROOT / "references/sources/pages"
SCHEMA = ROOT / "references/sources/schema.json"


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def validate() -> list[str]:
    errors: list[str] = []
    schema = load_json(SCHEMA)
    manifest = load_json(MANIFEST)
    page_states = set(schema.get("lifecycle_states", {}).get("page_work", []))
    sources = {source["source_id"]: source for source in manifest.get("sources", [])}

    for source_id, source in sources.items():
        page_path = PAGE_DIR / f"{source_id}.json"
        if not page_path.exists():
            errors.append(f"{source_id}: missing page manifest {page_path.relative_to(ROOT)}")
            continue
        page_doc = load_json(page_path)
        if page_doc.get("source_id") != source_id:
            errors.append(f"{page_path.relative_to(ROOT)}: source_id mismatch")
        if page_doc.get("source_revision_id") != source.get("source_revision_id"):
            errors.append(f"{page_path.relative_to(ROOT)}: source_revision_id mismatch")
        if page_doc.get("coverage_state") not in page_states:
            errors.append(f"{page_path.relative_to(ROOT)}: invalid coverage_state {page_doc.get('coverage_state')}")
        if page_doc.get("coverage_state") == "blocked" and not page_doc.get("blockers"):
            errors.append(f"{page_path.relative_to(ROOT)}: blocked coverage requires blockers")
        expected_page_count = page_doc.get("expected_page_count")
        if expected_page_count is not None and (
            not isinstance(expected_page_count, int) or expected_page_count <= 0
        ):
            errors.append(f"{page_path.relative_to(ROOT)}: expected_page_count must be a positive integer or null")
        seen_pages: set[int] = set()
        for record in page_doc.get("pages", []):
            page = record.get("pdf_page")
            label = f"{source_id}:page:{page}"
            if not isinstance(page, int) or page <= 0:
                errors.append(f"{label}: pdf_page must be positive integer")
            if page in seen_pages:
                errors.append(f"{label}: duplicate page record")
            seen_pages.add(page)
            if record.get("work_state") not in page_states:
                errors.append(f"{label}: invalid work_state {record.get('work_state')}")
            if record.get("source_revision_id") != source.get("source_revision_id"):
                errors.append(f"{label}: source_revision_id mismatch")
            if record.get("work_state") in {"normalized", "accepted"} and not record.get("derived_facts"):
                errors.append(f"{label}: normalized/accepted page requires derived_facts")
        coverage_mode = page_doc.get("coverage_mode")
        requires_all_page_scaffold = page_doc.get("requires_all_page_scaffold") is True or (
            isinstance(coverage_mode, str) and "all-page-scaffold" in coverage_mode
        )
        sparse_subset = (
            isinstance(expected_page_count, int)
            and bool(page_doc.get("pages"))
            and len(page_doc.get("pages", [])) != expected_page_count
        )
        sparse_verified = (
            sparse_subset
            and
            not requires_all_page_scaffold
            and page_doc.get("coverage_state") in {"verified", "normalized", "accepted"}
        )
        if isinstance(expected_page_count, int) and page_doc.get("pages") and requires_all_page_scaffold:
            if len(page_doc.get("pages", [])) != expected_page_count:
                errors.append(
                    f"{page_path.relative_to(ROOT)}: expected {expected_page_count} page records, "
                    f"found {len(page_doc.get('pages', []))}"
                )
            for page in range(1, expected_page_count + 1):
                if page not in seen_pages:
                    errors.append(f"{source_id}: missing pdf_page {page}")
        if sparse_verified:
            target_pages = page_doc.get("target_pages")
            if not isinstance(target_pages, list) or not target_pages:
                errors.append(f"{source_id}: sparse verified coverage requires non-empty target_pages[]")
            else:
                target_seen: set[int] = set()
                for page in target_pages:
                    if not isinstance(page, int) or page <= 0:
                        errors.append(f"{source_id}: invalid target pdf_page {page}")
                    if page in target_seen:
                        errors.append(f"{source_id}: duplicate target pdf_page {page}")
                    target_seen.add(page)
                for page in target_seen:
                    if page not in seen_pages:
                        errors.append(f"{source_id}: target pdf_page {page} is missing from pages[]")
                for page in seen_pages:
                    if page not in target_seen:
                        errors.append(f"{source_id}: sparse page record {page} is not declared in target_pages[]")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--validate", action="store_true", help="Validate page-work manifests")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()
    errors = validate()
    if errors:
        print("Page-work manifest validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    if not args.quiet:
        print("Page-work manifest validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
