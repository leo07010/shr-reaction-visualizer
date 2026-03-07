# CLAUDE.md — SHR Reaction Visualizer

## Project Overview

SHR (Stepwise Heterolytic Reaction) Database & Visualizer — a web application for browsing, searching, and visualizing organic reaction mechanisms step by step. Deployed on `kekule.matter.toronto.edu` (University of Toronto, Matter Lab).

Public URL: `https://kekule.matter.toronto.edu/`

## Architecture

Single Docker container running Flask (Gunicorn) on port 3000, serving both the Python RDKit API and static frontend files. Nginx on the host reverse-proxies HTTPS (port 443) → localhost:3000.

```
Browser → Nginx (443/SSL) → Flask/Gunicorn (3000) → RDKit Python
                                                   → Static HTML/JS/CSS
```

## Tech Stack

- **Backend**: Python 3.11, Flask 3.0.3, RDKit 2024.3.5, Gunicorn
- **Frontend**: Vanilla JavaScript (no framework), RDKit.js (CDN), html2canvas (CDN)
- **Data**: JSON + CSV (auto-loaded), ~644 reaction entries
- **Deploy**: Docker (miniconda3 base), Nginx reverse proxy, Let's Encrypt SSL
- **Constraint**: `numpy<2.0` pinned for older server CPU (no X86_V2)

## Directory Structure

```
chemdraw-project/
├── index.html              # Single-page app (4 pages: Home, Visualizer, Database, Search)
├── css/styles.css          # Dark theme, all component styles
├── js/
│   ├── app.js              # Entry point, CSV parsing, RDKit init
│   ├── chem-engine.js      # RDKit wrapper: SMILES→SVG, bond detection, atom overlays
│   ├── visualizer-app.js   # Canvas whiteboard: drag/resize/zoom, bond marking, MCS integration
│   ├── data-app.js         # Database table UI: search, filter, sort, pagination
│   ├── draw-engine.js      # 2D structure drawing canvas for substructure queries
│   └── navigation.js       # Page switching, toast notifications
├── backend/
│   ├── app.py              # Flask API: /api/search, /api/bond_changes, /api/data, /api/mol/svg
│   └── requirements.txt    # Python deps
├── data/
│   └── data.json           # Main reaction database (273KB)
├── Dockerfile              # miniconda3 + RDKit + Flask + Gunicorn
├── tasks/
│   ├── todo.md             # Current task tracking
│   └── lessons.md          # Accumulated lessons from past mistakes
└── CLAUDE.md               # This file
```

## Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/data` | GET | Return all reaction data |
| `/api/search` | POST | Substructure search (SMILES/SMARTS) |
| `/api/mol/svg` | POST | SMILES → SVG rendering |
| `/api/bond_changes` | POST | MCS-based atom-atom mapping for exact bond change detection |

## Data Format

Each reaction entry in `data.json`:
```json
{
  "Paper DOI": "10.1021/...",
  "Entered By": "Name",
  "Step": "1",
  "SMILES SM": "starting material SMILES",
  "SMILES Product": "product SMILES",
  "Reagents": "conditions",
  "Formed 1": "C-N",  "Broken 1": "N-O",
  "Formed 2": "",      "Broken 2": "",
  ...up to Formed 8 / Broken 8
}
```

Bond descriptors: `<Elem1><BondType><Elem2>` (e.g., `C-N`, `C=O`, `C#C`). Elements sorted alphabetically.

## Core Features & How They Work

### 1. Reaction Visualizer (`visualizer-app.js`)
- Groups reactions by Paper DOI in left sidebar
- Canvas with pan/zoom (trackpad scroll = pan, Ctrl+scroll = zoom)
- Each step shows: SM molecule → bond change panel → Product molecule
- Layout: `MOL_W=260, MOL_H=260, BOND_PANEL_W=180, COLS_PER_ROW=2`
- Overview row at top shows total reaction (half-size: 130×130)
- Step checkbox selector to show/hide individual steps

### 2. Bond Change Detection (3-tier system)
1. **CSV data** (highest priority): Uses `Formed 1-8` / `Broken 1-8` columns from the dataset
2. **MCS backend** (`/api/bond_changes`): Fragment-based Maximum Common Substructure atom-atom mapping using RDKit's `rdFMCS.FindMCS`. Returns exact atom indices (`sm_atoms`, `prod_atoms`) for each formed/broken bond
3. **Client-side fallback** (`ChemEngine.detectBondChanges`): Multiset comparison of bond types between SM and Product (rough heuristic, no atom mapping)

When CSV data exists, the frontend enriches it with MCS atom indices via `_enrichBondWithMCS()` for precise highlighting.

### 3. Atom Overlay System (`chem-engine.js → getSvgHighlighted`)
- Colored circles on atoms: green=formed, red=broken, purple=both
- Order number badges (F1, B2) with white pill background
- Circle radius `0.022 * viewBox width`, font size `0.024 * viewBox width`
- Probe SVG technique: renders a separate SVG with all atoms as highlighted ellipses to extract screen positions. **Critical**: probe SVG MUST use same `width, height, fontSize, lineWidth, padding` as final SVG
- When MCS atom indices available → fast path (skip pattern matching)
- When no MCS data → forward matching (bond exists on molecule) or reverse matching (unbonded pairs for formed-on-SM / broken-on-Product)

### 4. Structure Drawing (`draw-engine.js`)
- Canvas-based 2D molecular editor
- Element buttons: C, H, N, O, S, P, F, Cl, Br, I
- Functional groups: OH, NH2, CHO, COOH, NO2, CN, CF3, etc.
- Bond cycling: click existing bond to change single→double→triple
- Generates V2000 molblock → RDKit converts to SMILES for search
- Search prioritizes SMILES (stricter) before SMARTS (flexible) matching

### 5. Database Browser (`data-app.js`)
- Full-text search, contributor filter, bond type filter
- Sortable columns, pagination (50/page)
- Detail modal with SVG rendering
- CSV upload (flexible column mapping) and export

## Deployment Commands

```bash
# Build and run Docker
docker-compose up -d --build

# Or manually:
docker build -t shr-visualizer .
docker run -d -p 3000:3000 --name shr shr-visualizer

# Update from git:
cd /home/leo/shr-reaction-visualizer
git pull
docker-compose up -d --build

# Nginx config location:
/etc/nginx/sites-enabled/kekule.matter.toronto.edu
# Restart nginx after changes:
sudo systemctl restart nginx
```

## Common Issues & Solutions

- **Molecule not rendering**: Check if SMILES is valid. `chem-engine.js` has 5 fallback strategies for parsing
- **Template SMILES** (contains R, Ar, R', X, M): Detected and skipped by `isTemplateSMILES()`
- **Atom circles in wrong position**: Ensure probe SVG uses same dimensions as final SVG (fixed in `_getAtomPositionsFromMol`)
- **Search returns wrong results**: SMILES-first search (strict valence) before SMARTS fallback
- **MCS returns too many changes**: Complex rearrangements cause poor atom mapping; CSV manual data takes priority
- **Port 3000 not accessible externally**: Use `https://kekule.matter.toronto.edu/` (nginx proxies to 3000)

## CSS Theme

Dark theme with CSS custom properties:
```css
--primary: #0057B8; --accent: #00B4D8; --bg: #0a1628;
--card: #111d33; --text: #e8edf5; --ok: #00c48c; --danger: #ff6b6b;
```

## Git Workflow

Repository: `https://github.com/leo07010/shr-reaction-visualizer.git`

```bash
git add <files>
git commit -m "description"
git push origin main
# Then SSH to server and rebuild Docker
```

---

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
- **User Language**: User communicates in Traditional Chinese (繁體中文). Respond in the same language unless asked otherwise.
- **Chemistry Domain**: This is a chemistry research tool. Understand SMILES notation, bond types, reaction mechanisms, and RDKit API when making changes.

## Lessons Learned

See `tasks/lessons.md` for accumulated patterns. Key recurring ones:

- **Block-scoped variables**: `const`/`let` inside `if` blocks are NOT accessible outside. Always check variable scope when refactoring.
- **Probe SVG dimensions**: When extracting atom positions via probe SVG, MUST pass identical `width, height, fontSize, lineWidth, padding` as the final rendered SVG. Mismatched dimensions = wrong circle positions.
- **SMILES search order**: Always try `MolFromSmiles()` first (strict valence), then `MolFromSmarts()` fallback. SMARTS is too permissive (e.g., "HO" matches any H-O bond).
- **MCS for multi-fragment reactions**: Use fragment-based MCS (split by `.` first, match each fragment separately) instead of whole-molecule MCS. Whole-molecule MCS fails badly on multi-component reactions.
- **Centering canvas content**: `resetView()` must calculate content bounds and center, NOT just set offset to `(0,0)`.
