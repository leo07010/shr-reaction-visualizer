# Data Quality Issues Report
Generated: 2026-03-23

## Known Rendering Bugs (Reported by Yuma)

### Bug 1: Broken molecule rendering (horizontal lines + red O circle)
- **Affected**: `ozonolysis` (Morgan), Step 1-2
- **SMILES**: `[R]C1COOO1` (trioxolane with R-group placeholder)
- **Cause**: RDKit cannot render the trioxolane ring (COOO) with dummy atom `[*]`. The three consecutive oxygens in a ring create valence issues.
- **Fix needed**: Morgan needs to provide a concrete SMILES with a real substituent (e.g. replace `[R]` with `C` or a specific group).

### Bug 2: Bond forming/breaking data appears mixed or excessive
- **Affected**: Multiple entries where ALL Formed/Broken fields are empty (262 entries, 40% of dataset)
- **Cause**: When CSV bond data is empty, the system falls back to MCS-based auto-detection which can produce inaccurate or excessive results for complex molecules.
- **Fix needed**: Contributors need to manually fill in the Formed/Broken bond fields for their entries.

---

## Summary

| Issue Type | Count |
|---|---|
| Identical SM and Product (same SMILES) | 12 entries |
| Empty SMILES Product | 1 entries |
| Malformed SMILES (non-standard characters) | 7 fields |
| All bond fields empty | 262 entries |
| DOIs with duplicate step numbers | 8 DOIs |
| DOIs with non-numeric step numbers | 1 DOIs |
| DOIs with step gaps | 0 DOIs |
| Template SMILES ([R], [R1], etc.) | 486 fields across entries |
| Empty DOI | 112 entries |
| **Total entries in dataset** | **644** |

## Priority 1: Critical Data Errors

### Identical SM and Product (same SMILES)

These entries have the exact same SMILES string for both starting material and product, meaning no chemical transformation is recorded.

| Row | Paper DOI | Step | Duplicated SMILES |
|---|---|---|---|
| 0 | 10.1021/acs.orglett.4c03543 | 1 | `O=C([CH-][S+](C)C)C1=CC=CC=C1.O=NC2=CC=CC=C2` |
| 2 | 10.1021/acs.orglett.4c03543 | 3 | `O=C([CH+]N([O-])C1=CC=CC=C1)C2=CC=CC=C2.C[S+](C=C=C)C.[Br-]` |
| 414 | Allen-Millar-Trippett rearrangement | 2 | `CC1=CP(C2=CC=CC=C2)(C(C3=CC=CC=C3)=O)(O)C=C1C` |
| 449 | Hayashi-like Rearrangement with Aldehyde | 5 | `COC1=CC=C(C2=C([H])OC(N2)C3=CC=CC=C3)C=C1` |
| 509 | https://pubs.acs.org/doi/full/10.1021/acs.joc.1c03012 | 3 | `[N-]=C(OC1=C([N+]([O-])=O)C=CC=C1)C2=CC=CC=C2.C` |
| 536 | (empty) | 1 | `O=C([C](CS(C1=CC=CC=C1)(=O)=O)C)N(C2=CC=CC=C2)S(C3=CC=C(C)C=C3)=O` |
| 559 | (empty) | 2 | `FC1=C(OC2(N=C[CH-]C=N2)S1(=O)=O)C3=CC=CC=C3` |
| 574 | (empty) | 1 | `OC(C1=NC2=C(C=CC=C2)S1)(C)C3=CC=CC=C3[N]S(C4=CC=C(C)C=C4)(=O)=O` |
| 578 | (empty) | 1 | `BrC1=C(C([O-])=C=C(C2=CC=CC=C2)N(S(=O)(C3=CC=CC=C3)=O)C4=CC=CC=C4)C=CC=C1` |
| 597 | (empty) | 2 | `N[C]1C=CC2(S(NC3=[N+]2C(C)=CC(C)=N3)(=O)=O)C=C1` |
| 624 | https://pubs.acs.org/doi/10.1021/acs.orglett.8b03178 | 1 | `O=C([N]C)C(C=CC=C1)=C1OC2=CC=CC=C2` |
| 633 | Alkene Carboarylation through Catalyst?Free, Visible Light?Mediated Smiles Rearrangement - Whalley - 2019 - Chemistry  A European Journal - Wiley Online Library | 2 | `CCOC(C(F)(F)CC1CN(S(C21C=C[C](C)C=C2)(=O)=O)C(C)=O)=O` |

### Empty SMILES Product

These entries have no product SMILES at all.

| Row | Paper DOI | Step | SMILES SM |
|---|---|---|---|
| 426 | Brook rearrangement | 3 | `[R]C([R])(O[Si](C)(C)C)[Li]` |

### Malformed SMILES

These entries contain characters not typically valid in SMILES notation (e.g., apostrophes `'` in `[R']`).

| Row | Paper DOI | Step | Field | Problematic SMILES |
|---|---|---|---|---|
| 194 | Brown hydroboration | 1 | SMILES SM | `[R]C=C.[H]B([R'])[R']` |
| 194 | Brown hydroboration | 1 | SMILES Product | `[R]C([H])CB([R'])[R']` |
| 195 | Brown hydroboration | 2 | SMILES SM | `[R]C([H])CB([R'])[R'].[O-]O` |
| 195 | Brown hydroboration | 2 | SMILES Product | `[R]C([H])C[B-]([R'])([R'])OO` |
| 196 | Brown hydroboration | 3 | SMILES SM | `[R]C([H])C[B-]([R'])([R'])OO` |
| 196 | Brown hydroboration | 3 | SMILES Product | `[R]CCOB([R'])[R'].[OH-]` |
| 197 | Brown hydroboration | 4 | SMILES SM | `[R]CCOB([OR'])[OR'].[OH-]` |

## Priority 2: Missing Mechanistic Data

### Entries with ALL bond fields empty

These entries have no Formed/Broken bond data in any of the 16 bond fields (Formed 1-8, Broken 1-8). Without this data, the mechanistic step cannot be visualized.

**Total: 262 entries out of 644 (40%)**

#### DOI: (empty DOI)
- Steps with no bond data: 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 3, 4, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2
- Rows: 510, 511, 512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541, 542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558, 559, 560, 561, 562, 563, 564, 565, 566, 567, 568, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 579, 580, 581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597, 598, 599, 600, 601, 602, 603, 604, 605, 606, 607, 608, 609, 610, 611, 612, 613, 614, 615, 616, 617, 618, 619, 620, 621

#### DOI: 10.1021/acs.joc.0c01662  
- Steps with no bond data: 6
- Rows: 11

#### DOI: Abramov Phosphonylation
- Steps with no bond data: 1, 2
- Rows: 476, 477

#### DOI: Acyloin Condensation
- Steps with no bond data: 1, 2, 3, 4, 5, 6
- Rows: 478, 479, 480, 481, 482, 483

#### DOI: Alkene Carboarylation through Catalyst?Free, Visible Light?Mediated Smiles Rearrangement - Whalley - 2019 - Chemistry  A European Journal - Wiley Online Library
- Steps with no bond data: 1, 2
- Rows: 632, 633

#### DOI: Allen-Millar-Trippett rearrangement
- Steps with no bond data: 1, 2, 3, 1, 2, 3
- Rows: 392, 393, 394, 413, 414, 415

#### DOI: Angew. Chem. Int. Ed. 2023, e202303668
- Steps with no bond data: 1
- Rows: 437

#### DOI: Bamberger rearrangement
- Steps with no bond data: 1, 2, 3
- Rows: 410, 411, 412

#### DOI: Beckler-AdlerOxidation
- Steps with no bond data: 1, 2, 3
- Rows: 484, 485, 486

#### DOI: BlumIttah aziridine synthesis
- Steps with no bond data: 5
- Rows: 111

#### DOI: Boeckelhilde rearrangement
- Steps with no bond data: 1, 2, 3
- Rows: 416, 417, 418

#### DOI: BouveaultBlanc reduction
- Steps with no bond data: 3, 8, 3, 8
- Rows: 130, 135, 210, 215

#### DOI: Brandi-Guarna rearrangement
- Steps with no bond data: 1, 2, 3, 4, 5
- Rows: 419, 420, 421, 422, 423

#### DOI: Brook rearrangement
- Steps with no bond data: 1, 2
- Rows: 424, 425

#### DOI: CadoganSundberg indole synthesis
- Steps with no bond data: 5
- Rows: 262

#### DOI: Chan rearrangement
- Steps with no bond data: 1, 2, 3
- Rows: 427, 428, 429

#### DOI: Chem. Sci., 2018, 9, 58505854
- Steps with no bond data: 1, 1
- Rows: 409, 440

#### DOI: Claisen isoxazole synthesis
- Steps with no bond data: 3
- Rows: 329

#### DOI: ConradLimpach reaction
- Steps with no bond data: 3
- Rows: 322

#### DOI: Corey-Chaykovsky reaction
- Steps with no bond data: 1
- Rows: 355

#### DOI: Curtius rearrangement photochemical
- Steps with no bond data: 2
- Rows: 380

#### DOI: Eur. J. Org. Chem. 2014, 77497762
- Steps with no bond data: 1, 2, 1
- Rows: 395, 396, 435

#### DOI: Hayashi Rearrangement
- Steps with no bond data: 1, 2, 3, 4
- Rows: 441, 442, 443, 444

#### DOI: Hayashi-like Rearrangement with Aldehyde
- Steps with no bond data: 1, 2, 3, 4, 5, 6
- Rows: 445, 446, 447, 448, 449, 450

#### DOI: Hayashi-like Rearrangement with acid chloride
- Steps with no bond data: 1, 2a, 3a, 4a, 5a, 6a, 2b, 3b, 4b, 5b, 6b, 7b
- Rows: 451, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461, 462

#### DOI: J. Am. Chem. Soc., 2004, 126, 53585359.
- Steps with no bond data: 1, 2, 3, 1
- Rows: 397, 398, 399, 436

#### DOI: JH-X-4-N
- Steps with no bond data: 1
- Rows: 402

#### DOI: Morgan_Fragmentation_1
- Steps with no bond data: 1
- Rows: 464

#### DOI: Morgan_Fragmentation_2
- Steps with no bond data: 2
- Rows: 465

#### DOI: Morgan_Fragmentation_3
- Steps with no bond data: 1
- Rows: 466

#### DOI: Morgan_Fragmentation_4
- Steps with no bond data: 2
- Rows: 467

#### DOI: Morgan_fragmentation_4
- Steps with no bond data: 1, 2
- Rows: 470, 471

#### DOI: Morgan_fragmentation_4b
- Steps with no bond data: 1, 2
- Rows: 472, 473

#### DOI: Morgan_fragmentation_5
- Steps with no bond data: 1, 2
- Rows: 474, 475

#### DOI: Nature Chemistry 2023, 15, 764772
- Steps with no bond data: 1
- Rows: 438

#### DOI: Org. Lett., 2004, 6, 8, 1221.
- Steps with no bond data: 1
- Rows: 463

#### DOI: Smiles_base
- Steps with no bond data: 1, 2
- Rows: 432, 433

#### DOI: TL1993,34,4233
- Steps with no bond data: 1
- Rows: 404

#### DOI: TL1993,34,4234
- Steps with no bond data: 2
- Rows: 405

#### DOI: TL1993,34,4235
- Steps with no bond data: 3
- Rows: 406

#### DOI: Tetrahedron1964,20,1695
- Steps with no bond data: 1, 2
- Rows: 407, 408

#### DOI: Ugi
- Steps with no bond data: 1, 2
- Rows: 430, 431

#### DOI: Unknown Rearrangement
- Steps with no bond data: 1
- Rows: 434

#### DOI: Wolff ring contraction
- Steps with no bond data: 1, 2
- Rows: 400, 401

#### DOI: http://sciencedirect.com/science/article/pii/S1386142517308715?via%3Dihub
- Steps with no bond data: 1, 2
- Rows: 636, 637

#### DOI: https://chemistry-europe.onlinelibrary.wiley.com/doi/10.1002/ejoc.201900264
- Steps with no bond data: 1
- Rows: 622

#### DOI: https://chemistry-europe.onlinelibrary.wiley.com/doi/10.1002/ejoc.201900265
- Steps with no bond data: 2
- Rows: 623

#### DOI: https://doi.org/10.1038/s44160-023-00408-1
- Steps with no bond data: 1, 1
- Rows: 403, 439

#### DOI: https://onlinelibrary.wiley.com/doi/10.1002/adsc.201800490
- Steps with no bond data: 1
- Rows: 638

#### DOI: https://onlinelibrary.wiley.com/doi/10.1002/adsc.201800491
- Steps with no bond data: 2
- Rows: 639

#### DOI: https://onlinelibrary.wiley.com/doi/10.1002/anie.200461210
- Steps with no bond data: 1
- Rows: 500

#### DOI: https://onlinelibrary.wiley.com/doi/10.1002/cber.19540870919
- Steps with no bond data: 1
- Rows: 492

#### DOI: https://onlinelibrary.wiley.com/doi/10.1002/hlca.19820650734
- Steps with no bond data: 1
- Rows: 495

#### DOI: https://onlinelibrary.wiley.com/doi/abs/10.1002/cber.189302602143
- Steps with no bond data: 1
- Rows: 496

#### DOI: https://onlinelibrary.wiley.com/doi/full/10.1002/anie.201608449
- Steps with no bond data: 1
- Rows: 497

#### DOI: https://pubs.acs.org/doi/10.1021/acs.orglett.8b03178
- Steps with no bond data: 1
- Rows: 624

#### DOI: https://pubs.acs.org/doi/10.1021/acs.orglett.8b03179
- Steps with no bond data: 2
- Rows: 625

#### DOI: https://pubs.acs.org/doi/10.1021/acscatal.8b02206
- Steps with no bond data: 1
- Rows: 499

#### DOI: https://pubs.acs.org/doi/10.1021/acsomega.9b02702
- Steps with no bond data: 1
- Rows: 630

#### DOI: https://pubs.acs.org/doi/10.1021/acsomega.9b02703
- Steps with no bond data: 2
- Rows: 631

#### DOI: https://pubs.acs.org/doi/10.1021/ja00768a055
- Steps with no bond data: 1
- Rows: 487

#### DOI: https://pubs.acs.org/doi/10.1021/ol100931q
- Steps with no bond data: 1
- Rows: 493

#### DOI: https://pubs.acs.org/doi/abs/10.1021/acs.orglett.6b03789
- Steps with no bond data: 1
- Rows: 498

#### DOI: https://pubs.acs.org/doi/abs/10.1021/ja01057a040
- Steps with no bond data: 1
- Rows: 489

#### DOI: https://pubs.acs.org/doi/abs/10.1021/ja208617c
- Steps with no bond data: 1
- Rows: 503

#### DOI: https://pubs.acs.org/doi/abs/10.1021/jacs.5b06939
- Steps with no bond data: 1
- Rows: 504

#### DOI: https://pubs.acs.org/doi/abs/10.1021/jacs.6b01428
- Steps with no bond data: 1
- Rows: 490

#### DOI: https://pubs.acs.org/doi/abs/10.1021/jacs.8b09685
- Steps with no bond data: 1
- Rows: 502

#### DOI: https://pubs.acs.org/doi/abs/10.1021/jo00046a018
- Steps with no bond data: 1
- Rows: 491

#### DOI: https://pubs.acs.org/doi/full/10.1021/acs.joc.1c03011
- Steps with no bond data: 1, 2
- Rows: 507, 508

#### DOI: https://pubs.acs.org/doi/full/10.1021/acs.joc.1c03012
- Steps with no bond data: 3
- Rows: 509

#### DOI: https://pubs.acs.org/doi/full/10.1021/acs.orglett.2c00875
- Steps with no bond data: 1
- Rows: 505

#### DOI: https://pubs.acs.org/doi/full/10.1021/acs.orglett.2c00876
- Steps with no bond data: 2
- Rows: 506

#### DOI: https://pubs.rsc.org/en/content/articlelanding/2012/sc/c2sc20669b#!divAb stract
- Steps with no bond data: 1
- Rows: 501

#### DOI: https://pubs.rsc.org/en/content/articlelanding/2018/NJ/C8NJ03949F
- Steps with no bond data: 1, 2
- Rows: 640, 641

#### DOI: https://www.ncbi.nlm.nih.gov/pubmed/23160003
- Steps with no bond data: 1
- Rows: 494

#### DOI: https://www.sciencedirect.com/science/article/pii/S0040402018304472?via%3Dihub
- Steps with no bond data: 1, 2
- Rows: 634, 635

#### DOI: https://www.sciencedirect.com/science/article/pii/S004040201930290X?via%3Dihub
- Steps with no bond data: 1, 2
- Rows: 626, 627

#### DOI: https://www.sciencedirect.com/science/article/pii/S0040403901897574
- Steps with no bond data: 1
- Rows: 488

#### DOI: https://www.thieme-connect.de/products/ejournals/abstract/10.1055/s-0037-1609338
- Steps with no bond data: 1, 2
- Rows: 642, 643

#### DOI: https://www.thieme-connect.de/products/ejournals/abstract/10.1055/s-0037-1612423
- Steps with no bond data: 1
- Rows: 628

#### DOI: https://www.thieme-connect.de/products/ejournals/abstract/10.1055/s-0037-1612424
- Steps with no bond data: 2
- Rows: 629

#### DOI: ozonolysis
- Steps with no bond data: 1, 2
- Rows: 468, 469

## Priority 3: Step Numbering Issues

### Duplicate step numbers

These DOIs have the same step number appearing more than once, suggesting either duplicate data entry or missing disambiguation.

#### DOI: BouveaultBlanc reduction
- Step `1` appears **2 times**
- Step `2` appears **2 times**
- Step `3` appears **2 times**
- Step `4` appears **2 times**
- Step `5` appears **2 times**
- Step `6` appears **2 times**
- Step `7` appears **2 times**
- Step `8` appears **2 times**
- Step `9` appears **2 times**

#### DOI: Curtius rearrangement photochemical
- Step `1` appears **2 times**

#### DOI: Allen-Millar-Trippett rearrangement
- Step `1` appears **2 times**
- Step `2` appears **2 times**
- Step `3` appears **2 times**

#### DOI: Eur. J. Org. Chem. 2014, 77497762
- Step `1` appears **2 times**

#### DOI: J. Am. Chem. Soc., 2004, 126, 53585359.
- Step `1` appears **2 times**

#### DOI: https://doi.org/10.1038/s44160-023-00408-1
- Step `1` appears **2 times**

#### DOI: Chem. Sci., 2018, 9, 58505854
- Step `1` appears **2 times**

#### DOI: (empty DOI)
- Step `1` appears **55 times**
- Step `2` appears **55 times**

### Missing steps (gaps)

No step gaps detected (all DOIs with numeric steps have contiguous sequences).

### Non-numeric steps

These entries use step labels that are not plain integers, which may cause sorting/ordering issues.

#### DOI: Hayashi-like Rearrangement with acid chloride

| Row | Step Value |
|---|---|
| 452 | `2a` |
| 453 | `3a` |
| 454 | `4a` |
| 455 | `5a` |
| 456 | `6a` |
| 457 | `2b` |
| 458 | `3b` |
| 459 | `4b` |
| 460 | `5b` |
| 461 | `6b` |
| 462 | `7b` |

## Priority 4: Template SMILES (Expected but Cannot Render)

### Entries using [R], [R1], [R2], etc.

These entries use generic R-group placeholders instead of concrete molecular structures. While valid for representing general reaction classes, they cannot be rendered as specific molecules in a visualizer.

**Total: 486 SMILES fields across multiple entries**

#### DOI: Angew. Chem. Int. Ed. 2023, e202303668
- Step 1: SMILES SM, SMILES Product

#### DOI: Arndt-Eistert homologation
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product
- Step 7: SMILES SM, SMILES Product
- Step 8: SMILES SM, SMILES Product

#### DOI: Bamford-Stevens reaction
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product

#### DOI: Bamford-Stevens reaction, aprotic solvent
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: Bamford-Stevens reaction, protic solvent
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: Barbier reaction
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product

#### DOI: Bartoli indole synthesis
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product
- Step 7: SMILES SM, SMILES Product

#### DOI: Barton radical decarboxylation
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM

#### DOI: BartonMcCombie deoxygenation
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product

#### DOI: BartonZard reaction
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product

#### DOI: Beckmann rearrangement in protic acid
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product

#### DOI: Beckmann rearrangement with PCl5
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product

#### DOI: Bergman cyclization
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: BischlerMöhlau indole synthesis
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product

#### DOI: BischlerNapieralski reaction
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product
- Step 7: SMILES SM, SMILES Product

#### DOI: Blaise reaction
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: BlumIttah aziridine synthesis
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product
- Step 7: SMILES SM, SMILES Product
- Step 8: SMILES SM, SMILES Product

#### DOI: Borch reductive amination
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: Bouveault aldehyde synthesis
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: Bouveault aldehyde synthesis, Comins modification
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product

#### DOI: BouveaultBlanc reduction
- Step 1: SMILES SM, SMILES Product, SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product, SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product, SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product, SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product, SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product, SMILES SM, SMILES Product
- Step 7: SMILES SM, SMILES Product, SMILES SM, SMILES Product
- Step 8: SMILES SM, SMILES Product, SMILES SM, SMILES Product
- Step 9: SMILES SM, SMILES Product, SMILES SM, SMILES Product

#### DOI: Bradsher reaction
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product

#### DOI: Brandi-Guarna rearrangement
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product

#### DOI: Brook rearrangement
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM

#### DOI: Brown hydroboration
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product

#### DOI: BuchererBergs reaction
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product
- Step 7: SMILES SM, SMILES Product

#### DOI: CadoganSundberg indole synthesis
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product
- Step 7: SMILES SM, SMILES Product

#### DOI: Camps quinoline synthesis pathway A
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: Camps quinoline synthesis pathway B
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product

#### DOI: Cannizzaro reaction pathway A
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product

#### DOI: Cannizzaro reaction pathway B
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product

#### DOI: Carroll rearrangement
- Step 4: SMILES SM, SMILES Product

#### DOI: Chan alkyne reduction
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: Chan rearrangement
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: Chem. Sci., 2018, 9, 58505854
- Step 1: SMILES SM, SMILES Product, SMILES SM, SMILES Product

#### DOI: Chichibabin pyridine synthesis
- Step 1: SMILES SM, SMILES Product
- Step 10: SMILES SM, SMILES Product
- Step 11: SMILES SM, SMILES Product
- Step 12: SMILES SM, SMILES Product
- Step 13: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product
- Step 7: SMILES SM, SMILES Product
- Step 8: SMILES SM, SMILES Product
- Step 9: SMILES SM, SMILES Product

#### DOI: Chugaev elimination
- Step 1: SMILES SM, SMILES Product

#### DOI: Claisen condensation
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: Claisen isoxazole synthesis
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product

#### DOI: Claisen rearrangements
- Step 1: SMILES SM, SMILES Product

#### DOI: Combes quinoline synthesis
- Step 1: SMILES SM, SMILES Product
- Step 10: SMILES SM, SMILES Product
- Step 11: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product
- Step 7: SMILES SM, SMILES Product
- Step 8: SMILES SM, SMILES Product
- Step 9: SMILES SM, SMILES Product

#### DOI: Cope rearrangement
- Step 1: SMILES SM, SMILES Product

#### DOI: Corey-Chaykovsky reaction
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: Corey-Fuchs reaction
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product
- Step 7: SMILES SM, SMILES Product

#### DOI: CoreyKim oxidation
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product

#### DOI: CoreyWinter olefin synthesis
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product
- Step 7: SMILES SM, SMILES Product
- Step 8: SMILES SM, SMILES Product

#### DOI: Criegee glycol cleavage acyclic
- Step 3: SMILES Product

#### DOI: Criegee glycol cleavage cyclic
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: Curtius rearrangement photochemical
- Step 1: SMILES SM, SMILES Product, SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product

#### DOI: Curtius rearrangement thermal
- Step 1: SMILES SM
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product
- Step 5: SMILES SM, SMILES Product
- Step 6: SMILES SM, SMILES Product

#### DOI: Hayashi Rearrangement
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product

#### DOI: Morgan_fragmentation_4
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product

#### DOI: Smiles_base
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product

#### DOI: Tetrahedron1964,20,1695
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product

#### DOI: Wolff ring contraction
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product

#### DOI: [1,2]-Brook rearrangement
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product
- Step 4: SMILES SM, SMILES Product

#### DOI: [1,3]-Brook rearrangement
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: [1,4]-Brook rearrangement
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM, SMILES Product
- Step 3: SMILES SM, SMILES Product

#### DOI: https://onlinelibrary.wiley.com/doi/10.1002/cber.19540870919
- Step 1: SMILES SM, SMILES Product

#### DOI: https://onlinelibrary.wiley.com/doi/10.1002/hlca.19820650734
- Step 1: SMILES SM, SMILES Product

#### DOI: https://onlinelibrary.wiley.com/doi/abs/10.1002/cber.189302602143
- Step 1: SMILES SM, SMILES Product

#### DOI: https://pubs.acs.org/doi/10.1021/ol100931q
- Step 1: SMILES SM, SMILES Product

#### DOI: https://pubs.acs.org/doi/abs/10.1021/jacs.6b01428
- Step 1: SMILES SM

#### DOI: ozonolysis
- Step 1: SMILES SM, SMILES Product
- Step 2: SMILES SM

## Priority 5: Empty DOI Group

These entries have a blank/empty Paper DOI field, making it impossible to trace the data back to a publication.

**Total: 112 entries**

| Row | Step | SMILES SM (truncated) | SMILES Product (truncated) |
|---|---|---|---|
| 510 | 1 | `O=S(C1=CC(C#CC2=CC=CC=C2)=CC=C1)(N(C3=CC=CC=C3)C([C](C)CC(F)` | `O=S(C12C=CC=C(C#CC3=CC=CC=C3)[CH]1)(N(C4=CC=CC=C4)C(C(C)2CC(` |
| 511 | 2 | `O=S(C12C=CC=C(C#CC3=CC=CC=C3)[CH]1)(N(C4=CC=CC=C4)C(C(C)2CC(` | `O=C(C(C1=CC(C#CC2=CC=CC=C2)=CC=C1)(C)CC(F)F)[N]C3=CC=CC=C3` |
| 512 | 1 | `[N-]=C(C(C(C)C)=CC=C1)C1(C(C)C)S(C2=CC=C([N+]([O-])=O)C=C2)=` | `O=S(C1(C(C)C)C(C(C(C)C)=CC=C1)=N2)C32[CH-]C=C([N+]([O-])=O)C` |
| 513 | 2 | `O=S(C1(C(C)C)C(C(C(C)C)=CC=C1)=N2)C32[CH-]C=C([N+]([O-])=O)C` | `CC(C)C1=CC=CC(C(C)C)=C1NC2=CC=C([N+]([O-])=O)C=C2` |
| 514 | 1 | `O=C([N-]C(C)(C)C)C(C1=CC=CC=C1)(P(OCC)(OCC)=O)OC2=CC=C([N+](` | `O=C(N1C(C)(C)C)C(C2=CC=CC=C2)(P(OCC)(OCC)=O)OC31C=CC([N+]([O` |
| 515 | 2 | `O=C(N1C(C)(C)C)C(C2=CC=CC=C2)(P(OCC)(OCC)=O)OC31C=CC([N+]([O` | `[O-]C(C1=CC=CC=C1)(P(OCC)(OCC)=O)C(N(C2=CC=C([N+]([O-])=O)C=` |
| 516 | 1 | `O=C(N(C1=CC=C([N+]([O-])=O)C=C1)C(C)(C)C)[C-](C2=CC=CC=C2)OP` | `O=C(N1C(C)(C)C)C(C21[CH-]C=C([N+]([O-])=O)C=C2)(C3=CC=CC=C3)` |
| 517 | 2 | `O=C(N1C(C)(C)C)C(C21[CH-]C=C([N+]([O-])=O)C=C2)(C3=CC=CC=C3)` | `O=C([N-]C(C)(C)C)C(C1=CC=C([N+]([O-])=O)C=C1)(C2=CC=CC=C2)OP` |
| 518 | 1 | `NC(C=CC=C1)=C1SC2=NC=CC=C2[N+]([O-])=O` | `O=[N+](C1=CC=C[N-]C12SC3=C([NH2+]2)C=CC=C3)[O-]` |
| 519 | 2 | `O=[N+](C1=CC=C[N-]C12SC3=C([NH2+]2)C=CC=C3)[O-]` | `SC1=C(NC2=NC=CC=C2[N+]([O-])=O)C=CC=C1` |
| 520 | 1 | `CC1(C)OCC2=C(N3C(C)=CC(C)=N3)N=C(SCCO)C(C#N)=C2C1` | `CC1(C)OCC2=C(N3C(C)=CC(C)=N3)[N-]C4(SCCO4)C(C#N)=C2C1` |
| 521 | 2 | `CC1(C)OCC2=C(N3C(C)=CC(C)=N3)[N-]C4(SCCO4)C(C#N)=C2C1` | `CC1(C)OCC2=C(N3C(C)=CC(C)=N3)N=C(OCC[S-])C(C#N)=C2C1` |
| 522 | 1 | `O=S(C1=NC2=CC=CC=C2S1)(C(C([O-])C3=CC(C=CC=C4)=C4C=C3)C5=CC=` | `O=S(C12SC3=CC=CC=C3[N-]1)(C(C(O2)C4=CC(C=CC=C5)=C5C=C4)C6=CC` |
| 523 | 2 | `O=S(C12SC3=CC=CC=C3[N-]1)(C(C(O2)C4=CC(C=CC=C5)=C5C=C4)C6=CC` | `[O-]S(C(C(OC1=NC2=CC=CC=C2S1)C3=CC(C=CC=C4)=C4C=C3)C5=CC=CC=` |
| 524 | 1 | `O=S(C1=NN=NN1C2=CC=CC=C2)(C(CCC)C(C3OC(C)(C)OC3)[O-])=O` | `O=S(C12N(C3=CC=CC=C3)N=N[N-]1)(C(CCC)C(C4OC(C)(C)OC4)O2)=O` |
| 525 | 2 | `O=S(C12N(C3=CC=CC=C3)N=N[N-]1)(C(CCC)C(C4OC(C)(C)OC4)O2)=O` | `O=S([O-])C(CCC)C(C1OC(C)(C)OC1)OC2=NN=NN2C3=CC=CC=C3` |
| 526 | 1 | `O=C([C](CN1CCOCC1)C)N(S(=O)(C2=CC=CC=C2)=O)C3=CC=CC=C3` | `O=C(C1(CN2CCOCC2)C)N(S(=O)(C31C=C[CH]C=C3)=O)C4=CC=CC=C4` |
| 527 | 2 | `O=C(C1(CN2CCOCC2)C)N(S(=O)(C31C=C[CH]C=C3)=O)C4=CC=CC=C4` | `O=C(C(CN1CCOCC1)(C2=CC=CC=C2)C)[N]C3=CC=CC=C3.O=S=O` |
| 528 | 1 | `O=C(OC)[C-](C1=CC=CC=C1)/C=C/C2=CC3=C(N2C4=NC=CC=N4)C=CC=C3` | `O=C(OC)C1(C2=CC=CC=C2)C=CC3=CC4=C(N3C51N=C[CH-]C=N5)C=CC=C4` |
| 529 | 2 | `O=C(OC)C1(C2=CC=CC=C2)C=CC3=CC4=C(N3C51N=C[CH-]C=N5)C=CC=C4` | `O=C(OC)C(C1=NC=CC=N1)(C2=CC=CC=C2)/C=C\C3=CC4=C([N-]3)C=CC=C` |
| 530 | 1 | `O=S(C1=CC=CC=C1)(N(C(CC#N)[CH2])C(C)=O)=O` | `O=S(C12C=C[CH]C=C1)(N(C(CC#N)C2)C(C)=O)=O` |
| 531 | 2 | `O=S(C12C=C[CH]C=C1)(N(C(CC#N)C2)C(C)=O)=O` | `N#CCC(CC1=CC=CC=C1)[N]C(C)=O` |
| 532 | 1 | `[O-]C(C1=CC=CC=C1)(C(F)(F)F)C2=[N+](C3=CC=CC=C3)C=CC=C2` | `FC(C(C1=CC=CC=C1)(O2)C3=[N+](C42C=C[CH-]C=C4)C=CC=C3)(F)F` |
| 533 | 2 | `FC(C(C1=CC=CC=C1)(O2)C3=[N+](C42C=C[CH-]C=C4)C=CC=C3)(F)F` | `FC(C(C1=CC=CC=C1)(OC2=CC=CC=C2)C3=NC=CC=C3)(F)F` |
| 534 | 1 | `[O]C(C1=CC=CC=C1OC2=CC=CC=C2)=O` | `O=C(O1)C2=CC=CC=C2OC31C=C[CH]C=C3` |
| 535 | 2 | `O=C(O1)C2=CC=CC=C2OC31C=C[CH]C=C3` | `O=C(OC1=CC=CC=C1)C2=CC=CC=C2[O]` |
| 536 | 1 | `O=C([C](CS(C1=CC=CC=C1)(=O)=O)C)N(C2=CC=CC=C2)S(C3=CC=C(C)C=` | `O=C([C](CS(C1=CC=CC=C1)(=O)=O)C)N(C2=CC=CC=C2)S(C3=CC=C(C)C=` |
| 537 | 2 | `O=C([C](CS(C1=CC=CC=C1)(=O)=O)C)N(C2=CC=CC=C2)S(C3=CC=C(C)C=` | `O=C(C(CS(C1=CC=C(C)C=C1)(=O)=O)(C2=CC=C(C)C=C2)C)[N]C3=CC=CC` |
| 538 | 1 | `C[Si](C/1CS(C2=CC=C(C)C=C2)(=O)=O)(C)C3=CC=CC=C3C1=[C]/C4=CC` | `C[Si](C1CS(C23C=C[C](C)C=C2)(=O)=O)(C)C4=CC=CC=C4C1=C3C5=CC=` |
| 539 | 2 | `C[Si](C1CS(C23C=C[C](C)C=C2)(=O)=O)(C)C4=CC=CC=C4C1=C3C5=CC=` | `C[Si](C/1[CH2])(C)C2=CC=CC=C2C1=C(C3=CC=C(C)C=C3)/C4=CC=CC=C` |
| 540 | 1 | `O=S(C1=CC=CC=C1)(CC(B2OC(C)(C)C(C)(C)O2)[C](C)C)=O` | `O=S1(C2(C(C)(C)C(B3OC(C)(C)C(C)(C)O3)C1)C=C[CH]C=C2)=O` |
| 541 | 2 | `O=S1(C2(C(C)(C)C(B3OC(C)(C)C(C)(C)O3)C1)C=C[CH]C=C2)=O` | `[CH2]C(B1OC(C)(C)C(C)(C)O1)C(C)(C)C2=CC=CC=C2` |
| 542 | 1 | `[CH2-]C1=CC=CC=C1OC2=CC=CC=C2` | `C12=CC=CC=C1CC3(C=C[CH-]C=C3)O2` |
| 543 | 2 | `C12=CC=CC=C1CC3(C=C[CH-]C=C3)O2` | `[O-]C1=CC=CC=C1CC2=CC=CC=C2` |
| 544 | 1 | `O=S(C1=NC2=CC=CC=C2S1)(C(C[CH]CS(C3=CC=CC=C3)(=O)=O)(C)C)=O` | `O=S(C12[N]C3=CC=CC=C3S1)(C(CC2CS(C4=CC=CC=C4)(=O)=O)(C)C)=O` |
| 545 | 2 | `O=S(C12[N]C3=CC=CC=C3S1)(C(CC2CS(C4=CC=CC=C4)(=O)=O)(C)C)=O` | `C[C](C)CC(C1=NC2=CC=CC=C2S1)CS(C3=CC=CC=C3)(=O)=O.O=S=O` |
| 546 | 1 | `CC(C)[CH]C(C(OCC)=O)N(CC1=CC=CC=C1)CC2=CC=CC=C2` | `CC(C)C1C(C(OCC)=O)N(CC2=CC=CC=C2)CC31C=C[CH]C=C3` |
| 547 | 2 | `CC(C)C1C(C(OCC)=O)N(CC2=CC=CC=C2)CC31C=C[CH]C=C3` | `[CH2]N(CC1=CC=CC=C1)C(C(OCC)=O)C(C2=CC=CC=C2)C(C)C` |
| 548 | 1 | `O=S(N1C([C](C)C)CCC(C2=CC=CC=C2)=N1)(C3=CC=CC=C3)=O` | `O=S(N1C(C(C)2C)CCC(C3=CC=CC=C3)=N1)(C42C=C[CH]C=C4)=O` |
| 549 | 2 | `O=S(N1C(C(C)2C)CCC(C3=CC=CC=C3)=N1)(C42C=C[CH]C=C4)=O` | `CC(C1=CC=CC=C1)(C)C2CCC(C3=CC=CC=C3)=N[N]2.O=S=O` |
| 550 | 1 | `CC(C(N(C1=CC=CC=C1)C)=O)/C=C2N(C3=C(C)C=C(C)C=C3C)C(C)=C(C)N` | `CC(C(N1C)=O)C(C21C=C[CH-]C=C2)C3=[N+](C4=C(C)C=C(C)C=C4C)C(C` |
| 551 | 2 | `CC(C(N1C)=O)C(C21C=C[CH-]C=C2)C3=[N+](C4=C(C)C=C(C)C=C4C)C(C` | `CC(C([N-]C)=O)C(C1=CC=CC=C1)C2=[N+](C3=C(C)C=C(C)C=C3C)C(C)=` |
| 552 | 1 | `CC(N1C2=C(C)C=C(OC)C=C2C)=C(C)N(C3=C(C)C=C(OC)C=C3C)C1=CCC(N` | `CC1=C(C)N(C2=C(C)C=C(OC)C=C2C)C(C3CC(N(CC4=CC=CC=C4)C53C=C(I` |
| 553 | 2 | `CC1=C(C)N(C2=C(C)C=C(OC)C=C2C)C(C3CC(N(CC4=CC=CC=C4)C53C=C(I` | `CC1=C(C)N(C2=C(C)C=C(OC)C=C2C)C(C(C3=CC(I)=CC=C3)CC([N-]CC4=` |
| 554 | 1 | `CC1=C([N-]C(C)=O)C(OC2=CC(C)=CC=C2Br)=CC=C1` | `CC1=C(N2C(C)=O)C(OC32C(Br)=C[CH-]C(C)=C3)=CC=C1` |
| 555 | 2 | `CC1=C(N2C(C)=O)C(OC32C(Br)=C[CH-]C(C)=C3)=CC=C1` | `[O-]C1=CC=CC(C)=C1N(C2=CC(C)=CC=C2Br)C(C)=O` |
| 556 | 1 | `O=P(C1=CC=CC=C1)(C2=CC=CC=C2)N3/C(C4=CC=CC=C4C=N3)=[C]/C5=CC` | `O=P(C12C=C[CH]C=C1)(C3=CC=CC=C3)N4C(C5=CC=CC=C5C=N4)=C2C6=CC` |
| 557 | 2 | `O=P(C12C=C[CH]C=C1)(C3=CC=CC=C3)N4C(C5=CC=CC=C5C=N4)=C2C6=CC` | `O=[P](C1=CC=CC=C1)N2/C(C3=CC=CC=C3C=N2)=C(C4=CC=CC=C4)/C5=CC` |
| 558 | 1 | `[O-]/C(C1=CC=CC=C1)=C(F)\S(C2=NC=CC=N2)(=O)=O` | `FC1=C(OC2(N=C[CH-]C=N2)S1(=O)=O)C3=CC=CC=C3` |
| 559 | 2 | `FC1=C(OC2(N=C[CH-]C=N2)S1(=O)=O)C3=CC=CC=C3` | `FC1=C(OC2(N=C[CH-]C=N2)S1(=O)=O)C3=CC=CC=C3` |
| 560 | 1 | `O=C1N(C)C2=CC=CC=C2C3=C(C4=CC=CC=C4)C[CH]C13CS(C5=CC=C(C)C=C` | `O=C1N(C)C2=CC=CC=C2C3=C(C4=CC=CC=C4)CC5C13CS(C65C=C[C](C)C=C` |
| 561 | 2 | `O=C1N(C)C2=CC=CC=C2C3=C(C4=CC=CC=C4)CC5C13CS(C65C=C[C](C)C=C` | `O=C1N(C)C2=CC=CC=C2C3=C(C4=CC=CC=C4)CC(C5=CC=C(C)C=C5)C13[CH` |
| 562 | 1 | `O=[N+](C1=CC([N+]([O-])=O)=CN=C1SC2=NC=N[N-]2)[O-]` | `O=[N+](C1=CC([N+]([O-])=O)=C[N-]C12SC3=NC=NN32)[O-]` |
| 563 | 2 | `O=[N+](C1=CC([N+]([O-])=O)=C[N-]C12SC3=NC=NN32)[O-]` | `[S-]C1=NC=NN1C2=NC=C([N+]([O-])=O)C=C2[N+]([O-])=O` |
| 564 | 1 | `[CH2]C1=CC=CC=C1OC2=CC=C(C)C=C2` | `C[C](C=C1)C=CC21OC3=CC=CC=C3C2` |
| 565 | 2 | `C[C](C=C1)C=CC21OC3=CC=CC=C3C2` | `[O]C1=CC=CC=C1CC2=CC=C(C)C=C2` |
| 566 | 1 | `O=C(OCC)/C(SC(S/C1=C/C2=CC=C(O)C=C2)=NC1=O)=N/[N-]C3=CC=CC=C` | `O=C(OCC)C(SC12S/C(C([N-]1)=O)=C/C3=CC=C(O)C=C3)=NN2C4=CC=CC=` |
| 567 | 2 | `O=C(OCC)C(SC12S/C(C([N-]1)=O)=C/C3=CC=C(O)C=C3)=NN2C4=CC=CC=` | `O=C(OCC)/C([S-])=N/N(C(S/C1=C/C2=CC=C(O)C=C2)=NC1=O)C3=CC=CC` |
| 568 | 1 | `O=C1C(C(OC)=O)=CN(C2CC2)C3=C1C([N+]([O-])=O)=C(S/C(C4=CC=CC=` | `O=C1C(C(OC)=O)=CN(C2CC2)C3=C1/C(C4(SC(C5=CC=CC=C5)=NN4C6=CC=` |
| 569 | 2 | `O=C1C(C(OC)=O)=CN(C2CC2)C3=C1/C(C4(SC(C5=CC=CC=C5)=NN4C6=CC=` | `[S-]C(N(C1CC1)C=C(C(OC)=O)C2=O)=C2C([N+]([O-])=O)C3SC(C4=CC=` |
| 570 | 1 | `O=C(N1CCCC2=C1C=CC=C2)C3=CC=CC=C3[CH-]C4=CC=CC=C4` | `O=C(N1CCCC2=C[CH-]C=CC213)C4=CC=CC=C4C3C5=CC=CC=C5` |
| 571 | 2 | `O=C(N1CCCC2=C[CH-]C=CC213)C4=CC=CC=C4C3C5=CC=CC=C5` | `O=C([N-]CCCC1=C2C=CC=C1)C3=CC=CC=C3C2C4=CC=CC=C4` |
| 572 | 1 | `O=S(N1C([CH]CC)C(C)(C)CC(C)=N1)(C2=CC=C(C)C=C2)=O` | `O=S(N1C(C2CC)C(C)(C)CC(C)=N1)(C32C=C[C](C)C=C3)=O` |
| 573 | 2 | `O=S(N1C(C2CC)C(C)(C)CC(C)=N1)(C32C=C[C](C)C=C3)=O` | `CC1=CC=C(C(CC)C2C(C)(C)CC(C)=N[N]2)C=C1` |
| 574 | 1 | `OC(C1=NC2=C(C=CC=C2)S1)(C)C3=CC=CC=C3[N]S(C4=CC=C(C)C=C4)(=O` | `OC(C1=NC2=C(C=CC=C2)S1)(C)C3=CC=CC=C3[N]S(C4=CC=C(C)C=C4)(=O` |
| 575 | 2 | `OC(C1=NC2=C(C=CC=C2)S1)(C)C3=CC=CC=C3[N]S(C4=CC=C(C)C=C4)(=O` | `[O]C(C)C1=CC=CC=C1N(C2=NC3=C(C=CC=C3)S2)S(C4=CC=C(C)C=C4)(=O` |
| 576 | 1 | `NCCOC1C=C[C+]C=C1` | `C1=CC2(OCC[NH2+]2)C=C[CH]1` |
| 577 | 2 | `C1=CC2(OCC[NH2+]2)C=C[CH]1` | `OCCNC1=CC=CC=C1` |
| 578 | 1 | `BrC1=C(C([O-])=C=C(C2=CC=CC=C2)N(S(=O)(C3=CC=CC=C3)=O)C4=CC=` | `BrC1=C(C([O-])=C=C(C2=CC=CC=C2)N(S(=O)(C3=CC=CC=C3)=O)C4=CC=` |
| 579 | 2 | `BrC1=C(C([O-])=C=C(C2=CC=CC=C2)N(S(=O)(C3=CC=CC=C3)=O)C4=CC=` | `BrC1=C(C(/C(C2=CC=CC=C2)=C(C3=CC=CC=C3)/[N-]C4=CC=CC=C4)=O)C` |
| 580 | 1 | `O=C(/C=[C]/C(N(C)S(C1=CC=C(C)C=C1)(=O)=O)=O)C2=CC=CC=C2` | `O=C(/C=C1C(N(C)S(C2/1C=C[C](C)C=C2)(=O)=O)=O)C3=CC=CC=C3` |
| 581 | 2 | `O=C(/C=C1C(N(C)S(C2/1C=C[C](C)C=C2)(=O)=O)=O)C3=CC=CC=C3` | `O=C(/C=C(C1=CC=C(C)C=C1)/C([N]C)=O)C2=CC=CC=C2` |
| 582 | 1 | `O=S(C1=CC=CC=C1)(N(C(C)=O)C[CH2])=O` | `O=S(C12C=C[CH]C=C1)(N(C(C)=O)CC2)=O` |
| 583 | 2 | `O=S(C12C=C[CH]C=C1)(N(C(C)=O)CC2)=O` | `O=C(C)[N]CCC1=CC=CC=C1` |
| 584 | 1 | `O=S(C1=CC=C([N+]([O-])=O)C=C1)(N([CH-]C(OCC)=O)C2=CC=CC=C2)=` | `O=S(C12C=C[C-]([N+]([O-])=O)C=C1)(N(C2C(OCC)=O)C3=CC=CC=C3)=` |
| 585 | 2 | `O=S(C12C=C[C-]([N+]([O-])=O)C=C1)(N(C2C(OCC)=O)C3=CC=CC=C3)=` | `O=C(OCC)C(C1=CC=C([N+]([O-])=O)C=C1)[N-]C2=CC=CC=C2` |
| 586 | 1 | `[CH2]C1=CC=CC=C1OC2=CC=CC=C2` | `C12=CC=CC=C1CC3(C=C[CH]C=C3)O2` |
| 587 | 2 | `C12=CC=CC=C1CC3(C=C[CH]C=C3)O2` | `[O]C1=CC=CC=C1CC2=CC=CC=C2` |
| 588 | 1 | `O=C(OC)C1=C(N(S(C2=CC=C(C)C=C2)(=O)=O)CC[CH2])SC=C1` | `O=C(OC)C1=C(N2CCCC3(C=C[C](C)C=C3)S2(=O)=O)SC=C1` |
| 589 | 2 | `O=C(OC)C1=C(N2CCCC3(C=C[C](C)C=C3)S2(=O)=O)SC=C1` | `O=C(OC)C1=C([N]CCCC2=CC=C(C)C=C2)SC=C1` |
| 590 | 3 | `[NH-]CC(OC1=CC=C([N+]([O-])=O)C=C1)C2=CC=CC=C2` | `O=[N+]([C-]1C=CC2(NCC(O2)C3=CC=CC=C3)C=C1)[O-]` |
| 591 | 4 | `O=[N+]([C-]1C=CC2(NCC(O2)C3=CC=CC=C3)C=C1)[O-]` | `[O-]C(C1=CC=CC=C1)CNC2=CC=C([N+]([O-])=O)C=C2` |
| 592 | 1 | `O=S(C1=CC=C([N+]([O-])=O)C=C1)(NCC([O-])C2=CC=CC=C2)=O` | `O=S(C12C=C[C-]([N+]([O-])=O)C=C1)(NCC(O2)C3=CC=CC=C3)=O` |
| 593 | 2 | `O=S(C12C=C[C-]([N+]([O-])=O)C=C1)(NCC(O2)C3=CC=CC=C3)=O` | `[NH-]CC(OC1=CC=C([N+]([O-])=O)C=C1)C2=CC=CC=C2` |
| 594 | 1 | `[O]C(C1=CC=CC=C1OC2=CC=C(C)C=C2)=O` | `O=C(O1)C2=CC=CC=C2OC31C=C[C](C)C=C3` |
| 595 | 2 | `O=C(O1)C2=CC=CC=C2OC31C=C[C](C)C=C3` | `O=C(OC1=CC=C(C)C=C1)C2=CC=CC=C2[O]` |
| 596 | 1 | `NC1=CC=C(S(NC2=NC(C)=CC(C)=N2)(=O)=O)C=C1` | `N[C]1C=CC2(S(NC3=[N+]2C(C)=CC(C)=N3)(=O)=O)C=C1` |
| 597 | 2 | `N[C]1C=CC2(S(NC3=[N+]2C(C)=CC(C)=N3)(=O)=O)C=C1` | `N[C]1C=CC2(S(NC3=[N+]2C(C)=CC(C)=N3)(=O)=O)C=C1` |
| 598 | 1 | `CN([C-](CC(F)(F)F)C1=CC=C(Cl)C=C1)C(N(C)C2=CC=C(Cl)C=C2)=O` | `CN(C(CC(F)(F)F)1C2=CC=C([Cl-])C=C2)C(N(C)C31C=C[C-](Cl)C=C3)` |
| 599 | 2 | `CN(C(CC(F)(F)F)1C2=CC=C([Cl-])C=C2)C(N(C)C31C=C[C-](Cl)C=C3)` | `CN(C(C1=CC=C(Cl)C=C1)(CC(F)(F)F)C2=CC=C(Cl)C=C2)C([N-]C)=O` |
| 600 | 1 | `O=S(C(F)(F)F)C1=C(N[C-](C(OC)=O)CC(OC)=O)N(C2=C(Cl)C=C(C(F)(` | `O=S(C(F)(F)F)C1=C(N[C@]2(C(OC)=O)CC(OC)=O)N(C32C(Cl)=C[C-](C` |
| 601 | 2 | `O=S(C(F)(F)F)C1=C(N[C@]2(C(OC)=O)CC(OC)=O)N(C32C(Cl)=C[C-](C` | `O=S(C(F)(F)F)C1=C(NC(C(OC)=O)(C2=C(Cl)C=C(C(F)(F)F)C=C2Cl)CC` |
| 602 | 1 | `COC1=CC(OC)=NC(OC2=CC=CC=C2C[N-]C3=CC=CC=C3)=N1` | `COC1=NC2(OC3=CC=CC=C3CN2C4=CC=CC=C4)N=C(OC)[CH-]1` |
| 603 | 2 | `COC1=NC2(OC3=CC=CC=C3CN2C4=CC=CC=C4)N=C(OC)[CH-]1` | `[O-]C1=CC=CC=C1CN(C2=NC(OC)=CC(OC)=N2)C3=CC=CC=C3` |
| 604 | 1 | `O=C(OCC)/C=C/C1=CC=CC=C1SC2=C([N-]C#N)C=CC=C2` | `O=C(OCC)/C=C/C1=C[CH-]C=CC12SC3=C(N2C#N)C=CC=C3` |
| 605 | 2 | `O=C(OCC)/C=C/C1=C[CH-]C=CC12SC3=C(N2C#N)C=CC=C3` | `[S-]C1=C(N(C2=CC=CC=C2/C=C/C(OCC)=O)C#N)C=CC=C1` |
| 606 | 1 | `[S-]C1=C(N(C2=CC=CC=C2/C=C/C(OCC)=O)C#N)C=CC=C1` | `OC(C1=CC=CC=C1N2S(C34C=C[C](C)C=C3)(=O)=O)(C5=CC=CC=C5)C2=C4` |
| 607 | 2 | `OC(C1=CC=CC=C1N2S(C34C=C[C](C)C=C3)(=O)=O)(C5=CC=CC=C5)C2=C4` | `OC(C1=CC=CC=C1[N]/2)(C3=CC=CC=C3)C2=C(C4=CC=C(C)C=C4)/C5=CC=` |
| 608 | 1 | `[NH-]C(COC1=C(C2=C(C=CC=C3)C3=CC=C2)C4=C(C=CC=C4)C=C1)=O` | `O=C(N1)COC21[C-](C3=C(C=CC=C4)C4=CC=C3)C5=C(C=CC=C5)C=C2` |
| 609 | 2 | `O=C(N1)COC21[C-](C3=C(C=CC=C4)C4=CC=C3)C5=C(C=CC=C5)C=C2` | `[O-]CC(NC1=C(C2=C(C=CC=C3)C3=CC=C2)C4=C(C=CC=C4)C=C1)=O` |
| 610 | 1 | `OC(CC[CH]CC(C1=CC=C(C)C=C1)=O)(C2=NC3=CC=CC=C3S2)C4=CC=CC=C4` | `OC(CCC1CC(C2=CC=C(C)C=C2)=O)(C31SC4=CC=CC=C4[N]3)C5=CC=CC=C5` |
| 611 | 2 | `OC(CCC1CC(C2=CC=C(C)C=C2)=O)(C31SC4=CC=CC=C4[N]3)C5=CC=CC=C5` | `O[C](CCC(C1=NC2=CC=CC=C2S1)CC(C3=CC=C(C)C=C3)=O)C4=CC=CC=C4` |
| 612 | 1 | `O=C(/[C-]=C(C1=CC=CC=C1)/N(S(C2=CC=C([N+]([O-])=O)C=C2)(=O)=` | `O=C(C1=C(C2=CC=CC=C2)N(S(C31C=CC([NO2])C=C3)(=O)=O)CC4=CC=CC` |
| 613 | 2 | `O=C(C1=C(C2=CC=CC=C2)N(S(C31C=CC([NO2])C=C3)(=O)=O)CC4=CC=CC` | `O=C(/C(C1=CC=C([N+]([O-])=O)C=C1)=C(C2=CC=CC=C2)/[N-]CC3=CC=` |
| 614 | 1 | `[O-]/C(NS(C1=CC=CC=C1)(=O)=O)=C\C2=CC=CC=C2` | `O=C(C1C2=CC=CC=C2)NS(C31C=C[CH-]C=C3)(=O)=O` |
| 615 | 2 | `O=C(C1C2=CC=CC=C2)NS(C31C=C[CH-]C=C3)(=O)=O` | `[NH-]C(C(C1=CC=CC=C1)C2=CC=CC=C2)=O` |
| 616 | 1 | `OC(C(CSC1=CC=C([N+]([O-])=O)C2=NON=C21)N)=O` | `OC(C1[NH2+]C2([CH-]C=C([N+]([O-])=O)C3=NON=C32)SC1)=O` |
| 617 | 2 | `OC(C1[NH2+]C2([CH-]C=C([N+]([O-])=O)C3=NON=C32)SC1)=O` | `OC(C(CS)NC1=CC=C([N+]([O-])=O)C2=NON=C21)=O` |
| 618 | 1 | `O=[C]C1=CC=CC=C1OC2=C(C)C=C(C)C=C2C` | `O=C1C2=CC=CC=C2OC31C(C)=C[C](C)C=C3C` |
| 619 | 2 | `O=C1C2=CC=CC=C2OC31C(C)=C[C](C)C=C3C` | `O=C(C1=C(C)C=C(C)C=C1C)C2=CC=CC=C2[O]` |
| 620 | 1 | `O=C(/C([Se]C1=CC=CC=C1)=[C]/C2=CC=CC=C2)OC3=CC=CC=C3` | `O=C(C([Se]C1=CC=CC=C1)=C2C3=CC=CC=C3)OC42C=C[CH]C=C4` |
| 621 | 2 | `O=C(C([Se]C1=CC=CC=C1)=C2C3=CC=CC=C3)OC42C=C[CH]C=C4` | `[O]C(/C([Se]C1=CC=CC=C1)=C(C2=CC=CC=C2)/C3=CC=CC=C3)=O` |
