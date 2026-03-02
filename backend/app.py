"""
SHR Reaction Visualizer - Python RDKit Backend
Flask API for substructure search using RDKit
Also serves the static frontend files (HTML, JS, CSS)
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from rdkit import Chem
from rdkit.Chem import Draw, AllChem, rdFMCS
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


# ─── Bond change detection via MCS atom-atom mapping ────────────────────────

ORDER_SYM = {1.0: '-', 2.0: '=', 3.0: '#', 1.5: '~'}

def compute_bond_changes(sm_smiles, prod_smiles):
    """
    Compute exact bond changes between SM and Product using fragment-based
    MCS atom-atom mapping. Returns formed/broken bonds with specific atom indices.
    """
    sm_mol = Chem.MolFromSmiles(sm_smiles)
    prod_mol = Chem.MolFromSmiles(prod_smiles)
    if not sm_mol or not prod_mol:
        return None

    # Split into fragments for better MCS matching
    sm_frags = Chem.GetMolFrags(sm_mol, asMols=True, sanitizeFrags=True)
    prod_frags = Chem.GetMolFrags(prod_mol, asMols=True, sanitizeFrags=True)
    sm_frag_idx = Chem.GetMolFrags(sm_mol)
    prod_frag_idx = Chem.GetMolFrags(prod_mol)

    # ── Pass 1: Match SM fragments to Product fragments via MCS ──
    atom_map = {}       # sm_global_idx -> prod_global_idx
    used_prod_atoms = set()

    for si, sf in enumerate(sm_frags):
        best_mcs = 0
        best_pi = -1
        best_sm_match = None
        best_prod_match = None

        for pi, pf in enumerate(prod_frags):
            try:
                mcs = rdFMCS.FindMCS([sf, pf],
                    bondCompare=rdFMCS.BondCompare.CompareAny,
                    atomCompare=rdFMCS.AtomCompare.CompareElements,
                    matchValences=False,
                    timeout=5)
            except Exception:
                continue

            if mcs.numAtoms > best_mcs and mcs.smartsString:
                mcs_mol = Chem.MolFromSmarts(mcs.smartsString)
                if not mcs_mol:
                    continue
                sm_m = sf.GetSubstructMatch(mcs_mol)
                prod_m = pf.GetSubstructMatch(mcs_mol)
                if sm_m and prod_m:
                    # Check no conflict with already-used prod atoms
                    prod_globals = [prod_frag_idx[pi][j] for j in prod_m]
                    if not any(a in used_prod_atoms for a in prod_globals):
                        best_mcs = mcs.numAtoms
                        best_pi = pi
                        best_sm_match = sm_m
                        best_prod_match = prod_m

        if best_pi >= 0:
            for i in range(min(len(best_sm_match), len(best_prod_match))):
                sg = sm_frag_idx[si][best_sm_match[i]]
                pg = prod_frag_idx[best_pi][best_prod_match[i]]
                atom_map[sg] = pg
                used_prod_atoms.add(pg)

    # ── Pass 2: Try to map remaining unmapped atoms ──
    unmapped_sm = [i for i in range(sm_mol.GetNumAtoms()) if i not in atom_map]
    unmapped_prod = [i for i in range(prod_mol.GetNumAtoms()) if i not in used_prod_atoms]

    if unmapped_sm and unmapped_prod:
        # Build sub-molecules from unmapped atoms and try MCS
        # Simple approach: match by element + neighbor signature
        sm_elem_pool = {}
        for idx in unmapped_sm:
            elem = sm_mol.GetAtomWithIdx(idx).GetSymbol()
            sm_elem_pool.setdefault(elem, []).append(idx)

        for pidx in unmapped_prod:
            elem = prod_mol.GetAtomWithIdx(pidx).GetSymbol()
            if elem in sm_elem_pool and sm_elem_pool[elem]:
                sidx = sm_elem_pool[elem].pop(0)
                atom_map[sidx] = pidx
                used_prod_atoms.add(pidx)

    prod_to_sm = {v: k for k, v in atom_map.items()}

    # ── Detect bond changes ──
    formed = []
    broken = []

    # Build SM bonds mapped to Product atom space
    sm_bonds_mapped = {}
    for bond in sm_mol.GetBonds():
        a1, a2 = bond.GetBeginAtomIdx(), bond.GetEndAtomIdx()
        order = bond.GetBondTypeAsDouble()
        if a1 in atom_map and a2 in atom_map:
            pa1, pa2 = atom_map[a1], atom_map[a2]
            key = (min(pa1, pa2), max(pa1, pa2))
            sm_bonds_mapped[key] = (a1, a2, order)

    # Build Product bonds
    prod_bond_set = {}
    for bond in prod_mol.GetBonds():
        a1, a2 = bond.GetBeginAtomIdx(), bond.GetEndAtomIdx()
        order = bond.GetBondTypeAsDouble()
        key = (min(a1, a2), max(a1, a2))
        prod_bond_set[key] = (a1, a2, order)

    def bond_desc(mol, a1, a2, order):
        e1 = mol.GetAtomWithIdx(a1).GetSymbol()
        e2 = mol.GetAtomWithIdx(a2).GetSymbol()
        pair = sorted([e1, e2])
        sym = ORDER_SYM.get(order, '-')
        return f'{pair[0]}{sym}{pair[1]}'

    # Bonds in Product but not in mapped SM → FORMED
    for key, (pa1, pa2, p_order) in prod_bond_set.items():
        if key in sm_bonds_mapped:
            sa1, sa2, s_order = sm_bonds_mapped[key]
            if s_order != p_order:
                # Bond order changed → old order broken, new order formed
                broken.append({
                    'desc': bond_desc(sm_mol, sa1, sa2, s_order),
                    'sm_atoms': [sa1, sa2],
                    'prod_atoms': [pa1, pa2],
                    'bond_order': s_order
                })
                formed.append({
                    'desc': bond_desc(prod_mol, pa1, pa2, p_order),
                    'sm_atoms': [sa1, sa2],
                    'prod_atoms': [pa1, pa2],
                    'bond_order': p_order
                })
        else:
            # New bond in Product
            sm_a1 = prod_to_sm.get(pa1)
            sm_a2 = prod_to_sm.get(pa2)
            formed.append({
                'desc': bond_desc(prod_mol, pa1, pa2, p_order),
                'sm_atoms': [sm_a1, sm_a2],
                'prod_atoms': [pa1, pa2],
                'bond_order': p_order
            })

    # Bonds in mapped SM but not in Product → BROKEN
    for key, (sa1, sa2, s_order) in sm_bonds_mapped.items():
        if key not in prod_bond_set:
            broken.append({
                'desc': bond_desc(sm_mol, sa1, sa2, s_order),
                'sm_atoms': [sa1, sa2],
                'prod_atoms': [atom_map.get(sa1), atom_map.get(sa2)],
                'bond_order': s_order
            })

    # Bonds involving unmapped SM atoms (one end mapped, other not) → BROKEN
    for bond in sm_mol.GetBonds():
        a1, a2 = bond.GetBeginAtomIdx(), bond.GetEndAtomIdx()
        order = bond.GetBondTypeAsDouble()
        mapped1, mapped2 = a1 in atom_map, a2 in atom_map
        if mapped1 != mapped2:  # exactly one atom is mapped
            broken.append({
                'desc': bond_desc(sm_mol, a1, a2, order),
                'sm_atoms': [a1, a2],
                'prod_atoms': [atom_map.get(a1), atom_map.get(a2)],
                'bond_order': order
            })

    # Bonds involving unmapped Product atoms (one end mapped, other not) → FORMED
    for bond in prod_mol.GetBonds():
        a1, a2 = bond.GetBeginAtomIdx(), bond.GetEndAtomIdx()
        order = bond.GetBondTypeAsDouble()
        mapped1, mapped2 = a1 in prod_to_sm, a2 in prod_to_sm
        if mapped1 != mapped2:
            formed.append({
                'desc': bond_desc(prod_mol, a1, a2, order),
                'sm_atoms': [prod_to_sm.get(a1), prod_to_sm.get(a2)],
                'prod_atoms': [a1, a2],
                'bond_order': order
            })

    # ── H bond changes (implicit H count differences) ──
    for sm_idx, prod_idx in atom_map.items():
        try:
            sm_h = sm_mol.GetAtomWithIdx(sm_idx).GetTotalNumHs()
            prod_h = prod_mol.GetAtomWithIdx(prod_idx).GetTotalNumHs()
            diff = prod_h - sm_h
            elem = sm_mol.GetAtomWithIdx(sm_idx).GetSymbol()
            if diff > 0:
                for _ in range(diff):
                    desc = f'H-{elem}' if 'H' < elem else f'{elem}-H'
                    formed.append({
                        'desc': desc,
                        'sm_atoms': [sm_idx],
                        'prod_atoms': [prod_idx],
                        'bond_order': 1.0
                    })
            elif diff < 0:
                for _ in range(-diff):
                    desc = f'H-{elem}' if 'H' < elem else f'{elem}-H'
                    broken.append({
                        'desc': desc,
                        'sm_atoms': [sm_idx],
                        'prod_atoms': [prod_idx],
                        'bond_order': 1.0
                    })
        except Exception:
            continue

    return {
        'formed': formed,
        'broken': broken,
        'atom_map': {str(k): v for k, v in atom_map.items()}
    }


@app.route('/api/bond_changes', methods=['POST'])
def bond_changes():
    """
    Compute exact bond changes between SM and Product using MCS atom-atom mapping.
    Request: { "sm": "SMILES", "prod": "SMILES" }
    Returns: { formed: [...], broken: [...], atom_map: {...} }
    """
    body = request.get_json()
    if not body or 'sm' not in body or 'prod' not in body:
        return jsonify({'error': 'Missing sm or prod parameter'}), 400

    sm = body['sm'].strip()
    prod = body['prod'].strip()

    try:
        result = compute_bond_changes(sm, prod)
        if result is None:
            return jsonify({'error': 'Could not compute bond changes'}), 400
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
