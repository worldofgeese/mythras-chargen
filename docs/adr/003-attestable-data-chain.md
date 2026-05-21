# ADR-003: Attestable Data Chain

**Status:** accepted; amended by [ADR-008](008-vision-source-authority.md) for listed external-source committed data
**Date:** 2026-05-02
**Deciders:** Tao Hansen, Kypris

## Context

Game data must trace to a verifiable source. This is both a licensing requirement (we're using copyrighted game material under fan-use policies) and a correctness requirement (OCR is noisy, LLM hallucination is real).

> **2026-05-21 amendment:** [ADR-008](008-vision-source-authority.md) supersedes the `pdftotext / OCR extraction` authority model below for listed external-source committed data governed by the verified extraction plan: AiG, CSE, the current Waha one-pager, A Bird in the Hand, Monster Island, and later sources explicitly classified under ADR-008. For those sources, committed facts must be vision/page-verified; text-layer tools may be scratch aids only. ADR-003 remains the baseline source-to-reference-to-inline-chain decision and historical context for data not yet governed by ADR-008.

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


### ADR-008 amendment for governed external sources

For AiG, CSE, the current Waha one-pager, A Bird in the Hand, Monster Island, and later sources explicitly classified under ADR-008, rules 4 and 5 are tightened:

- `pdftotext`, OCR, pdfplumber, text-layer extraction, and table extraction are not committed evidence authority. They may be used only as scratch aids or comparison signals.
- Governed committed facts must be derived from rendered page/image evidence and independently verified before promotion into normalized `references/*.json` or inline `index.html` constants.
- Unresolved `UNVERIFIED` placeholders, OCR artifacts, garbled rune prefixes, and invalid missingness values are not acceptable in committed governed source data or app-facing facts.

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
