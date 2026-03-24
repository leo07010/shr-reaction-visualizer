# SHR Data Quality Report
> Last updated: 2026-03-23 | Total entries: 644

## Quick Stats

| Issue | Count | % of Dataset |
|---|---|---|
| Identical SM and Product | 12 | 1.9% |
| Empty SMILES Product | 1 | 0.2% |
| Malformed SMILES fields | 7 | -- |
| All bond fields empty | 262 | 40.7% |
| Duplicate step numbers | 8 DOIs | -- |
| Non-numeric step labels | 1 DOI | -- |
| Template SMILES (`[R]`, etc.) | 486 fields | -- |
| Empty DOI | 112 | 17.4% |

---

## 1. Critical Errors (Must Fix)

### 1.1 Rendering Bugs (Reported by Team)

| # | Entry | Issue | Root Cause | Fix Needed |
|---|---|---|---|---|
| 1 | `ozonolysis` (Morgan), Step 1-2 | Broken rendering (horizontal lines + red O circle) | RDKit cannot render trioxolane ring (`COOO`) with dummy atom `[*]` in `[R]C1COOO1` | Replace `[R]` with a concrete substituent |
| 2 | Multiple entries (262, 40% of dataset) | Bond data appears mixed or excessive | Empty CSV bond data triggers MCS-based auto-detection, producing inaccurate results | Contributors must manually fill Formed/Broken bond fields |
| 3 | `Alder ene reaction` (Martina), Step 1, Row 21 | Incorrect bond counts -- Broken lists TWO `C=C` but SM has only ONE | Current: Broken=[C-H, C=C, **C=C**]; Expected: Broken=[C-H, C=C] | Remove duplicate `C=C` from `Broken 3` field |

### 1.2 Identical SM and Product

These entries have the same SMILES for starting material and product (no transformation recorded).

| Row | Paper DOI | Step |
|---|---|---|
| 0 | 10.1021/acs.orglett.4c03543 | 1 |
| 2 | 10.1021/acs.orglett.4c03543 | 3 |
| 414 | Allen-Millar-Trippett rearrangement | 2 |
| 449 | Hayashi-like Rearrangement with Aldehyde | 5 |
| 509 | https://pubs.acs.org/doi/full/10.1021/acs.joc.1c03012 | 3 |
| 536 | (empty) | 1 |
| 559 | (empty) | 2 |
| 574 | (empty) | 1 |
| 578 | (empty) | 1 |
| 597 | (empty) | 2 |
| 624 | https://pubs.acs.org/doi/10.1021/acs.orglett.8b03178 | 1 |
| 633 | Alkene Carboarylation...Smiles Rearrangement (Whalley 2019) | 2 |

### 1.3 Empty/Malformed SMILES

**Empty Product SMILES (1 entry):**

| Row | Paper DOI | Step | SMILES SM |
|---|---|---|---|
| 426 | Brook rearrangement | 3 | `[R]C([R])(O[Si](C)(C)C)[Li]` |

**Malformed SMILES -- contains `'` in `[R']` (7 fields):**

| Row | Paper DOI | Step | Field |
|---|---|---|---|
| 194 | Brown hydroboration | 1 | SM, Product |
| 195 | Brown hydroboration | 2 | SM, Product |
| 196 | Brown hydroboration | 3 | SM, Product |
| 197 | Brown hydroboration | 4 | SM |

---

## 2. Incorrect Bond Data (Must Fix)

### 2.1 Wrong Bond Counts

| Row | DOI | Step | Issue |
|---|---|---|---|
| 21 | Alder ene reaction | 1 | Broken lists duplicate `C=C` -- remove one from `Broken 3` |

### 2.2 Entries Missing ALL Bond Data

**262 entries (40%) have all 16 bond fields (Formed 1-8, Broken 1-8) empty.** Without this data, mechanistic steps cannot be visualized.

| DOI | Steps affected | Rows |
|---|---|---|
| (empty) | 1,2 x56, 3,4 x1 | 510-621 |
| 10.1021/acs.joc.0c01662 | 6 | 11 |
| Abramov Phosphonylation | 1,2 | 476,477 |
| Acyloin Condensation | 1-6 | 478-483 |
| Alkene Carboarylation...Smiles (Whalley 2019) | 1,2 | 632,633 |
| Allen-Millar-Trippett rearrangement | 1,2,3,1,2,3 | 392-394, 413-415 |
| Angew. Chem. Int. Ed. 2023, e202303668 | 1 | 437 |
| Bamberger rearrangement | 1,2,3 | 410-412 |
| Beckler-AdlerOxidation | 1,2,3 | 484-486 |
| BlumIttah aziridine synthesis | 5 | 111 |
| Boeckelhilde rearrangement | 1,2,3 | 416-418 |
| BouveaultBlanc reduction | 3,8,3,8 | 130,135,210,215 |
| Brandi-Guarna rearrangement | 1-5 | 419-423 |
| Brook rearrangement | 1,2 | 424,425 |
| CadoganSundberg indole synthesis | 5 | 262 |
| Chan rearrangement | 1,2,3 | 427-429 |
| Chem. Sci., 2018, 9, 58505854 | 1,1 | 409,440 |
| Claisen isoxazole synthesis | 3 | 329 |
| ConradLimpach reaction | 3 | 322 |
| Corey-Chaykovsky reaction | 1 | 355 |
| Curtius rearrangement photochemical | 2 | 380 |
| Eur. J. Org. Chem. 2014, 77497762 | 1,2,1 | 395,396,435 |
| Hayashi Rearrangement | 1-4 | 441-444 |
| Hayashi-like Rearrangement with Aldehyde | 1-6 | 445-450 |
| Hayashi-like Rearrangement with acid chloride | 1,2a-6a,2b-7b | 451-462 |
| J. Am. Chem. Soc., 2004, 126, 53585359. | 1,2,3,1 | 397-399,436 |
| JH-X-4-N | 1 | 402 |
| Morgan_Fragmentation_1 | 1 | 464 |
| Morgan_Fragmentation_2 | 2 | 465 |
| Morgan_Fragmentation_3 | 1 | 466 |
| Morgan_Fragmentation_4 | 2 | 467 |
| Morgan_fragmentation_4 | 1,2 | 470,471 |
| Morgan_fragmentation_4b | 1,2 | 472,473 |
| Morgan_fragmentation_5 | 1,2 | 474,475 |
| Nature Chemistry 2023, 15, 764772 | 1 | 438 |
| Org. Lett., 2004, 6, 8, 1221. | 1 | 463 |
| Smiles_base | 1,2 | 432,433 |
| TL1993,34,4233 | 1 | 404 |
| TL1993,34,4234 | 2 | 405 |
| TL1993,34,4235 | 3 | 406 |
| Tetrahedron1964,20,1695 | 1,2 | 407,408 |
| Ugi | 1,2 | 430,431 |
| Unknown Rearrangement | 1 | 434 |
| Wolff ring contraction | 1,2 | 400,401 |
| http://sciencedirect.com/.../S1386142517308715 | 1,2 | 636,637 |
| https://chemistry-europe.../ejoc.201900264 | 1 | 622 |
| https://chemistry-europe.../ejoc.201900265 | 2 | 623 |
| https://doi.org/10.1038/s44160-023-00408-1 | 1,1 | 403,439 |
| https://onlinelibrary.wiley.com/.../adsc.201800490 | 1 | 638 |
| https://onlinelibrary.wiley.com/.../adsc.201800491 | 2 | 639 |
| https://onlinelibrary.wiley.com/.../anie.200461210 | 1 | 500 |
| https://onlinelibrary.wiley.com/.../cber.19540870919 | 1 | 492 |
| https://onlinelibrary.wiley.com/.../hlca.19820650734 | 1 | 495 |
| https://onlinelibrary.wiley.com/abs/.../cber.189302602143 | 1 | 496 |
| https://onlinelibrary.wiley.com/.../anie.201608449 | 1 | 497 |
| https://pubs.acs.org/.../acs.orglett.8b03178 | 1 | 624 |
| https://pubs.acs.org/.../acs.orglett.8b03179 | 2 | 625 |
| https://pubs.acs.org/.../acscatal.8b02206 | 1 | 499 |
| https://pubs.acs.org/.../acsomega.9b02702 | 1 | 630 |
| https://pubs.acs.org/.../acsomega.9b02703 | 2 | 631 |
| https://pubs.acs.org/.../ja00768a055 | 1 | 487 |
| https://pubs.acs.org/.../ol100931q | 1 | 493 |
| https://pubs.acs.org/abs/.../acs.orglett.6b03789 | 1 | 498 |
| https://pubs.acs.org/abs/.../ja01057a040 | 1 | 489 |
| https://pubs.acs.org/abs/.../ja208617c | 1 | 503 |
| https://pubs.acs.org/abs/.../jacs.5b06939 | 1 | 504 |
| https://pubs.acs.org/abs/.../jacs.6b01428 | 1 | 490 |
| https://pubs.acs.org/abs/.../jacs.8b09685 | 1 | 502 |
| https://pubs.acs.org/abs/.../jo00046a018 | 1 | 491 |
| https://pubs.acs.org/.../acs.joc.1c03011 | 1,2 | 507,508 |
| https://pubs.acs.org/.../acs.joc.1c03012 | 3 | 509 |
| https://pubs.acs.org/.../acs.orglett.2c00875 | 1 | 505 |
| https://pubs.acs.org/.../acs.orglett.2c00876 | 2 | 506 |
| https://pubs.rsc.org/.../c2sc20669b | 1 | 501 |
| https://pubs.rsc.org/.../C8NJ03949F | 1,2 | 640,641 |
| https://www.ncbi.nlm.nih.gov/pubmed/23160003 | 1 | 494 |
| https://www.sciencedirect.com/.../S0040402018304472 | 1,2 | 634,635 |
| https://www.sciencedirect.com/.../S004040201930290X | 1,2 | 626,627 |
| https://www.sciencedirect.com/.../S0040403901897574 | 1 | 488 |
| https://www.thieme-connect.de/.../s-0037-1609338 | 1,2 | 642,643 |
| https://www.thieme-connect.de/.../s-0037-1612423 | 1 | 628 |
| https://www.thieme-connect.de/.../s-0037-1612424 | 2 | 629 |
| ozonolysis | 1,2 | 468,469 |

---

## 3. Step Numbering Issues

### 3.1 Duplicate Steps

| DOI | Duplicate steps | Occurrences |
|---|---|---|
| (empty) | 1, 2 | 55x each |
| BouveaultBlanc reduction | 1-9 | 2x each |
| Allen-Millar-Trippett rearrangement | 1, 2, 3 | 2x each |
| Curtius rearrangement photochemical | 1 | 2x |
| Eur. J. Org. Chem. 2014, 77497762 | 1 | 2x |
| J. Am. Chem. Soc., 2004, 126, 53585359. | 1 | 2x |
| https://doi.org/10.1038/s44160-023-00408-1 | 1 | 2x |
| Chem. Sci., 2018, 9, 58505854 | 1 | 2x |

No step gaps detected.

### 3.2 Non-Numeric Steps

**DOI: Hayashi-like Rearrangement with acid chloride**

| Row | Step |
|---|---|
| 452 | 2a |
| 453 | 3a |
| 454 | 4a |
| 455 | 5a |
| 456 | 6a |
| 457 | 2b |
| 458 | 3b |
| 459 | 4b |
| 460 | 5b |
| 461 | 6b |
| 462 | 7b |

---

## 4. Template SMILES (Info Only)

These entries use generic R-group placeholders (`[R]`, `[R1]`, `[R2]`, etc.) instead of concrete structures. Expected for named reaction templates but cannot be rendered as specific molecules. **Total: 486 SMILES fields.**

| DOI | Steps (fields affected) |
|---|---|
| Angew. Chem. Int. Ed. 2023, e202303668 | 1 (SM, Product) |
| Arndt-Eistert homologation | 1-8 (SM, Product) |
| Bamford-Stevens reaction | 1-2 (SM, Product) |
| Bamford-Stevens reaction, aprotic solvent | 1-3 (SM, Product) |
| Bamford-Stevens reaction, protic solvent | 1-3 (SM, Product) |
| Barbier reaction | 1-2 (SM, Product) |
| Bartoli indole synthesis | 1-7 (SM, Product) |
| Barton radical decarboxylation | 3-4 (SM, Product), 5 (SM) |
| BartonMcCombie deoxygenation | 3-5 (SM, Product) |
| BartonZard reaction | 1-6 (SM, Product) |
| Beckmann rearrangement in protic acid | 1-6 (SM, Product) |
| Beckmann rearrangement with PCl5 | 1-6 (SM, Product) |
| Bergman cyclization | 1-3 (SM, Product) |
| BischlerMohlau indole synthesis | 1-5 (SM, Product) |
| BischlerNapieralski reaction | 1-7 (SM, Product) |
| Blaise reaction | 1-3 (SM, Product) |
| BlumIttah aziridine synthesis | 1-8 (SM, Product) |
| Borch reductive amination | 1-3 (SM, Product) |
| Bouveault aldehyde synthesis | 1-3 (SM, Product) |
| Bouveault aldehyde synthesis, Comins modification | 3-4 (SM, Product) |
| BouveaultBlanc reduction | 1-9 (SM, Product x2) |
| Bradsher reaction | 1-5 (SM, Product) |
| Brandi-Guarna rearrangement | 1-5 (SM, Product) |
| Brook rearrangement | 1-2 (SM, Product), 3 (SM) |
| Brown hydroboration | 1-4 (SM, Product) |
| BuchererBergs reaction | 1-7 (SM, Product) |
| CadoganSundberg indole synthesis | 1-7 (SM, Product) |
| Camps quinoline synthesis pathway A | 1-3 (SM, Product) |
| Camps quinoline synthesis pathway B | 4-6 (SM, Product) |
| Cannizzaro reaction pathway A | 1-2 (SM, Product) |
| Cannizzaro reaction pathway B | 1-2 (SM, Product) |
| Carroll rearrangement | 4 (SM, Product) |
| Chan alkyne reduction | 1-3 (SM, Product) |
| Chan rearrangement | 1-3 (SM, Product) |
| Chem. Sci., 2018, 9, 58505854 | 1 (SM, Product x2) |
| Chichibabin pyridine synthesis | 1-13 (SM, Product) |
| Chugaev elimination | 1 (SM, Product) |
| Claisen condensation | 1-3 (SM, Product) |
| Claisen isoxazole synthesis | 1-5 (SM, Product) |
| Claisen rearrangements | 1 (SM, Product) |
| Combes quinoline synthesis | 1-11 (SM, Product) |
| Cope rearrangement | 1 (SM, Product) |
| Corey-Chaykovsky reaction | 2-3 (SM, Product) |
| Corey-Fuchs reaction | 4-7 (SM, Product) |
| CoreyKim oxidation | 3-5 (SM, Product) |
| CoreyWinter olefin synthesis | 1-8 (SM, Product) |
| Criegee glycol cleavage acyclic | 3 (Product) |
| Criegee glycol cleavage cyclic | 1-3 (SM, Product) |
| Curtius rearrangement photochemical | 1 (SM, Product x2), 2 (SM, Product) |
| Curtius rearrangement thermal | 1 (SM), 2-6 (SM, Product) |
| Hayashi Rearrangement | 1-4 (SM, Product) |
| Morgan_fragmentation_4 | 1-2 (SM, Product) |
| Smiles_base | 1-2 (SM, Product) |
| Tetrahedron1964,20,1695 | 1-2 (SM, Product) |
| Wolff ring contraction | 1-2 (SM, Product) |
| [1,2]-Brook rearrangement | 1-4 (SM, Product) |
| [1,3]-Brook rearrangement | 1-3 (SM, Product) |
| [1,4]-Brook rearrangement | 1-3 (SM, Product) |
| https://onlinelibrary.wiley.com/.../cber.19540870919 | 1 (SM, Product) |
| https://onlinelibrary.wiley.com/.../hlca.19820650734 | 1 (SM, Product) |
| https://onlinelibrary.wiley.com/abs/.../cber.189302602143 | 1 (SM, Product) |
| https://pubs.acs.org/.../ol100931q | 1 (SM, Product) |
| https://pubs.acs.org/abs/.../jacs.6b01428 | 1 (SM) |
| ozonolysis | 1 (SM, Product), 2 (SM) |

---

## 5. Empty DOI Entries

**112 entries** have a blank Paper DOI field, making them untraceable to a publication. These span rows 510-621 and cover steps 1-4 across 56 distinct reaction pairs. All 112 entries also lack bond data (included in Section 2.2 above).
