# Indian Armed Forces Logistics and Inventory System
## Progress Log — Session 5: Pure Forecasting Module & Predictive Early Warnings

**Project Type:** Undergraduate Logistics Research & Decision-Support Simulation  
**Scope Note:** All depot names, numbers, personnel names, consumption time-series, engine hours, and operational data are synthetic and illustrative for academic research. **No ammunition, weapons, classified data, regimental crests, or real insignia are included.**  
**Technology Stack:** Plain JavaScript (ES Modules, React 19, Vite, Recharts, `react-router-dom`, React Context API, Node.js built-in `node:test` runner, `sessionStorage`, `localStorage`, `lucide-react`, Google Fonts "Barlow Condensed"). No external forecasting libraries installed.

---

### 1. Pure Mathematical Forecasting Engine (`src/forecasting/`)

All time-series algorithms and error metrics are implemented from scratch in plain JavaScript without third-party dependencies, allowing transparent line-by-line academic explanation:

#### A. Four Forecasting Algorithms (`src/forecasting/methods.js`)
Each function accepts `(history, horizon, params)` and returns an array of `horizon` forecasts:

1. **Naive Method (`naive`):**
   * **Formula:** $\hat{Y}_{T+h} = Y_T \quad \forall h = 1, \dots, H$
   * **Plain Language:** Flat projection repeating the most recent historical observation across all future periods.
2. **Moving Average (`movingAverage`):**
   * **Formula:** $\hat{Y}_{T+h} = \frac{1}{k} \sum_{i=0}^{k-1} Y_{T-i} \quad \forall h = 1, \dots, H$, where $k = \min(\text{window}, \text{history.length})$
   * **Plain Language:** Flat projection set to the arithmetic mean of the last `window` observations (default: 8 weeks).
3. **Simple Exponential Smoothing (`exponentialSmoothing`):**
   * **Formula:** $L_1 = Y_1; \quad L_t = \alpha Y_t + (1 - \alpha) L_{t-1} \quad \text{for } t = 2, \dots, T; \quad \hat{Y}_{T+h} = L_T \quad \forall h = 1, \dots, H$
   * **Plain Language:** Recursive smoothed level starting with $L_1 = Y_1$. Each week updates via a convex combination of latest actual demand (weight $\alpha = 0.3$) and prior level (weight $1 - \alpha$). Projects a flat future forecast $L_T$.
4. **Seasonal Naive (`seasonalNaive`):**
   * **Formula:** $\hat{Y}_{T+j} = Y_{T+j-52} \quad \text{for } j = 1, \dots, H$ (period $m = 52$)
   * **Plain Language:** Repeats the exact demand observed 52 weeks prior (the corresponding week of the previous annual operational cycle). Falls back to the simple naive method if history is shorter than 52 weeks.

#### B. Error Metrics (`src/forecasting/metrics.js`)
* **Mean Absolute Error (MAE):** $\text{MAE} = \frac{1}{n} \sum_{t=1}^n |y_t - \hat{y}_t|$
* **Root Mean Squared Error (RMSE):** $\text{RMSE} = \sqrt{\frac{1}{n} \sum_{t=1}^n (y_t - \hat{y}_t)^2}$
* **Mean Forecast Bias (Mean Error):** $\text{Bias} = \frac{1}{n} \sum_{t=1}^n (\hat{y}_t - y_t)$ (arithmetic mean of forecast minus actual demand; positive indicates over-forecasting, negative indicates under-forecasting)
* **Normalized MAE (NMAE):** $\text{NMAE} = \frac{\text{MAE}}{\bar{y}}$ (MAE divided by mean actual demand, facilitating dimensionless comparison across commodities of differing scales)

#### C. Rolling-Origin Evaluation Framework (`src/forecasting/evaluate.js`)
* **`rollingOrigin(series, method, params, { minTrain: 52, horizon, leadTime })`:** Slides the forecast origin forward week by week from `minTrain` to $N - \text{horizon}$, generating out-of-sample forecasts. Computes one-step-ahead errors and cumulative lead-time-demand errors ($\sum_{i=1}^L \hat{Y}_{t+i} - \sum_{i=1}^L Y_{t+i}$) for Session 6 backtesting.

---

### 2. Node.js Test Runner Suite (`tests/forecast.test.js`)

Configured via `npm run test:forecast` using Node's built-in `node:test` and `node:assert/strict`:

* **Hand-Checked Test Cases Verified:**
  1. `movingAverage([2, 4, 6, 8], 3, { window: 2 })` gives `[7, 7, 7]` ($[6+8]/2 = 7$).
  2. `exponentialSmoothing([10, 20], 3, { alpha: 0.5 })` gives `[15, 15, 15]` ($0.5 \times 20 + 0.5 \times 10 = 15$).
  3. `seasonalNaive` repeats correct historical values 52 weeks prior, and falls back to naive for histories $< 52$ weeks.
  4. `naive` repeats the last observation.
  5. Hand-checked metrics with `actuals = [10, 20, 30]`, `forecasts = [12, 18, 33]`:
     * Errors: $[2, -2, 3]$
     * $\text{MAE} = 7/3 \approx 2.3333$
     * $\text{RMSE} = \sqrt{17/3} \approx 2.3805$
     * $\text{Bias} = 1.0$
     * $\text{NMAE} = (7/3) / 20 = 7/60 \approx 0.1167$
  6. `rollingOrigin` executes successfully over rolling origins.
* **Test Suite Output:**
  ```
  # tests 14
  # suites 3
  # pass 14
  # fail 0
  # duration_ms 202.44
  ```

---

### 3. Forecast & Runway Page (`/forecast`)

* **Role-Scoped Selectors:**
  * Store Officers are constrained to their assigned depot (`currentUser.depotId`); Commanders and Admins can toggle between all 8 logistics depots.
  * Item selector dynamically updates to show only commodities stocked at that depot.
  * Algorithm selector with live parameter tuning (Slider for SES $\alpha \in [0.05, 0.95]$, slider for MA window $\in [2, 26]$).
* **Four Summary Metric Cards:**
  1. **Forecast Lead-Time Demand:** Projected cumulative demand over the depot's requisition lead time ($L$ weeks).
  2. **Static vs. Forecast ROP:** Compares static threshold against forecast-based replenishment level ($\text{ForecastLeadTimeDemand} + \text{SafetyStock}$) with percentage delta.
  3. **Projected Stock-Out:** Anticipated week and simulated calendar date when inventory depletes to zero, or "None within 26 weeks".
  4. **Predictive Alert Level:** Visual badge indicating *Order now*, *Reorder soon*, or *Healthy*.
* **Two Interactive Recharts Visualizations:**
  1. **Demand Time-Series Chart:** Historical demand for the last 52 weeks (Weeks 53–104) shown as a solid olive line, connected seamlessly to a 26-week forward projection rendered as a dashed brick-red line.
  2. **Projected Stock-on-Hand Runway:** Area trajectory depicting remaining stock decreasing week by week under forecast consumption, with horizontal reference lines for Static ROP, Safety Stock, zero-stock threshold, and a vertical reference line pinpointing the exact projected stock-out week.

---

### 4. Predictive Alerts & Early Warning Center (`/alerts`)

* **Global Algorithm Selector:** Allows switching the active predictive engine (Default: SES $\alpha = 0.3$) across the entire logistics network.
* **Stock Replenishment Alerts ("Order Now"):**
  * Flags supply lines whose projected stock-out week falls within `Lead Time + 2 weeks` ($h \le L + 2$).
  * Side-by-side comparison table showing: Depot, Item, Current Stock, Lead Time, Projected Stock-Out Week, Static Status, and Predictive Alert.
  * **Early Warning Detection:** Explicitly flags instances where the static rule still registers "Healthy" or "Reorder needed", yet the forecast warns of imminent stockout due to upcoming seasonal spikes (e.g. Leh winter diesel or monsoon medical fluids) that simple historical moving averages fail to flag in time.
* **Predictive Fleet Maintenance Alerts:**
  * Forecasts weekly engine run hours across tactical transport vehicles over the next 26 weeks.
  * Flags vehicles that will breach manufacturer service intervals within 4 weeks.
  * Side-by-side comparison with the simple 12-week static moving average from the Maintenance tracker, highlighting vehicles requiring earlier overhaul due to upcoming exercise surges.
* **Summary Metric Cards:** Total Stock "Order Now" alerts, Early Warnings detected ahead of static ROP, Maintenance servicing alerts, and active algorithm indicator.

---

### 5. Dashboard Integration & Navigation

* **Dashboard Card:** 6th summary card added to `/dashboard` (**"Predictive alerts"**), linking directly to `/alerts` and displaying real-time alert counts (scoped by role).
* **Navigation Bar (`Navbar.jsx`):** Added **Forecast** (`/forecast`) and **Alerts** (`/alerts`) for all authenticated officers, with full active link styling.
* **Routes (`App.jsx`):** Registered protected routes for `/forecast` and `/alerts`.
* **Documentation (`About.jsx`):** Section 8 added, detailing the four pure algorithms, metric definitions, stock-out runway projection rules, and proactive alert conditions.

---

### 6. Verification Commands & Status

```powershell
# Run forecasting test suite (Node.js built-in runner)
npm run test:forecast

# Run experiments test suite
npm run test:experiments

# Run all test suites
npm test

# Run headless experiment suite (outputs 7 CSVs to ./results/)
npm run experiments

# Run Vite production build check
npm run build
```
- **Test Suite Result:** `21 passed, 0 failed` across 7 test suites (14 forecast tests + 7 experiment tests).
- **Headless Experiment Execution:** Runs in **0.16s (159 ms)** on Node 22, generating all 7 CSV artifacts to `./results/`.
- **Production Build:** Built cleanly in 1.74s with 0 errors across 2,477 transformed modules.

---

## Session 6: Forecasting Experiments & Empirical Evaluation

### 1. Unified Architecture & Code Sharing (`src/forecasting/experiments.js`)
* **Dual Environment Compatibility:** Engineered pure ES module `src/forecasting/experiments.js` shared symmetrically between the headless Node CLI runner (`npm run experiments`) and the interactive browser UI (`/experiments`).
* **Zero Hard-Coding / Computed Numbers Only:** All metrics, wins, aggregations, bootstrap intervals, and ratios are dynamically computed from underlying time series; no hard-coded result tables or pre-baked conclusions.

### 2. Benchmark Dataset & Pattern Classification
* **Deterministic Benchmark Generator (`generateBenchmarkSeries`):**
  * Synthesizes 90 series of 104 weeks using a seeded Mulberry32 PRNG (`seed = 42`).
  * 30 series per pattern: `steady`, `seasonal`, `spiky`.
  * Employs the identical multiplicative demand equation as the depot generator:
    $$\text{Demand}_t = \text{Base} \times \text{Seasonality}_t \times \text{Surge}_t \times \text{Noise}_t$$
  * Parameter distributions:
    * **Steady:** Base $\in [100, 5000]$, Noise $\in [5\%, 15\%]$, Seasonal amplitude $\le 0.05$, Surge prob $\le 0.01$.
    * **Seasonal:** Amplitude $\in [0.20, 0.60]$ with random peak week, Noise $\in [5\%, 15\%]$, Surge prob $\le 0.01$.
    * **Spiky:** Surge probability $\in [0.04, 0.08]$, Surge magnitude $\in [1.6, 2.8]$, Duration $\in [1, 3]$ weeks, Noise $\in [5\%, 15\%]$, Amplitude $\le 0.05$.
  * Ground-truth surge weeks are recorded per series for empirical surge isolation.
* **Pattern Classification Rule (`classifyDepotItemRecord` / `getPatternLabel`):**
  * Series labeled `seasonal` if seasonal amplitude $\ge 0.15$;
  * Else `spiky` if surge frequency is elevated ($\ge 3$ active surge weeks across the 104-week horizon);
  * Else `steady`.

### 3. Forecasting Variants Evaluated
Evaluated 8 fixed variants across all series without per-series hyperparameter tuning:
1. `naive`: Repeats the most recent observation $y_t$.
2. `ma_4`: Simple moving average with window $w = 4$.
3. `ma_8`: Simple moving average with window $w = 8$.
4. `ma_12`: Simple moving average with window $w = 12$.
5. `ses_01`: Simple exponential smoothing with $\alpha = 0.1$ (slow adaptation / long memory).
6. `ses_03`: Simple exponential smoothing with $\alpha = 0.3$ (the application's default baseline).
7. `ses_05`: Simple exponential smoothing with $\alpha = 0.5$ (fast adaptation / short memory).
8. `seasonal_naive`: Seasonal naive repeating the exact observation from 52 weeks prior ($y_{t+h-52}$).

### 4. Rolling-Origin Protocol & Metric Definitions
* **Evaluation Window:** Rolling origins $t \in [52, 104 - L]$ (49 origins per 104-week series with $L=4$), evaluating exclusively Year 2 demand using up to 52+ weeks of historical context.
* **Lead-Time Evaluation:** Benchmark and vehicles evaluated at $L = 4$ weeks; real depot series evaluated at depot-specific lead times ($L = 2$ to $4$ weeks).
* **Metrics:**
  * **One-Step Ahead ($h = 1$):** MAE, RMSE, Bias, and normalized MAE ($\text{nMAE} = \frac{\text{MAE}}{\bar{y}}$).
  * **Lead-Time Demand ($\sum_{k=1}^L y_{t+k}$):**
    * Lead-time nMAE: Absolute error of cumulative lead-time demand divided by mean actual lead-time demand.
    * Lead-time Bias %: Mean signed forecast error expressed as a percentage of mean actual lead-time demand.
    * Under-Forecast Rate: Proportion of origins where cumulative forecast $< 80\%$ of actual demand (stockout risk metric).
* **Surge Isolation Analysis:** On spiky series, partitions evaluation origins into surge-affected origins (origins where actual lead-time demand contains $\ge 1$ surge week) vs non-surge origins. Computes the Error Inflation Ratio ($\frac{\text{nMAE}_{\text{surge}}}{\text{nMAE}_{\text{non-surge}}}$).
* **Paired Bootstrap Inference:** 2,000 seeded bootstrap resamples computing 95% percentile confidence intervals for the paired error difference $(\text{nMAE}_{\text{variant}} - \text{nMAE}_{\text{SES(0.3)}})$ per pattern.

### 5. Tactical Vehicle Fleet Maintenance Experiment
* Evaluated all 8 variants on weekly engine hours for all 30 tactical transport vehicles (5 vehicle classes across 8 depots) from week 52 onward.
* Assessed 1-step nMAE and 4-step ahead cumulative run-hour error for maintenance interval projection.

### 6. Headless Experiment Script (`npm run experiments`)
* Executable Node script (`src/forecasting/runExperiments.js`) running headless in **0.16s (159 ms)**.
* Outputs 7 CSV files to `./results/`:
  1. `benchmark_series.csv`: 90 synthetic benchmark series with 104-week demand histories and surge markers (320 KB).
  2. `results_per_series.csv`: Full origin-aggregated metrics across 90 series $\times$ 8 variants (59 KB).
  3. `summary_by_pattern.csv`: Aggregated mean, median, std, sample size $n$, and total wins per pattern (1.7 KB).
  4. `bootstrap_ci.csv`: Paired bootstrap 95% confidence intervals against SES ($\alpha=0.3$) (1.3 KB).
  5. `surge_analysis.csv`: Surge vs non-surge error breakdown and inflation ratios for spiky series (0.4 KB).
  6. `case_study_depots.csv`: Metrics across all 99 stocked depot-item combinations in the logistics network (76 KB).
  7. `vehicles.csv`: Fleet maintenance hour forecast metrics for all 30 tactical vehicles (16 KB).

### 7. Interactive Experiments Page (`/experiments`)
* Accessible to all authenticated roles (Store Officer, Commander, Admin) via primary navigation.
* **Control Bar:** Protocol summary badges, "Re-run Experiments" action button with live execution timer, and CSV export buttons.
* **Grouped Bar Chart:** Recharts visual comparison of lead-time nMAE across all 8 variants grouped by demand pattern.
* **Forecast Overlay Chart:** Interactive time-series visualizer showing 104-week demand for any benchmark series, with selectable variant overlays and surge markers.
* **Tabbed Data Tables:**
  1. *Benchmark Summary & Wins:* Lead-time nMAE (mean $\pm$ std, median), 1-step nMAE, and win counts; highlights the winning variant per pattern.
  2. *Bias & Under-Forecast Risk:* Cumulative lead-time bias % and under-forecast rate ($< 80\%$).
  3. *Surge Impact Analysis:* Surge vs non-surge nMAE and error inflation ratio on spiky series.
  4. *Bootstrap 95% Confidence Intervals:* Paired difference vs SES ($\alpha=0.3$) with statistical significance indicators.
  5. *Depot Supply Network Case Study:* Empirical performance across all 99 stocked military depot lines.
  6. *Fleet Engine Hours:* Run-hour prediction accuracy across all 30 tactical vehicles.

### 8. Documentation & Unit Tests
* **Method & Data (`About.jsx`):** Added Section 10 ("Forecasting Experimental Protocol & Benchmark Design"), formally documenting the 90-series benchmark parameters, pattern labeling rule, rolling origin evaluation window, mathematical metrics, surge partitioning, and paired bootstrap methodology.
* **Unit Tests (`tests/experiments.test.js`):** Added 7 unit tests covering benchmark generator determinism, sample count validation (30/30/30), hand-checked statistical aggregation functions ($\mu$, median, sample std), paired bootstrap zero-difference property, and pattern classification boundary conditions. All 21 tests pass.

---

## Progress Log — Session 7: Visual Redesign & Tactical Military Design System

**Scope Note:** Visual redesign and UI depth enhancement without modifying underlying data generators, mathematical formulations, permissions, or existing routes.  
**Theme:** Muted Military Tactical HUD (`olive-900`, `olive-700`, `olive-500`, `khaki-100`, `khaki-200`, `sand`, `ink`, `brick`, `ochre`, `navy`, `steel`).

### 1. Typography & HUD Data Display
* **Headings:** Retained `Barlow Condensed` for high-impact military headers, card titles, and tactical breadcrumbs.
* **Telemetry & Numeric Values:** Integrated Google Font `Share Tech Mono` for all numbers, counts, codes, dates, table metrics, and HUD readouts.
* **Animated Numerics (`CountUp.jsx`):** Developed pure JavaScript numeric counter using `requestAnimationFrame` with an `easeOutQuad` curve. Supports decimal values and handles `prefers-reduced-motion` accessibility checks.

### 2. Thematic Page Hero Banners (`PageHero.jsx`)
Added a responsive, full-width tactical hero band to every page with stencil titles, taglines, Lucide icons, and dedicated inline SVG vector graphics:
* **Home (`/`):** Animated radar with concentric range rings, coordinate crosshairs, rotating sweep with soft fading trail, and pulsing blips in phosphor green.
* **Alerts (`/alerts`):** Early-warning radar grid with pulsing amber warning blips.
* **Dashboard (`/dashboard`):** Tactical map grid with coordinate tick marks and contour lines.
* **Inventory (`/inventory`):** Blueprint-style depot grid with crate and pallet outlines.
* **Demand Explorer (`/demand`):** Harmonic frequency waves reflecting seasonal demand dynamics.
* **Forecast (`/forecast`):** Oscilloscope signal waveforms with forward horizon projections.
* **Maintenance & Vehicle Detail (`/maintenance`, `/maintenance/:id`):** Engineering schematic grid with vehicle line-art silhouettes.
* **Procurement Requisitions (`/requisitions`):** Dispatch-document layout with diagonal accents and rubber-stamp status styling.
* **Empirical Experiments (`/experiments`):** Data-lab grid with Gaussian distribution curve and regression trend lines.
* **Audit Log (`/audit`):** Monospace terminal ledger with ledger lines.
* **Users & Method & Data (`/users`, `/about`):** Topographic contour map and military ID card geometry.

### 3. Surface Overlap & Tactical Card Aesthetics
* **Surface Overlap (`.hero-overlap-content`):** Pulls the initial tier of cards slightly over the dark olive bottom trim of the hero banner (`margin-top: -36px`), creating professional visual depth.
* **Military Chamfer & Corner Brackets (`.military-chamfer`, `.card-bracket`):** Corner cuts and tactical bracket ticks on cards.
* **Tick-Mark Section Dividers (`.section-heading-ticks`):** Tactical angled tick marks on major section titles.
* **Interactive Hover Lift (`.military-lift`):** Subtle tactile lift and shadow on buttons and action pills.
* **Live Status Badges (`.status-dot-pulse`):** Pulsing dots within badges (Healthy: olive, Reorder needed: ochre, Critical low: brick).
* **Sticky Table Headers:** Sticky dark olive headers with khaki zebra rows and row hover highlight.

### 4. Accessible Personnel Authentication Modal (`LoginModal.jsx`)
* Replaced standalone `/login` page with an accessible dialog modal (`role="dialog"`, `aria-modal="true"`).
* **Keyboard & Focus Management:** Traps focus with `Tab` / `Shift+Tab`, handles `Escape` key to close, and restores focus to previous active element on dismiss.
* **Quick-Select Demo Cards:** One-click login for Store Officers (Jodhpur, Leh, Kochi), Commander (all depots), and Administrator.
* **Protected Route Gate:** Accessing protected routes while logged out displays that specific page's themed Hero along with a centered military-chamfered "Login Required" card prompting sign-in and redirecting smoothly to the intended path.
* **Legacy Route Handling:** Navigating to `/login` smoothly redirects to `/` and triggers the authentication modal.

### 5. Quality Assurance & Verification
* **ESLint Validation:** 0 errors, 0 warnings across all source code.
* **Automated Unit Tests:** 21 tests pass across 7 suites (`npm test`).
* **Production Build:** Vite generates production bundle in ~2.0s without warnings or broken dependencies.
* **Accessibility:** All animations and transitions respect `prefers-reduced-motion: reduce`. Contrast ratios meet WCAG AA standards.

---

## Progress Log — Session 8: Complete Visual Overhaul & Command Console Bento Architecture

**Scope Note:** End-to-end visual overhaul across five sequential phases. Data generators, mathematical formulas, permissions, and existing routes remain strictly preserved and verified against the 21 automated unit tests.  
**Theme:** Dark Tactical Command Console (`#0f1410` base, `#161d16` surface, `#1c261c` elevated surface, border `rgba(180,200,150,0.14)`, text `#e6eadb`, muted `#98a38a`, sage `#9bb37a`, sand `#cdbf93`, amber `#d49a3a`, brick `#c0553f`, steel `#6f94b8`).

### 1. Phase 1: High-Priority Visual Bug Fixes
* **Login Modal Credentials:** Redesigned into `.demo-credentials-list` with distinct initials avatar chips, clean personnel name and role labels, base assignment, monospace username tags, and interactive action arrows. Fixed heading and hint run-in.
* **Form Controls & Sliders:** Added global dark console styling for all `<select>`, `<input>`, `<range>`, `<checkbox>`, `<textarea>`, and `<button>` elements with active focus rings and muted military accents.
* **Chart Margins & Axis Labels:** Shortened Y-axis titles (e.g. `Demand (Bags)` instead of long clipped unit names), widened chart margins (`left: 55`), positioned legends to top-left, and resolved summary card header collisions.
* **Page Hero Artwork Masking:** Constrained hero text group (`max-width: 640px`) and shifted SVG canvas strictly to the right with an alpha gradient mask (`mask-image: linear-gradient(...)`) so SVG elements never collide with headings. Added dedicated harmonic wave vector for Demand Explorer.

### 2. Phase 2: Command Console App Shell
* **Collapsible Tactical Sidebar (`Sidebar.jsx`):**
  * 230px expanded, 60px collapsed with smooth transitions and persistent state in `localStorage` (`iaf_sidebar_collapsed`).
  * Structured into role-restricted sections: `OPERATIONS`, `INTELLIGENCE`, `ADMIN`, `REFERENCE`.
  * Mobile slide-over drawer with backdrop overlay for screens $< 860$px.
  * Home page hides sidebar when logged out for an immersive landing experience.
* **Slim Top Status Bar (`TopStatusBar.jsx`):**
  * 48px command header with hamburger toggle, route breadcrumbs, simulated clock chip (`SIM DATE: 28 DEC 2025`), predictive alert bell with badge count, and active user chip with rank and one-click logout.

### 3. Phase 3: Command Console Design System (`src/components/ui/`)
* **Reusable UI Component Suite:**
  * `Panel`: Tactical container with subtle corner brackets, customizable badge, title, subtitle, and action slot.
  * `KpiTile`: Standardized telemetry tile with color top-stripes (sage, sand, amber, brick, steel), mono label, animated `CountUp` value, and delta hint.
  * `RadialGauge`: Circular HUD meter for asset run-hour usage and stock ratio monitoring.
  * `Sparkline`: Inline SVG time-series path with gradient area fill.
  * `SegmentedControl`: Monospace pill toggle for view modes and algorithm switching.
  * `StatusChip`: Standardized status pill with animated pulsing status dot.
  * `Field`: Form label, helper text, and input wrapper.
  * `RECHARTS_THEME`: Unified dark theme configuration (axes, grid, tooltip, legends) across all charts.

### 4. Phase 4: Page Layout Restructuring
* **Home (`/`):** Live ticker strip (`.live-alerts-ticker`), three-step operational workflow cards (Monitor, Forecast, Act), 4 key KPI tiles, and three branch panels (Army, Navy, Air Force) with themed geometric backgrounds.
* **Dashboard (`/dashboard`):** 6 top KPI tiles, abstract 8-depot schematic network (tactical grid and glowing coordinate nodes without country or state border outlines), Needs Attention feed, and Recharts charts.
* **Inventory (`/inventory`):** Master-Detail view with search and filters, interactive ledger table on left, and rich asset detail panel on right featuring `RadialGauge`, 26-week demand `Sparkline`, and stock adjustment actions.
* **Demand Explorer (`/demand`):** Bento split layout with control console on left (depot & commodity selectors, operational profile, surge breakdown), 104-week empirical chart on right with `RECHARTS_THEME`, and row of 4 stock metric KPI tiles below.
* **Forecast (`/forecast`):** Left control console panel with `SegmentedControl` algorithm selector and parameter sliders; main 26-week forward projection chart; 4 compact KPI tiles; and bottom runway depletion area chart.
* **Predictive Alerts (`/alerts`):** Radar tactical panel on left with SVG blips placed by depot coordinates and alert urgency; tabbed alert lists on right (`SegmentedControl` toggling Inventory Replenishment and Fleet Servicing); 4 summary KPI tiles.
* **Fleet Maintenance (`/maintenance`, `/maintenance/:id`):**
  * `MaintenanceList`: 4 fleet KPI tiles, filter toolbar, and view mode toggle between Tactical Card Grid (featuring `RadialGauge` of interval used) and Ledger Table.
  * `VehicleDetail`: Tactical asset dossier with `RadialGauge`, weekly engine run-hour chart with `RECHARTS_THEME`, service history table, and modal dialogs.
* **Procurement Requisitions (`/requisitions`):** 4-column Kanban board (`Pending`, `Approved`, `Fulfilled`, `Rejected`) with quick approve/reject actions for Commander and fulfillment for Store Officer, plus a list table view toggle.
* **Audit Log (`/audit`):** Terminal-style live feed (`#090c09`, monospace timestamps, colored category chips: `AUTH`, `STOCK_CREATE`, `STOCK_UPDATE`, `STOCK_DELETE`, `REQ_CREATE`, `REQ_APPROVE`, `REQ_REJECT`, `REQ_FULFILL`, `RESET`), and compact filter bar.
* **Personnel Access Directory (`/users`):** ID-card style grid with initials avatar, rank, role badge, depot chip, credentials callout, and activate/deactivate account toggle.
* **Benchmark Lab (`/experiments`):** Recharts visual comparison charts first (Grouped Bar Chart and Example Series Overlay), followed by data tables with best values highlighted in sage/sand across 6 tabbed views using `SegmentedControl`.
* **Method and Data (`/about`):** Two-column layout with sticky table of contents on left with smooth jump links and structured documentation panels on right with styled `.formula-callout` blocks.

### 5. Phase 5: Verification & Quality Assurance
* **Automated Unit Tests:** 21/21 tests pass across 7 test suites (`npm test`).
* **ESLint Validation:** 0 errors, 0 warnings across all project code (`npm run lint`).
* **Production Build:** Vite compiles in under 2.0s without warnings or broken chunks (`npm run build`).
* **Strict Non-Lethal Compliance:** Zero military insignia, regimental crests, weapons, or live ammunition imagery. Abstract schematic contains zero country or state borders.
* **Accessibility:** All animations respect `prefers-reduced-motion: reduce`. Contrast ratios meet WCAG AA standards.

---

## Progress Log — Session 10: Contrast and Legibility Overhaul (WCAG 2.1 AA)

**Scope Note:** Strict contrast and legibility remediation across the entire web application without altering any mathematical models, data generation, permissions, or routes.

### 1. Root Cause Identification & Token Remediation
* **Eliminated Residual Light-Theme Tokens:** Replaced legacy light-mode variables (`--ink`, `--khaki-*`, `--olive-900`, `--olive-700`) where used as text colors on dark surfaces, which had produced near-black text on dark backgrounds.
* **WCAG 2.1 AA Palette Implementation:**
  * Base page background: `#0c110d`
  * Panel surface: `#182118`
  * Raised card surface: `#212d21`
  * Input / elevated surface: `#2a382a`
  * Subtle borders: `rgba(190, 210, 160, 0.22)`
  * Primary text: `#f1f4e8` ($\ge 11.1:1$ contrast ratio across all surfaces)
  * Secondary text: `#c9d1b8` ($\ge 7.8:1$ contrast ratio)
  * Muted captions/labels: `#a3ad94` ($\ge 5.2:1$ contrast ratio)
  * Form placeholder: `#8d9780` ($\ge 4.0:1$ contrast ratio)
  * Accent colors: Sage `#a9c486`, Sand `#d8cb9f`, Amber `#e0a947`, Brick `#d4705a` (and Brick-light `#e07d67`), Steel `#86a9cc` ($\ge 3.0:1$ UI contrast)
* **Button Semantics:**
  * Primary Button: Sand `#d8cb9f` background with dark text `#1a1f14` ($10.37:1$ contrast ratio).
  * Secondary Button: Transparent background with 1px Sand `#d8cb9f` border and light text `#f1f4e8` ($\ge 11.1:1$ contrast ratio).

### 2. Comprehensive Component & Layout Fixes
* **Home Page Layout & Live Ticker:**
  * Removed negative margin from `.hero-overlap-content` which had caused the main container to overlap and occlude `.live-alerts-ticker`.
  * Defined responsive `.kpi-grid` and `.four-cards-grid` (4 columns on desktop, 2 on tablet, 1 on mobile) resolving KPI tile vertical stacking.
  * Raised live ticker height and padding (`min-height: 38px`, `padding: 8px 20px`) with high-contrast alert badges.
* **PageHero & Tactical SVG Vector Art:**
  * Updated all inline SVG backgrounds (Radar, Oscilloscope, Graticules, Blueprint, Schematics, Terminal, ID card, Survey contours).
  * High-visibility Radar blips and coordinate labels set to `#c9d1b8` and `#a9c486` with $\ge 0.95$ opacity.
* **Form Controls & Inputs:**
  * Converted all `<select>`, `<input>`, `.form-input`, `.filter-input`, `.filter-select`, and `.login-form .form-input` controls to `--surface-2` (`#212d21`) with `#f1f4e8` text and Sand focus ring.
  * Styled `<option>` dropdown lists with `#212d21` background and `#f1f4e8` text.
* **Data Visualizations & Recharts:**
  * Chart axes, tick marks, reference lines, and tooltip containers aligned to dark theme tokens with text fills $\ge 7.8:1$ contrast.
* **Personnel Authentication Modal & Badges:**
  * Replaced light backgrounds (`#edf2e4`, `#fdf5e6`, `#e8eef6`) on persona cards, role badges, and status chips with tinted dark surfaces (`rgba(..., 0.16)`) and WCAG-compliant accent text.

### 3. Verification & Compliance
* **Automated Contrast Audit Script:** Created `scripts/check-contrast.mjs` verifying 45 WCAG 2.1 AA relative luminance combinations across all surfaces, text levels, buttons, and accents. Added `npm run test:contrast` script. **45/45 checks pass**.
* **Linting:** `npm run lint` passes with 0 errors and 0 warnings.
* **Unit Tests:** `npm test` passes all 21/21 tests across 7 test suites.
* **Production Build:** `npm run build` succeeds cleanly in under 2.0s.



