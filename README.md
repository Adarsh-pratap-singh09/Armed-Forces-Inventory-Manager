# Indian Armed Forces Logistics & Inventory Simulation System

An undergraduate academic simulation and decision-support web application modeling multi-echelon supply chain dynamics, continuous-review inventory control, tactical vehicle maintenance scheduling, and time-series demand forecasting across military logistics depots.

> **ACADEMIC & ETHICAL DISCLAIMER**  
> All data, depot tempos, vehicle registries, and demand histories contained in this repository are **100% synthetic**, generated via seeded pseudo-random numerical generators for academic research and educational demonstration. No classified information, real-world operational deployments, weapons, or ammunition are modeled.

---

## 1. Quick Start & Installation

### Prerequisites
* **Node.js** (v18.0.0 or later; verified on Node.js v22.19.0)
* **npm** (v9.0.0 or later)

### Installation
Clone or navigate to the repository directory and install project dependencies:

```bash
cd indian-defence-logistics
npm install
```

### Launch Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173` to explore the system.

### Production Build
```bash
npm run build
npm run preview
```

---

## 2. Demo User Credentials

The application implements strict Role-Based Access Control (RBAC). Five demo accounts are pre-configured:

| Role | Name & Rank | Username | Demo Password | Scope & Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Store Officer** | Maj R. Thakur | `rthakur` | `thakur123` | Scoped to **Jodhpur Depot** (Army). Can add/edit/delete local stock, create requisitions, log vehicle servicing, and fulfill approved orders. |
| **Store Officer** | Capt A. Rao | `arao` | `rao123` | Scoped to **Leh Depot** (Army, high-altitude logistics). Local inventory and maintenance management. |
| **Store Officer** | Lt Cdr K. Nair | `knair` | `nair123` | Scoped to **Kochi Depot** (Navy). Naval commodity management. |
| **Commander** | Brig S. Menon | `smenon` | `menon123` | Enterprise-wide access (all 8 depots). Approves or rejects procurement requisitions; views audit trails and fleet metrics (read-only on stock). |
| **Administrator** | Lt Col P. Bose | `pbose` | `bose123` | Enterprise-wide access. Manages user accounts, resets sample data, views full audit log (strict separation of duties: cannot edit stock or approve requisitions). |

*Quick-select cards in the accessible Personnel Authentication Modal allow instant one-click login for any demo persona. The modal can be triggered at any time via the Navbar "Sign In" button or by navigating to any protected route.*

---

## 3. NPM Scripts Reference

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Starts Vite local development server with hot module replacement (HMR). |
| `npm run build` | `vite build` | Compiles production assets into `dist/` with code splitting and minification. |
| `npm run lint` | `eslint .` | Runs ESLint validation across all source and test files. |
| `npm test` | `node --test tests/forecast.test.js tests/experiments.test.js` | Executes all 21 automated unit tests using Node.js built-in runner. |
| `npm run test:contrast` | `node scripts/check-contrast.mjs` | Audits 45 WCAG 2.1 AA relative luminance contrast ratios across text, buttons, accents, and inputs. |
| `npm run test:forecast` | `node --test tests/forecast.test.js` | Tests pure forecasting algorithms, mathematical metrics, and rolling-origin backtesting against hand-checked analytical cases. |
| `npm run test:experiments` | `node --test tests/experiments.test.js` | Tests 90-series benchmark determinism, paired bootstrap 95% CI properties, and statistical aggregators. |
| `npm run experiments` | `node src/forecasting/runExperiments.js` | Executes the headless empirical benchmark (90 benchmark series + 99 depot pairs + 30 vehicles) in ~160 ms and writes 7 CSV files to `./results/`. |

---

## 4. Project Directory Structure

```text
indian-defence-logistics/
├── dist/                          # Production build output
├── public/                        # Static public assets
├── results/                       # Empirical CSV outputs from experiment engine
│   ├── benchmark_series.csv       # 90 synthetic benchmark series (104 weeks)
│   ├── results_per_series.csv     # Per-series origin-aggregated evaluation metrics
│   ├── summary_by_pattern.csv     # Mean, median, std, and wins grouped by pattern
│   ├── bootstrap_ci.csv           # Paired bootstrap 95% CIs vs SES (alpha=0.3)
│   ├── surge_analysis.csv         # Surge vs non-surge lead-time errors & inflation ratio
│   ├── case_study_depots.csv      # Empirical metrics for 99 stocked depot lines
│   └── vehicles.csv               # Tactical vehicle engine run-hour forecasts
├── src/
│   ├── components/                # Reusable UI components & App Shell
│   │   ├── ui/                    # Command console design system component suite
│   │   │   ├── Field.jsx          # Styled form label, helper text, and input wrapper
│   │   │   ├── index.js           # Barrel export for UI design system
│   │   │   ├── KpiTile.jsx        # Telemetry KPI tile with top stripes, mono labels, count-up
│   │   │   ├── Panel.jsx          # Tactical container with chamfered brackets & badge
│   │   │   ├── RadialGauge.jsx    # Circular HUD meter for asset interval & stock usage
│   │   │   ├── rechartsTheme.jsx  # Unified dark theme configuration for Recharts
│   │   │   ├── SegmentedControl.jsx # Monospace pill toggle for view modes & algorithms
│   │   │   ├── Sparkline.jsx      # Compact inline SVG demand trend graph
│   │   │   └── StatusChip.jsx     # Status badge with animated pulsing indicator
│   │   ├── CountUp.jsx            # Animated numeric counter with easeOutQuad & motion safety
│   │   ├── Footer.jsx             # Universal academic disclaimer footer
│   │   ├── LoginModal.jsx         # Accessible ARIA modal with styled persona credential cards
│   │   ├── Navbar.jsx             # Role-aware navigation bar
│   │   ├── PageHero.jsx           # Thematic military hero banners with right-aligned fade mask
│   │   ├── ProtectedRoute.jsx     # Route guard with inline page hero & login-required card
│   │   ├── Sidebar.jsx            # Collapsible command console sidebar with role grouping
│   │   └── TopStatusBar.jsx       # Slim 48px status bar with breadcrumbs & sim-date chip
│   ├── context/                   # React Context state providers (persisted to storage)
│   │   ├── AuditContext.jsx       # Append-only operational audit logging
│   │   ├── AuthContext.jsx        # Authentication, session state, and user management
│   │   ├── InventoryContext.jsx   # Continuous-review inventory ledger & stock policies
│   │   ├── RequisitionContext.jsx # Indent lifecycle (creation, approval, fulfillment)
│   │   └── VehicleContext.jsx     # Tactical fleet maintenance tracker & intervals
│   ├── data/                      # Synthetic data models & deterministic generators
│   │   ├── auditLogs.js           # Baseline seed audit records
│   │   ├── demandGenerator.js     # Multiplicative demand simulation engine
│   │   ├── depots.js              # 8 Logistics Depots (Army, Navy, Air Force)
│   │   ├── items.js               # 15 Realistic military logistics commodities
│   │   ├── prng.js                # Seeded Mulberry32 pseudo-random number generator
│   │   ├── users.js               # Demo user credentials and RBAC definitions
│   │   └── vehicles.js            # 30 Tactical transport vehicles and engine hour histories
│   ├── forecasting/               # Pure mathematical forecasting algorithms (zero black boxes)
│   │   ├── evaluate.js            # Rolling-origin evaluation framework
│   │   ├── experiments.js         # Shared benchmark generator, backtest runner & bootstrap CI
│   │   ├── index.js               # Forecasting module barrel export
│   │   ├── methods.js             # Naive, Moving Average, SES, Seasonal Naive algorithms
│   │   ├── metrics.js             # MAE, RMSE, Mean Bias, Normalized MAE (nMAE)
│   │   ├── predictiveAlerts.js    # Forward-looking stockout and maintenance early warnings
│   │   └── runExperiments.js      # Headless Node.js CLI script for automated benchmarking
│   ├── pages/                     # Application page views
│   │   ├── About.jsx              # Method & data documentation (10 formal sections)
│   │   ├── Alerts.jsx             # Predictive Early Warning Centre
│   │   ├── AuditLog.jsx           # Enterprise audit trail viewer
│   │   ├── Dashboard.jsx          # Operational headquarters dashboard with Recharts
│   │   ├── DemandExplorer.jsx     # Time-series demand analysis and surge explorer
│   │   ├── Experiments.jsx        # Interactive experiment runner, charts, and 6 data tables
│   │   ├── Fleet.jsx              # Redirect wrapper to /maintenance
│   │   ├── Forecast.jsx           # 26-week demand projections & stock-out runway area chart
│   │   ├── Home.jsx               # Public landing hero and logistics architecture overview
│   │   ├── Inventory.jsx          # Stock ledger, filter/sort, and CRUD modal forms
│   │   ├── MaintenanceList.jsx    # Fleet maintenance list and interval progress meters
│   │   ├── Requisitions.jsx       # Procurement requisition review and approval workflow
│   │   ├── Users.jsx              # Administrator user management panel
│   │   └── VehicleDetail.jsx      # In-depth vehicle lifecycle, usage chart, and service actions
│   ├── App.css                    # Unified muted military CSS theme & design system
│   ├── App.jsx                    # Root application router and route registry
│   └── main.jsx                   # React 19 entry point
├── tests/                         # Node.js automated test suites
│   ├── experiments.test.js        # Benchmark generator, bootstrap CI, and aggregator tests
│   └── forecast.test.js           # Pure forecasting and metric hand-checked tests
├── eslint.config.js               # ESLint 9 configuration
├── index.html                     # HTML5 shell with Barlow Condensed typography
├── package.json                   # Project metadata and script definitions
├── PROGRESS.md                    # Detailed milestone documentation (Sessions 1–6)
└── vite.config.js                 # Vite bundler configuration
```

---

## 5. Architectural & Design Highlights

* **Pure Mathematical Algorithms:** All forecasting models (Naive, $w$-week Moving Average, Simple Exponential Smoothing with parameter $\alpha$, and 52-week Seasonal Naive) are implemented in plain JavaScript without external math or ML libraries.
* **Rolling-Origin Backtesting:** Evaluation advances origin by origin across Year 2 ($t \in [52, 104 - L]$), providing rigorous, leakage-free empirical error metrics.
* **Paired Bootstrap Inference:** Statistical significance of forecasting variants is established via 2,000 paired bootstrap resamples against baseline SES ($\alpha = 0.3$).
* **Proactive Stock-Out Runway:** Bridges demand forecasts directly to continuous-review inventory, calculating the exact week $h$ where projected remaining stock $S_h \le 0$ to issue proactive alerts prior to stockout.
* **WCAG 2.1 AA Command Console Palette:** High-contrast dark command console theme strictly verified via automated script (`npm run test:contrast` passing 45/45 checks). Base background `#0c110d`, panel surface `#182118`, raised surface `#212d21`, input surface `#2a382a`, borders `rgba(190, 210, 160, 0.22)`, primary text `#f1f4e8` ($\ge 11.1:1$ contrast ratio), secondary text `#c9d1b8` ($\ge 7.8:1$), muted text `#a3ad94` ($\ge 5.2:1$), sage `#a9c486`, sand `#d8cb9f`, amber `#e0a947`, brick `#d4705a`, and steel `#86a9cc`. Primary action buttons use sand `#d8cb9f` with dark ink `#1a1f14` ($10.37:1$), and secondary buttons use transparent fill with sand border and `#f1f4e8` text ($\ge 11.1:1$).
* **Command Console Bento Architecture:** Features a collapsible tactical sidebar (`Sidebar.jsx`), slim top status bar (`TopStatusBar.jsx`) with simulated clock chip, and responsive bento layouts.
* **Interactive Master-Detail & Kanban Workflows:** Master-detail telemetry layout in Inventory with `RadialGauge` and `Sparkline`; 4-column drag-and-drop style Kanban board for Procurement Requisitions with direct Commander approvals; and terminal-style monospace live feed for immutable Audit Logging.
* **Abstract Tactical Visualizations:** Abstract 8-depot schematic network grid without country or border outlines; early-warning tactical radar display with animated sweep and pulsing depot blips; and dark-themed Recharts charts using `RECHARTS_THEME`.
* **Accessible Component Interactions:** Features chamfered military card geometry (`Panel`, `.card-bracket`), smooth easing numeric count-ups (`KpiTile`), status badges with pulsing live indicators (`StatusChip`), sticky TOC documentation navigation, subtle button lifts, and an accessible modal authentication system (`role="dialog"`, focus trap, Escape/backdrop dismiss) that strictly respects `prefers-reduced-motion: reduce`.
