"""
SHR Reaction Visualizer - Python RDKit Backend
Flask API for substructure search using RDKit
Also serves the static frontend files (HTML, JS, CSS)
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from rdkit import Chem
from rdkit.Chem import Draw, AllChem
from rdkit.Chem.Draw import rdMolDraw2D
import json
import os
import csv
import io

# Static frontend files are one directory up from backend/
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)  # Allow cross-origin requests

# ─── Load reaction data ─────────────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')

def load_data():
    """Load all reaction data from JSON and CSV files."""
    data = []

    # Load from data.json
    json_path = os.path.join(DATA_DIR, 'data.json')
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

    # Auto-load CSV files
    csv_files = ['reactions.csv', 'data.csv', 'import.csv', 'shr_data.csv']
    for csv_file in csv_files:
        csv_path = os.path.join(DATA_DIR, csv_file)
        if os.path.exists(csv_path):
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    data.append(dict(row))

    return data

REACTION_DATA = load_data()
print(f"Loaded {len(REACTION_DATA)} reaction entries")


# ─── Helper: mol to SVG ──────────────────────────────────────────────────────
def mol_to_svg(smiles, width=200, height=150):
    """Convert SMILES to SVG string."""
    try:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            return None
        AllChem.Compute2DCoords(mol)
        drawer = rdMolDraw2D.MolDraw2DSVG(width, height)
        drawer.drawOptions().clearBackground = False
        drawer.DrawMolecule(mol)
        drawer.FinishDrawing()
        return drawer.GetDrawingText()
    except Exception:
        return None


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'entries': len(REACTION_DATA)})


@app.route('/api/search', methods=['POST'])
def search():
    """
    Substructure search using Python RDKit.
    Request body: { "smiles": "...", "limit": 100 }
    Returns: list of matching entries
    """
    body = request.get_json()
    if not body or 'smiles' not in body:
        return jsonify({'error': 'Missing smiles parameter'}), 400

    query_smiles = body['smiles'].strip()
    limit = int(body.get('limit', 100))

    # Parse query as SMILES first (stricter valence matching), then SMARTS
    query_mol = None
    try:
        query_mol = Chem.MolFromSmiles(query_smiles)
    except Exception:
        pass

    if query_mol is None:
        try:
            query_mol = Chem.MolFromSmarts(query_smiles)
        except Exception:
            pass

    if query_mol is None:
        return jsonify({'error': 'Invalid SMILES/SMARTS query'}), 400

    results = []
    seen = set()

    for entry in REACTION_DATA:
        for field in ['SMILES SM', 'SMILES Product']:
            smiles = entry.get(field, '').strip()
            if not smiles:
                continue

            key = f"{smiles}_{entry.get('Paper DOI', '')}_{entry.get('Step', '')}"
            if key in seen:
                continue

            try:
                mol = Chem.MolFromSmiles(smiles)
                if mol is None:
                    continue
                if mol.HasSubstructMatch(query_mol):
                    seen.add(key)
                    # Get matched atom indices for highlighting
                    match = mol.GetSubstructMatch(query_mol)
                    svg = mol_to_svg(smiles)
                    results.append({
                        'doi': entry.get('Paper DOI', ''),
                        'step': entry.get('Step', ''),
                        'role': 'SM' if field == 'SMILES SM' else 'Product',
                        'smiles': smiles,
                        'matched_atoms': list(match),
                        'svg': svg,
                        'reagents': entry.get('Reagents', ''),
                    })
                    if len(results) >= limit:
                        break
            except Exception:
                continue

        if len(results) >= limit:
            break

    return jsonify({
        'count': len(results),
        'results': results
    })


@app.route('/api/mol/svg', methods=['POST'])
def mol_svg():
    """Convert SMILES to SVG."""
    body = request.get_json()
    if not body or 'smiles' not in body:
        return jsonify({'error': 'Missing smiles'}), 400
    svg = mol_to_svg(body['smiles'], body.get('width', 200), body.get('height', 150))
    if svg is None:
        return jsonify({'error': 'Could not render molecule'}), 400
    return jsonify({'svg': svg})


@app.route('/api/data', methods=['GET'])
def get_data():
    """Return all reaction data (for frontend)."""
    return jsonify(REACTION_DATA)


# ─── Serve frontend static files ─────────────────────────────────────────────

@app.route('/')
def serve_index():
    """Serve the main index.html page."""
    return send_from_directory(FRONTEND_DIR, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (JS, CSS, data, etc.)."""
    file_path = os.path.join(FRONTEND_DIR, path)
    if os.path.isfile(file_path):
        return send_from_directory(FRONTEND_DIR, path)
    # Fallback to index.html for SPA routing
    return send_from_directory(FRONTEND_DIR, 'index.html')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=False)
