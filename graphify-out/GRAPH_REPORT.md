# Graph Report - C:/Users/gianf/Code/los-pumas-cafe  (2026-08-02)

## Corpus Check
- 7 files · ~212,039 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 130 nodes · 207 edges · 12 communities (11 shown, 1 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.88)
- Token cost: 243,246 input · 0 output

## Community Hubs (Navigation)
- Worker Auth & API Handlers
- Menu Builder & Platos CRUD
- Daily Cierre Ledger Flow
- Worker Package Dependencies
- Frontend Design Skill Guide
- Session Login & CSV Fetch
- Circular Logo Design (v1)
- Facturacion Reports & Export
- Circular Logo Design (v2)
- Cafe Storefront Photograph
- Blank Menu Template Layout
- Original Square Logo

## God Nodes (most connected - your core abstractions)
1. `renderAll()` - 20 edges
2. `json()` - 11 edges
3. `fetch()` - 9 edges
4. `Frontend Design Skill` - 9 edges
5. `checkSession()` - 8 edges
6. `handleSave()` - 7 edges
7. `handleSavePlato()` - 7 edges
8. `renderMenuBuilderView()` - 7 edges
9. `renderPlatosView()` - 7 edges
10. `handleDeletePlato()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Frontend Design Skill` --references--> `Apache License 2.0`  [EXTRACTED]
  .claude/skills/frontend-design/SKILL.md → .claude/skills/frontend-design/LICENSE.txt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cierre Diario State Management Flow** — index_state, index_renderapp, index_buildrows, index_cellcontent, index_onconfirm, index_trysave, index_s3, index_s4, index_finalresult [INFERRED 0.85]
- **Platos Catalog Shared State Group** — index_platosdb, index_fetchplatos, index_findplatobyname, index_renderplatosview, index_rendermenubuilderview, index_saveplato, index_deleteplato, index_executemenusave [INFERRED 0.85]
- **Menu Builder Shared State Group** — index_menubuilderstate, index_rendermenubuilderview, index_oncopiarmenuclick, index_executemenusave, index_undolastplato, index_wirepostresmodal, index_rendermenubuilderconfirmview [INFERRED 0.85]
- **Circular Badge Formed by Puma, Wreath, and Wordmark** — logo_circular2_puma_silhouette, logo_circular2_laurel_wreath, logo_circular2_los_pumas_cafe_wordmark [EXTRACTED 1.00]

## Communities (12 total, 1 thin omitted)

### Community 0 - "Worker Auth & API Handlers"
Cohesion: 0.19
Nodes (27): base64url(), base64urlToBytes(), checkPasswordAuth(), checkSession(), corsHeaders(), createSessionToken(), csvEscapeField(), fetch() (+19 more)

### Community 1 - "Menu Builder & Platos CRUD"
Cohesion: 0.12
Nodes (16): deletePlato(), errorMessage(), executeMenuSave(), findPlatoByName(), logout(), menuBuilderState (global menu builder state object), normalizeName(), onCopiarMenuClick() (+8 more)

### Community 2 - "Daily Cierre Ledger Flow"
Cohesion: 0.23
Nodes (8): buildRows(), cellContent(), finalResult(), isFirstOfMonth(), onConfirm(), renderApp(), state (global cierre state object), trySave()

### Community 3 - "Worker Package Dependencies"
Cohesion: 0.17
Nodes (11): allowScripts, esbuild@0.28.1, workerd@1.20260730.1, devDependencies, wrangler, name, private, scripts (+3 more)

### Community 4 - "Frontend Design Skill Guide"
Cohesion: 0.22
Nodes (11): Apache License 2.0, AI-Generated Design Defaults (Three Looks), Deliberate Motion, Design Process: Brainstorm, Explore, Plan, Critique, Build, Critique Again, Frontend Design Skill, Hero as Thesis, Match Complexity to Vision, Restraint and Self-Critique (+3 more)

### Community 5 - "Session Login & CSV Fetch"
Cohesion: 0.27
Nodes (8): clearSessionToken(), fetchData(), fetchPlatos(), login(), parseCSV(), parsePlatosCSV(), submitPassword(), tryResumeSession()

### Community 6 - "Circular Logo Design (v1)"
Cohesion: 0.52
Nodes (7): '35 años' Script Text (Anniversary Banner), Address Text 'Martin y Omar 294, San Isidro', Blue Circular Badge Background, Blue Laurel Wreath Border, Los Pumas Cafe Circular Logo (35 años), 'LOS PUMAS CAFE' Wordmark Banner, Black Puma Silhouette Graphic

### Community 7 - "Facturacion Reports & Export"
Cohesion: 0.47
Nodes (5): db (global closed-days array), downloadXLSX(), groupByMonth(), monthLabel(), renderFacturacionView()

### Community 8 - "Circular Logo Design (v2)"
Cohesion: 0.47
Nodes (6): "MARTIN Y OMAR 294, SAN ISIDRO" Address Line, "35 años" Anniversary Script Text, "LOS PUMAS CAFE" Wordmark Banner, Laurel Wreath Border Motif, Los Pumas Cafe Circular Logo, Black Puma/Feline Silhouette Mascot

### Community 9 - "Cafe Storefront Photograph"
Cohesion: 0.70
Nodes (5): Los Pumas Café (physical café / brand), Round illuminated puma-silhouette logo signage reading "Los Pumas Café", Street-facing outdoor seating area under awning (tables and chairs), Los Pumas Café Storefront Photograph, Tree-lined urban street corner setting (parked cars, mixed low/high-rise buildings, chalkboard sign)

### Community 10 - "Blank Menu Template Layout"
Cohesion: 0.50
Nodes (5): Contact Footer (phone, WhatsApp, email, address, Instagram), Los Pumas Cafe Header Logo (circular puma mark), Numbered Blank Menu Item Rows (1-8), Nuestros Postres (Our Desserts) Section, Los Pumas Cafe Blank Menu Template

## Knowledge Gaps
- **13 isolated node(s):** `name`, `private`, `dev`, `deploy`, `wrangler` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderAll()` connect `Menu Builder & Platos CRUD` to `Daily Cierre Ledger Flow`, `Session Login & CSV Fetch`, `Facturacion Reports & Export`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Why does `submitPassword()` connect `Session Login & CSV Fetch` to `Menu Builder & Platos CRUD`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `renderFacturacionView()` connect `Facturacion Reports & Export` to `Menu Builder & Platos CRUD`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `name`, `private`, `dev` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Menu Builder & Platos CRUD` be split into smaller, more focused modules?**
  _Cohesion score 0.1168091168091168 - nodes in this community are weakly interconnected._