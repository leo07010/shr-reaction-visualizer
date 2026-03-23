# SHR Database — Data Quality Report

Generated: 2026-03-23

## Summary

| Metric | Count | % of 644 |
|--------|-------|----------|
| Total entries | 644 | 100% |
| Template SMILES (contains `[R]`, `[Ar]`, etc.) | ~167 | 26% |
| No bond data (Formed/Broken all empty) | 262 | 41% |
| SM == Product (identical SMILES) | 12 | 2% |
| Empty Product SMILES | 1 | <1% |

---

## Issues Requiring Manual Review

### 1. Template SMILES — Cannot Render as Molecules (~167 entries)

These entries contain placeholder atoms like `[R]`, `[Ar]`, `[X]`, `[M]` which RDKit cannot parse into a real molecular structure. They display as a "Template" text box instead of a molecule diagram.

**This is expected behavior** for generic reaction schemes, but the rendering looks broken to users (see ozonolysis screenshot). The app already handles this gracefully with a "Template" label and dashed border.

**Action needed**: None (by design). Consider adding a tooltip explaining "Template SMILES contain generic groups [R] that cannot be rendered as specific molecules."

### 2. SM == Product (Identical SMILES) — 12 entries

These entries have the exact same SMILES for Starting Material and Product, which means no reaction occurred or the data was entered incorrectly.

| Paper DOI | Step |
|-----------|------|
| 10.1021/acs.orglett.4c03543 | Step 1 |
| 10.1021/acs.orglett.4c03543 | Step 3 |
| Allen-Millar-Trippett rearrangement | Step 2 |
| Hayashi-like Rearrangement with Aldehyde | Step 5 |
| https://pubs.acs.org/doi/full/10.1021/acs.joc.1c03012 | Step 3 |
| (empty DOI) | Step 1 |
| (empty DOI) | Step 2 |
| (empty DOI) | Step 1 |
| (empty DOI) | Step 1 |
| (empty DOI) | Step 2 |
| https://pubs.acs.org/doi/10.1021/acs.orglett.8b03178 | Step 1 |
| Alkene Carboarylation... Whalley 2019 | Step 2 |

**Action needed**: Verify these entries and correct the Product SMILES if they should differ from SM.

### 3. Empty Product SMILES — 1 entry

| Paper DOI | Step |
|-----------|------|
| Brook rearrangement | Step 3 |

**Action needed**: Fill in the missing Product SMILES.

### 4. No Bond Data (Formed/Broken columns all empty) — 262 entries

These entries have no manually annotated bond changes (all `Formed 1-8` and `Broken 1-8` fields are empty). The system falls back to auto-detection (MCS or client-side comparison), which may be inaccurate.

Most of these are Morgan's entries (named reactions like Hayashi, Acyloin Condensation, etc.) which were entered without bond annotations.

**Action needed**: Add bond change annotations for accuracy, or verify that auto-detection produces correct results.

### 5. Entries with Empty DOI — several entries

Some entries have blank or non-standard DOI fields, making them hard to trace back to source publications.

**Action needed**: Add proper DOI references where possible.

---

## Bug: "ozonolysis" Display Issue (Screenshot)

The "ozonolysis" entry by Morgan shows:
- **Step 1 SM**: `C=C[R]` → Template (cannot render)
- **Step 1 Product**: `[R]C1COOO1` → Template (cannot render)
- **Step 2 SM**: `[R]C1COOO1` → Template (cannot render)
- **Step 2 Product**: `C=O` → Renders correctly as formaldehyde

The Product in the overview appears as broken horizontal lines + red "O" because:
- It's rendering `[R]C1COOO1` which partially parses (the O atoms render but the `[R]` part fails)
- This is a **data issue**, not a code bug — the SMILES contains `[R]` placeholder

**Action needed**: Either accept template rendering for generic reactions, or replace `[R]` with a specific substituent (e.g., `C` for methyl) for visualization purposes.
