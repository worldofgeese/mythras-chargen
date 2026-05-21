#!/usr/bin/env python3
"""Validate the vision extraction/verification workflow and artifact shapes.

This script intentionally does not perform OCR or text extraction. It checks the
metadata needed to prove extractor/verifier independence.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / "references/sources/vision-workflow.json"
MANIFEST = ROOT / "references/sources/manifest.json"


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def validate_workflow(workflow: dict) -> list[str]:
    errors: list[str] = []
    if workflow.get("schemaVersion") != 1:
        errors.append("vision-workflow: schemaVersion must be 1")
    if not workflow.get("workflow_id"):
        errors.append("vision-workflow: workflow_id is required")
    extractor = workflow.get("extractor") or {}
    verifier = workflow.get("verifier") or {}
    if not extractor.get("prompt_id") or not extractor.get("prompt_version"):
        errors.append("vision-workflow: extractor prompt id/version required")
    if not verifier.get("prompt_id") or not verifier.get("prompt_version"):
        errors.append("vision-workflow: verifier prompt id/version required")
    forbidden = set(verifier.get("forbidden_inputs") or [])
    for required in {"extractor output", "extractor scratchpad", "extractor rationale", "same run id as extractor"}:
        if required not in forbidden:
            errors.append(f"vision-workflow: verifier must forbid {required}")
    committed_forbidden = set((workflow.get("committed_boundaries") or {}).get("forbidden") or [])
    if "full-page copyrighted transcription" not in committed_forbidden:
        errors.append("vision-workflow: committed boundaries must forbid full-page copyrighted transcription")
    return errors


def validate_artifact(artifact: dict, workflow: dict, sources: dict[str, dict]) -> list[str]:
    errors: list[str] = []
    source_id = artifact.get("source_id")
    source = sources.get(source_id)
    label = artifact.get("artifact_id") or "artifact"
    if not source:
        errors.append(f"{label}: unknown source_id {source_id}")
        return errors
    if artifact.get("workflow_id") != workflow.get("workflow_id"):
        errors.append(f"{label}: workflow_id mismatch")
    if artifact.get("source_revision_id") != source.get("source_revision_id"):
        errors.append(f"{label}: source_revision_id mismatch")
    if not isinstance(artifact.get("pdf_page"), int) or artifact.get("pdf_page") <= 0:
        errors.append(f"{label}: pdf_page must be positive integer")
    kind = artifact.get("artifact_kind")
    if kind == "verification":
        independence = artifact.get("independence") or {}
        if artifact.get("verifier_run_id") == artifact.get("extractor_run_id"):
            errors.append(f"{label}: verifier_run_id must differ from extractor_run_id")
        if artifact.get("verifier_prompt_id") == artifact.get("extractor_prompt_id"):
            errors.append(f"{label}: verifier_prompt_id must differ from extractor_prompt_id")
        if independence.get("read_extractor_output") is not False:
            errors.append(f"{label}: verifier must attest it did not read extractor output")
        if independence.get("read_extractor_scratch") is not False:
            errors.append(f"{label}: verifier must attest it did not read extractor scratch")
    elif kind == "extraction":
        if not artifact.get("extractor_prompt_id") or not artifact.get("extractor_run_id"):
            errors.append(f"{label}: extraction artifact requires extractor prompt/run ids")
    else:
        errors.append(f"{label}: artifact_kind must be extraction or verification")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--validate-workflow", action="store_true", help="Validate references/sources/vision-workflow.json")
    parser.add_argument("--artifact", help="Optional extraction/verification artifact JSON to validate")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    workflow = load_json(WORKFLOW)
    errors = validate_workflow(workflow)
    if args.artifact:
        manifest = load_json(MANIFEST)
        sources = {source["source_id"]: source for source in manifest.get("sources", [])}
        artifact_path = Path(args.artifact)
        if not artifact_path.is_absolute():
            artifact_path = ROOT / artifact_path
        errors.extend(validate_artifact(load_json(artifact_path), workflow, sources))

    if errors:
        print("Vision workflow validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    if not args.quiet:
        print("Vision workflow validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
