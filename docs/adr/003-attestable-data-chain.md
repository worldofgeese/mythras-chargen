# ADR-003: Attestable Data Chain

**Status:** accepted  
**Date:** 2026-05-02  
**Deciders:** Tao Hansen, Kypris  

## Context

Game data must trace to a verifiable source. This is both a licensing requirement (we're using copyrighted game material under fan-use policies) and a correctness requirement (OCR is noisy, LLM hallucination is real).

## Decision

Every data constant in the app must follow this attestation chain:

```
Source PDF/Book
  → pdftotext / OCR extraction
    → references/*.json (with page citation)
      → HTML data constant (CULTS_DATA, SKILLS_DATA, etc.)
```

### For Theist Miracles specifically:

```
Cult One-Pager PDFs (references/cults-upstream/*)
  → pdftotext extraction
    → references/theism-miracles.json (keyed by cult name, with rune tags)
      → CULTS_DATA[].miracles in index.html
```

### For House Rules (Hannu's casting model):

```
Discord conversation screenshots (docs/adr/artifacts/)
  → ADR-002 (documents the rules)
    → Implementation in index.html
```

### Rules

1. **No data without a reference file.** If it's not in `references/`, it doesn't go in the app.
2. **Page citations required.** Every reference JSON must cite source + page.
3. **House rules are artifacts.** Screenshots, conversation logs, and author confirmations are stored in `docs/adr/artifacts/` and cited in ADRs.
4. **OCR must be human-verified.** Noisy OCR output needs manual review before entering `references/`. The rune prefix codes in Spell Catalogues are particularly error-prone.
5. **No LLM hallucination.** If an extraction script can't confidently parse a value, it outputs `null` or `"UNVERIFIED"`, never a guess.

## Consequences

- New data requires an extraction script + reference JSON before implementation
- House rules require a saved artifact (screenshot, PDF, email) in `docs/adr/artifacts/`
- The extraction pipeline (`scripts/`) is part of the project, not throwaway
- CI/review can verify: "does every entry in CULTS_DATA have a matching reference?"

## Attestation

| Claim | Source |
|-------|--------|
| Pattern established | `CLAUDE.md` ("Attestable Chain Pattern" section) |
| Fan material policy | Chaosium Fan Material Policy, referenced in Cult One-Pager footers |
| TDM permission pending | `CLAUDE.md` ("Licensing Status" section) |
