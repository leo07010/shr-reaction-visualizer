# SHR Reaction Visualizer

A web-based tool for visualizing stepwise homolytic reactions (SHR). Built with RDKit.js for SMILES-to-SVG molecular rendering, featuring an interactive canvas whiteboard for annotating reaction mechanisms.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

### Reaction Visualizer
- **Canvas Whiteboard** — Drag, resize, pan, and zoom molecular structures on an infinite canvas
- **Auto Bond Detection** — Automatically compares Starting Material and Product SMILES to detect which bonds are formed or broken at each step
- **Bond Highlighting** — Formed bonds (green) and broken bonds (red) are visually highlighted directly on molecular SVGs
- **Custom Bond Colors** — Each bond highlight supports per-bond custom colors via color pickers
- **Manual Bond Marking** — Click two atoms on a molecule to manually mark bonds as formed or broken, with undo support
- **Editable Annotations** — Authors can add, remove, or modify auto-detected bond annotations to correct any errors
- **Canvas Tools** — Add text notes, arrows, and circle markers to annotate reaction mechanisms
- **Selection & Export** — Drag-select regions of the canvas for export via html2canvas

### Database Browser
- **Search & Filter** — Full-text search across DOI, SMILES, reagents; filter by contributor or bond type
- **Substructure Search** — Filter entries by SMILES substructure matching (powered by RDKit)
- **Sortable Columns** — Click column headers to sort by reference, contributor, step, etc.
- **Detail View** — Click any entry to see full reaction details with highlighted molecular structures
- **CSV Import/Export** — Load data from CSV/Excel files or export the database as CSV

### Data Loading
- Automatically loads `data.json` on startup
- Auto-scans for CSV files (`reactions.csv`, `data.csv`, `import.csv`, `shr_data.csv`) and merges them into the dataset
- Supports manual CSV/Excel upload via the sidebar

## Tech Stack

- **[RDKit.js](https://github.com/rdkit/rdkit-js)** — Cheminformatics toolkit for SMILES parsing, molecular rendering, and substructure matching
- **[html2canvas](https://html2canvas.hertzen.com/)** — Canvas export for selection regions
- **Vanilla JavaScript** — No frameworks; lightweight and fast
- **CSS Custom Properties** — Dark theme with consistent design tokens

## Project Structure

```
chemdraw-project/
├── index.html            # Main HTML (Home, Visualizer, Database pages)
├── styles.css            # All styles (dark theme, layout, components)
├── chem-engine.js        # RDKit wrapper: SMILES→SVG, bond detection, atom data
├── visualizer-app.js     # Canvas whiteboard: drag, resize, pan/zoom, marking
├── data-app.js           # Database page: search, filter, sort, detail view
├── navigation.js         # Page switching & toast notifications
├── app.js                # Entry point: data loading, CSV parsing, init
├── data.json             # Pre-loaded reaction database (644 entries)
└── README.md
```

## Getting Started

### Run Locally

No build step required. Just serve the files with any static server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

### Deploy on GitHub Pages

This project is ready for GitHub Pages deployment:

1. Push the repo to GitHub
2. Go to **Settings → Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose `main` branch and `/ (root)` folder
5. Click **Save**

Your site will be live at `https://<username>.github.io/shr-reaction-visualizer/`

## Data Format

### JSON (`data.json`)

Each entry contains:

| Field | Description |
|-------|-------------|
| `Paper DOI` | Reference DOI or identifier |
| `Entered By` | Contributor name |
| `Step` | Reaction step number |
| `SMILES SM` | Starting material SMILES |
| `SMILES Product` | Product SMILES |
| `Reagents` | Reagents/conditions |
| `Formed 1`–`Formed 8` | Formed bond descriptors (e.g., `C-N`) |
| `Broken 1`–`Broken 8` | Broken bond descriptors (e.g., `C-S`) |

### CSV Import

CSV files are automatically mapped using flexible column name matching:

- `Source` / `Paper DOI` / `DOI` / `Reference` → Paper DOI
- `User Name` / `Entered By` / `Author` → Entered By
- `SMILES SM` / `Starting Material` / `SM` → Starting Material SMILES
- `SMILES Product` / `Product` → Product SMILES

## Usage

1. **Home Page** — Overview with statistics; navigate to Visualizer or Database
2. **Visualizer** — Select a Paper DOI from the left sidebar to load all reaction steps onto the canvas. Use toolbar tools to annotate, mark bonds, and customize colors
3. **Database** — Browse, search, and filter all reaction entries. Click any row for detailed view with highlighted molecular structures

## Bond Descriptor Format

Bond descriptors follow the pattern `<Atom1><BondType><Atom2>`:

- `C-N` — Single bond between Carbon and Nitrogen
- `C=O` — Double bond between Carbon and Oxygen
- `C#C` — Triple bond between two Carbons

## License

MIT
