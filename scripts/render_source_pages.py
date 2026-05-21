#!/usr/bin/env python3
"""Render accepted source PDF pages into ignored PNG cache files.

Foundation scope only: this script never performs OCR/text extraction and never
commits evidence. It refuses to render blocked/pending sources.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "references/sources/manifest.json"
PAGE_DIR = ROOT / "references/sources/pages"
DEFAULT_CACHE = ROOT / ".cache/source-pages"


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def manifest_sources() -> dict[str, dict]:
    data = load_json(MANIFEST)
    return {source["source_id"]: source for source in data.get("sources", [])}


def parse_pages(value: str | None) -> list[int]:
    if not value:
        return []
    pages: list[int] = []
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start, end = [int(piece) for piece in part.split("-", 1)]
            pages.extend(range(start, end + 1))
        else:
            pages.append(int(part))
    return sorted(set(pages))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require_renderable(source: dict) -> Path:
    if source.get("lifecycle_state") != "active":
        raise SystemExit(f"{source.get('source_id')}: source state {source.get('lifecycle_state')} blocks rendering")
    if source.get("blockers"):
        raise SystemExit(f"{source.get('source_id')}: source blockers prevent rendering: {source.get('blockers')}")
    local_hint = source.get("local_hint")
    if not local_hint or Path(local_hint).is_absolute():
        raise SystemExit(f"{source.get('source_id')}: local_hint must be a portable relative path")
    pdf_path = ROOT / local_hint
    if not pdf_path.exists():
        raise SystemExit(f"{source.get('source_id')}: source PDF not found at {local_hint}")
    expected_hash = source.get("sha256")
    if expected_hash and sha256_file(pdf_path) != expected_hash:
        raise SystemExit(f"{source.get('source_id')}: source PDF hash mismatch for {local_hint}")
    return pdf_path


def render_page(source: dict, pdf_path: Path, page: int, cache_root: Path, update_manifest: bool) -> Path:
    renderer = shutil.which("pdftoppm")
    if not renderer:
        raise SystemExit("pdftoppm is required to render source pages")
    source_id = source["source_id"]
    out_dir = cache_root / source_id
    out_dir.mkdir(parents=True, exist_ok=True)
    out_prefix = out_dir / f"page-{page:04d}"
    output_png = out_prefix.with_suffix(".png")
    contract = source.get("render_contract", {})
    dpi = str(contract.get("dpi", 300))
    command = [renderer, "-f", str(page), "-l", str(page), "-r", dpi, "-png", "-singlefile", str(pdf_path), str(out_prefix)]
    subprocess.run(command, cwd=ROOT, check=True)
    image_hash = sha256_file(output_png)

    if update_manifest:
        page_path = PAGE_DIR / f"{source_id}.json"
        page_doc = load_json(page_path)
        for record in page_doc.get("pages", []):
            if record.get("pdf_page") == page:
                record["work_state"] = "rendered"
                record.setdefault("render", {})
                record["render"].update({
                    "status": "rendered",
                    "cache_path": str(output_png.relative_to(ROOT)),
                    "image_sha256": image_hash,
                    "renderer": "pdftoppm",
                    "dpi": int(dpi),
                })
                break
        else:
            page_doc.setdefault("pages", []).append({
                "pdf_page": page,
                "printed_page_label": str(page),
                "source_revision_id": source["source_revision_id"],
                "work_state": "rendered",
                "contributes": None,
                "render": {
                    "status": "rendered",
                    "cache_path": str(output_png.relative_to(ROOT)),
                    "image_sha256": image_hash,
                    "renderer": "pdftoppm",
                    "dpi": int(dpi),
                },
                "extraction": None,
                "verification": None,
                "derived_facts": [],
            })
        save_json(page_path, page_doc)

    return output_png


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list-sources", action="store_true", help="List manifest source IDs and render states")
    parser.add_argument("--source-id", help="Source ID to render")
    parser.add_argument("--pages", help="Comma/range page list, e.g. 1,3-4")
    parser.add_argument("--cache-root", default=str(DEFAULT_CACHE.relative_to(ROOT)), help="Ignored cache root relative to repository")
    parser.add_argument("--update-manifest", action="store_true", help="Record rendered image metadata in page manifest")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    sources = manifest_sources()
    if args.list_sources:
        if not args.quiet:
            for source_id, source in sorted(sources.items()):
                print(f"{source_id}: {source.get('lifecycle_state')}")
        return 0

    if not args.source_id:
        parser.error("--source-id is required unless --list-sources is used")
    if args.source_id not in sources:
        raise SystemExit(f"unknown source_id: {args.source_id}")
    pages = parse_pages(args.pages)
    if not pages:
        raise SystemExit("--pages must name at least one page")

    source = sources[args.source_id]
    pdf_path = require_renderable(source)
    cache_root = ROOT / args.cache_root
    rendered = [render_page(source, pdf_path, page, cache_root, args.update_manifest) for page in pages]
    if not args.quiet:
        for path in rendered:
            print(path.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
