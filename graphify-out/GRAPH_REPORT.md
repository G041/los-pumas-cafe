# Graph Report - C:/Users/gianf/Code/los-pumas-cafe  (2026-08-04)

## Corpus Check
- 14 files · ~18,447 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 244 nodes · 393 edges · 17 communities (16 shown, 1 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.74)
- Token cost: 88,384 input · 0 output

## Community Hubs (Navigation)
- Panel Bento: mover y redimensionar
- Worker: sesiones y CSV
- Estado global y distribucion del panel
- Shell HTML y puntos de montaje
- Ciclo de render y accesibilidad
- Utilidades de formato y CSV
- Flujo de cierre diario
- Armador de menu del dia
- Clima de San Isidro
- Dependencias del Worker
- Principios de diseno frontend
- Identidad visual del logo
- Cliente HTTP y sesion
- Gestion de platos
- Fotografia del local
- Sistema de iconos

## God Nodes (most connected - your core abstractions)
1. `json()` - 11 edges
2. `setBentoBox()` - 11 edges
3. `fetch()` - 9 edges
4. `Frontend Design Skill` - 9 edges
5. `renderAll()` - 9 edges
6. `renderMenu()` - 9 edges
7. `checkSession()` - 8 edges
8. `renderMenuBuilderView()` - 8 edges
9. `handleSave()` - 7 edges
10. `handleSavePlato()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `buildRows()` --references--> `STEPS`  [EXTRACTED]
  js/views/cierre.js → js/state.js
- `Frontend Design Skill` --references--> `Apache License 2.0`  [EXTRACTED]
  .claude/skills/frontend-design/SKILL.md → .claude/skills/frontend-design/LICENSE.txt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Theme Persistence and Application Flow** — index_theme_bootstrap, index_lospumas_theme_key, index_data_theme_attribute, index_theme_toggle_btn, index_styles_stylesheet_link [INFERRED 0.85]
- **JS-Rendered App Shell Mount Points** — index_fit_wrap, index_date_bar_mount, index_stepper_mount, index_app_mount, index_live_region [EXTRACTED 1.00]
- **Top Bar Global Controls** — index_logout_btn, index_theme_toggle_btn, index_menu_btn [EXTRACTED 1.00]
- **Circular Logo Visual System (mark, field, color, format)** — logo_circular_puma_silhouette, logo_circular_cyan_disc, logo_circular_cyan_accent_color, logo_circular_app_icon_format, logo_circular_two_tone_high_contrast [INFERRED 0.85]

## Communities (17 total, 1 thin omitted)

### Community 0 - "Panel Bento: mover y redimensionar"
Cohesion: 0.10
Nodes (44): activateBentoDrag(), applyBentoBox(), areaFree(), BENTO_HANDLE_DIRS, bentoAriaLabel(), bentoBoxStyle(), bentoEdgeScroll(), bentoGrid() (+36 more)

### Community 1 - "Worker: sesiones y CSV"
Cohesion: 0.19
Nodes (27): base64url(), base64urlToBytes(), checkPasswordAuth(), checkSession(), corsHeaders(), createSessionToken(), csvEscapeField(), fetch() (+19 more)

### Community 2 - "Estado global y distribucion del panel"
Cohesion: 0.09
Nodes (18): appEl, clampInt(), cloneLayout(), DASHBOARD_LAYOUT_DEFAULT, dashboardLayout, dateBarEl, db, fitWrapEl (+10 more)

### Community 3 - "Shell HTML y puntos de montaje"
Cohesion: 0.15
Nodes (19): #app Main View Mount Point, Cierre Diario (Daily Close) Workflow, data-theme Root Attribute Contract, #dateBar Date Strip Mount, #fitWrap Responsive Layout Wrapper, Render-Blocking Theme Application Avoids Flash of Wrong Theme, Implicit Global Namespace Coupling Between Scripts, #liveRegion ARIA Live Announcer (+11 more)

### Community 4 - "Ciclo de render y accesibilidad"
Cohesion: 0.21
Nodes (13): boot(), focusKeyOf(), liveRegionEl, logout(), playScreenTransition(), renderAll(), renderScreen(), restoreFocus() (+5 more)

### Community 5 - "Utilidades de formato y CSV"
Cohesion: 0.14
Nodes (3): MONTH_NAMES, parseCSVLine(), parsePlatosCSV()

### Community 6 - "Flujo de cierre diario"
Cohesion: 0.35
Nodes (9): buildRows(), cellContent(), errorMessage(), finalResult(), onConfirm(), renderApp(), s3(), s4() (+1 more)

### Community 7 - "Armador de menu del dia"
Cohesion: 0.33
Nodes (11): countNumberedPlatos(), executeMenuSave(), onCopiarMenuClick(), parseMenuLines(), renderMenuBuilderConfirmView(), renderMenuBuilderView(), renderPostresModalHtml(), renderTartasModalHtml() (+3 more)

### Community 8 - "Clima de San Isidro"
Cohesion: 0.24
Nodes (10): ensureWeather(), loadWeatherCache(), normalizeWeather(), retryWeather(), SAN_ISIDRO, saveWeatherCache(), weatherState, weatherUrl() (+2 more)

### Community 9 - "Dependencias del Worker"
Cohesion: 0.17
Nodes (11): allowScripts, esbuild@0.28.1, workerd@1.20260730.1, devDependencies, wrangler, name, private, scripts (+3 more)

### Community 10 - "Principios de diseno frontend"
Cohesion: 0.22
Nodes (11): Apache License 2.0, AI-Generated Design Defaults (Three Looks), Deliberate Motion, Design Process: Brainstorm, Explore, Plan, Critique, Build, Critique Again, Frontend Design Skill, Hero as Thesis, Match Complexity to Vision, Restraint and Self-Critique (+3 more)

### Community 11 - "Identidad visual del logo"
Cohesion: 0.43
Nodes (8): Ambiguous Silhouette Subject Reading, Circular App Icon / Avatar Format, Los Pumas Cafe Brand Identity, Cyan Brand Accent Color, Cyan Circular Badge Field, Los Pumas Cafe Circular Logo, Puma Silhouette Mark, Two-Tone High-Contrast Mark

### Community 12 - "Cliente HTTP y sesion"
Cohesion: 0.33
Nodes (3): IS_LOCAL_DEV, login(), storeSessionToken()

### Community 13 - "Gestion de platos"
Cohesion: 0.47
Nodes (3): renderDeletePlatoModalHtml(), renderPlatosView(), wireDeletePlatoModal()

### Community 14 - "Fotografia del local"
Cohesion: 0.70
Nodes (5): Los Pumas Café (physical café / brand), Round illuminated puma-silhouette logo signage reading "Los Pumas Café", Street-facing outdoor seating area under awning (tables and chairs), Los Pumas Café Storefront Photograph, Tree-lined urban street corner setting (parked cars, mixed low/high-rise buildings, chalkboard sign)

## Ambiguous Edges - Review These
- `Puma Silhouette Mark` → `Ambiguous Silhouette Subject Reading`  [AMBIGUOUS]
  logo_circular.png · relation: conceptually_related_to

## Knowledge Gaps
- **36 isolated node(s):** `name`, `private`, `dev`, `deploy`, `wrangler` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Puma Silhouette Mark` and `Ambiguous Silhouette Subject Reading`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `STEPS` connect `Estado global y distribucion del panel` to `Flujo de cierre diario`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `buildRows()` connect `Flujo de cierre diario` to `Estado global y distribucion del panel`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `private`, `dev` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Panel Bento: mover y redimensionar` be split into smaller, more focused modules?**
  _Cohesion score 0.0966183574879227 - nodes in this community are weakly interconnected._
- **Should `Estado global y distribucion del panel` be split into smaller, more focused modules?**
  _Cohesion score 0.08923076923076922 - nodes in this community are weakly interconnected._
- **Should `Utilidades de formato y CSV` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._