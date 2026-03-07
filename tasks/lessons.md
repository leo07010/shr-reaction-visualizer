# Lessons Learned

Accumulated patterns from past mistakes. Review at session start.

---

## JavaScript Scope Bugs

**Pattern**: Refactoring code that moves `const`/`let` declarations into `if` blocks, then referencing them outside → `ReferenceError` that silently breaks rendering.

**Rule**: After ANY refactor, grep for all references to moved variables and verify they're still in scope. If a variable was at function scope and moves into a block, all outer references break.

**Example**: `autoDetected` was moved inside `if (!alternatingBonds.length)` block but still referenced 30 lines later outside it → broke bond panel + Product molecule rendering entirely.

---

## Probe SVG Dimension Mismatch

**Pattern**: Atom overlay circles appear in wrong positions on molecules.

**Rule**: `_getAtomPositionsFromMol()` MUST receive the exact same `width, height, atomLabelFontSize, bondLineWidth, padding` as the final SVG passed to `get_svg_with_highlights()`. Any mismatch causes coordinate drift.

**Example**: Probe SVG was rendered at default dimensions while final SVG used `sw=260, sh=260` → circles were offset by ~30px.

---

## SMILES vs SMARTS Search Order

**Pattern**: Substructure search returns false positives (e.g., searching "HO" matches molecules without OH).

**Rule**: Always try `Chem.MolFromSmiles()` first (strict valence checking), fall back to `Chem.MolFromSmarts()` only if SMILES parsing fails. Apply this in BOTH Python backend and JS frontend.

**Example**: "HO" as SMARTS matches any hydrogen-oxygen bond pattern. As SMILES, it correctly requires an actual hydroxyl group.

---

## MCS on Multi-Fragment Molecules

**Pattern**: RDKit's `FindMCS` on combined multi-fragment SMILES (e.g., `A.B`) only matches a small portion (~9 of 20 atoms), causing too many false "formed"/"broken" bonds.

**Rule**: Split SM and Product into fragments first (`Chem.GetMolFrags`), then run MCS on each SM fragment against each Product fragment independently. Build the global atom map from per-fragment results.

**Example**: Whole-molecule MCS matched only one phenyl ring (9 atoms). Fragment-based MCS correctly matched 17 of 20 atoms.

---

## Canvas Centering

**Pattern**: Reset button puts content in top-left corner instead of centering.

**Rule**: `resetView()` must calculate content bounding box and center it within the viewport, not just set `canvasOffset = {x:0, y:0}`.

---

## Bond Highlighting Direction

**Pattern**: A "formed" bond highlighted on SM (left molecule) marks the wrong atoms because the bond doesn't exist there yet.

**Rule**: When highlighting a FORMED bond on SM (or BROKEN on Product), the bond doesn't exist on that molecule. Use "reverse matching" — find unbonded atom pairs of the right elements instead of matching existing bonds. When MCS atom indices are available, use them directly (fast path).

---

## User Communication

**Pattern**: User communicates in Traditional Chinese (繁體中文).

**Rule**: Always respond in Traditional Chinese unless explicitly asked for English. Technical terms can remain in English where natural.
