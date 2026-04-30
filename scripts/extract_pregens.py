#!/usr/bin/env python3
"""Extract character data from Mythras PDF character sheets into fixture JSON."""
import json, sys, os
sys.path.insert(0, '/nix/store/gxxrxzw94h0nvhnf0hcaydazvzwc4j1p-mupdf-1.27.2/lib/python3.13/site-packages')
sys.path.insert(0, '/nix/store/zdx8cfvphbbmxk6y7s9bkpvbpz4g31id-python3.13-pymupdf-1.27.2.2/lib/python3.13/site-packages')
import pymupdf

PDF_DIR = '/tmp/mythras-chargen/pregens-pdf'
OUT_DIR = '/tmp/mythras-chargen/pregens-extracted'
os.makedirs(OUT_DIR, exist_ok=True)

def extract_form_fields(pdf_path):
    """Extract form field data from PDF."""
    doc = pymupdf.open(pdf_path)
    fields = {}
    for page_num in range(len(doc)):
        page = doc[page_num]
        for widget in page.widgets():
            if widget.field_name and widget.field_value:
                fields[widget.field_name] = widget.field_value
    return fields

def extract_text_pages(pdf_path):
    """Extract raw text from all pages."""
    doc = pymupdf.open(pdf_path)
    pages = []
    for i in range(len(doc)):
        pages.append(doc[i].get_text())
    return pages

for fname in sorted(os.listdir(PDF_DIR)):
    if not fname.endswith('.pdf'):
        continue
    name = fname.replace('-mythras-sheet.pdf', '')
    pdf_path = os.path.join(PDF_DIR, fname)
    
    print(f"\n=== {name.upper()} ===")
    
    # Try form fields first
    fields = extract_form_fields(pdf_path)
    if fields:
        print(f"  Form fields: {len(fields)}")
        out_path = os.path.join(OUT_DIR, f'{name}-fields.json')
        with open(out_path, 'w') as f:
            json.dump(fields, f, indent=2)
        print(f"  → {out_path}")
    else:
        print("  No form fields found")
    
    # Also extract text
    pages = extract_text_pages(pdf_path)
    out_path = os.path.join(OUT_DIR, f'{name}-text.txt')
    with open(out_path, 'w') as f:
        for i, page in enumerate(pages):
            f.write(f"--- PAGE {i+1} ---\n{page}\n")
    print(f"  Text pages: {len(pages)} → {out_path}")

print(f"\nDone! Check {OUT_DIR}/")
