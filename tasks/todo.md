# Current Tasks

## Completed
- [x] Canvas-based molecular drawing tool with element buttons & functional groups
- [x] Structure Search page with substructure matching (SMILES-first, SMARTS fallback)
- [x] Search result detail modal with Go Database / Go Visualizer buttons
- [x] Visualizer layout: enlarged molecules (260×260), bond panel, 2 columns per row
- [x] Overview row at half-size (130×130)
- [x] Colored atom overlays: green=formed, red=broken, purple=both + order badges
- [x] Fix probe SVG dimensions for accurate atom circle positions
- [x] MCS-based atom-atom mapping backend (`/api/bond_changes`)
- [x] Frontend integration: async MCS fetch, atom index enrichment, fast path highlighting
- [x] Fix `autoDetected` ReferenceError breaking step layout
- [x] Fix `resetView()` centering
- [x] CLAUDE.md project documentation
- [x] Nginx reverse proxy setup (HTTPS on port 443 → localhost:3000)

## Pending / Known Issues
- [ ] MCS atom mapping may be inaccurate for complex rearrangements — team review needed
- [ ] Some reactions in data.json have identical SM and Product SMILES (data quality issue)
- [ ] URL path routing (e.g., `/shr`) — user considering but no preference yet
