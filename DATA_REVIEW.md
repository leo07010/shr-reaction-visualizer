# SHR Database — Data Quality Review

> Generated: 2026-03-18
> Total entries scanned: 644
> Issues found requiring manual review: 26 entries

---

## Overview

| Category | Count | Severity | Auto-handled? |
|----------|-------|----------|---------------|
| SM == Product with bond data | 2 | **Critical** | Display works but data is wrong |
| SM == Product without bond data | 10 | **High** | Display works but likely data error |
| Empty Product SMILES | 1 | **High** | Shows "No SMILES" placeholder |
| Invalid bond descriptor format | 1 | **Medium** | Silently skipped (no highlighting) |
| Missing Paper DOI | 112 | **Low** | Groups under "(no DOI)" in sidebar |
| Template SMILES with bond data | 209 | **Info** | Bond data exists but cannot highlight on [R]/[Ar] |
| Radical notation ([C], [N], [O]) | 177 | **Info** | RDKit may render or fall back to text display |

---

## Critical: SM == Product with Bond Data (2 entries)

These entries have bond change annotations (Formed/Broken) but the starting material and product SMILES are **identical**. This means bonds are annotated to change, yet the molecule doesn't transform — almost certainly a **copy-paste or data entry error**.

| idx | Paper DOI | Step | Entered By | Bond Data | Action |
|-----|-----------|------|------------|-----------|--------|
| 0 | 10.1021/acs.orglett.4c03543 | 1 | Martina | F1:C-N, B1:N-O | Fix Product SMILES from paper |
| 2 | 10.1021/acs.orglett.4c03543 | 3 | Martina | F1:O-C, B1:C-C | Fix Product SMILES from paper |

**How to fix:** Look up the paper at https://doi.org/10.1021/acs.orglett.4c03543 and correct the Product SMILES for Steps 1 and 3.

---

## High: SM == Product without Bond Data (10 entries)

These entries show **no transformation** (identical SM and Product) and have no bond change data. They may represent data entry errors where the Product SMILES was accidentally copied from SM.

| idx | Paper DOI | Step | Entered By | Action |
|-----|-----------|------|------------|--------|
| 414 | Allen-Millar-Trippett rearrangement | 2 | Andrei | Verify Product SMILES |
| 449 | Hayashi-like Rearrangement with Aldehyde | 5 | Morgan | Verify Product SMILES |
| 509 | https://pubs.acs.org/doi/full/10.1021/acs.joc.1c03012 | 3 | Chelsey | Verify Product SMILES |
| 536 | (no DOI) | 1 | Chelsey | Add DOI + fix Product SMILES |
| 559 | (no DOI) | 2 | Chelsey | Add DOI + fix Product SMILES |
| 574 | (no DOI) | 1 | Chelsey | Add DOI + fix Product SMILES |
| 578 | (no DOI) | 1 | Chelsey | Add DOI + fix Product SMILES |
| 597 | (no DOI) | 2 | Chelsey | Add DOI + fix Product SMILES |
| 624 | https://pubs.acs.org/doi/10.1021/acs.orglett.8b03178 | 1 | Chelsey | Verify Product SMILES |
| 633 | Alkene Carboarylation through Catalyst-Free... | 2 | Chelsey | Verify Product SMILES |

**How to fix:** For each entry, look up the original paper and correct the Product SMILES. Entries without DOI (idx 536, 559, 574, 578, 597) also need the Paper DOI added.

---

## High: Empty Product SMILES (1 entry)

| idx | Paper DOI | Step | Entered By | SM SMILES | Formed 1 |
|-----|-----------|------|------------|-----------|----------|
| 426 | Brook rearrangement | 3 | Andrei | `[R]C([R])(O[Si](C)(C)C)[Li]` | `[R]C([R])O` |

**Issues:**
1. Product SMILES is completely empty — the molecule cannot be displayed
2. The bond descriptor `[R]C([R])O` is not in standard `X-Y` format (e.g., `C-O`), so it won't be highlighted

**How to fix:** Add the correct Product SMILES for Brook rearrangement Step 3, and change the bond descriptor to standard format (e.g., `C-O` or `Si-O`).

---

## Low: Missing Paper DOI (112 entries)

All 112 entries without a DOI are from contributor **Chelsey** (idx 510–621). These entries are grouped under a blank DOI in the Visualizer sidebar, making them harder to navigate.

**How to fix:** Add the Paper DOI for each entry. These appear to be reaction entries with real SMILES data but missing literature references.

---

## Info: Template SMILES with Bond Data (209 entries)

These entries use placeholder SMILES (containing `[R]`, `[Ar]`, `[X]`, etc.) to represent **generic reaction mechanisms**. They have bond change data annotated, but since the SMILES contain placeholders, the system cannot:
- Render them as 2D molecular structures (shown as text "Template" cards instead)
- Highlight specific bond changes on the structure

This is **by design** — these are intentional generic mechanism entries. No action needed unless you want to add specific example molecules alongside the generic templates.

**Affected reactions include:** Arndt-Eistert homologation, Bamford-Stevens reaction, Barbier reaction, Bartoli indole synthesis, Barton radical decarboxylation, BartonMcCombie deoxygenation, BouveaultBlanc reduction, and many more named reactions.

---

## Info: Radical Notation (177 entries)

Entries containing bare atom brackets like `[C]`, `[N]`, `[O]` represent radical species or unusual valence states. RDKit **may or may not** parse these successfully:
- If RDKit parses them → rendered normally as 2D structures
- If RDKit fails → the system's 6-step fallback chain attempts alternative parsing
- If all parsing fails → displayed as formatted text with the SMILES string

No manual action needed — the display system handles these gracefully.

---

## Summary of Required Actions

### Must Fix (13 entries)
- [ ] **idx 0, 2**: Fix Product SMILES for DOI 10.1021/acs.orglett.4c03543 (Steps 1, 3)
- [ ] **idx 414**: Fix Product SMILES for Allen-Millar-Trippett rearrangement Step 2
- [ ] **idx 426**: Add Product SMILES and fix bond descriptor for Brook rearrangement Step 3
- [ ] **idx 449**: Fix Product SMILES for Hayashi-like Rearrangement Step 5
- [ ] **idx 509**: Fix Product SMILES for DOI 10.1021/acs.joc.1c03012 Step 3
- [ ] **idx 624**: Fix Product SMILES for DOI 10.1021/acs.orglett.8b03178 Step 1
- [ ] **idx 633**: Fix Product SMILES for Alkene Carboarylation Step 2
- [ ] **idx 536, 559, 574, 578, 597**: Fix Product SMILES + add Paper DOI (Chelsey's entries)

### Should Fix (112 entries)
- [ ] **idx 510–621**: Add Paper DOI for all Chelsey's entries

### No Action Needed
- Template SMILES (209 entries) — intentional, handled by system
- Radical notation (177 entries) — handled by fallback rendering
