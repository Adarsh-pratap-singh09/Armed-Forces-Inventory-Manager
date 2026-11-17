/**
 * PageHero Component
 * 
 * Provides a thematic, full-width military tactical hero banner across all pages:
 * - Stencil-style condensed title & tagline
 * - Sector HUD metadata
 * - High-depth inline SVG background (Radar, Blueprint, Oscilloscope, Schematics, etc.)
 * - Zero external images; pure inline SVG and CSS
 * - Respects prefers-reduced-motion
 */

export default function PageHero({
  theme = 'dashboard',
  title,
  tagline,
  icon: Icon,
  badge,
  sectorCode,
  children
}) {
  return (
    <section className={`page-hero-banner hero-theme-${theme}`}>
      {/* Inline Thematic Background SVG */}
      <div className="hero-svg-canvas" aria-hidden="true">
        {renderThemeBackground(theme)}
      </div>

      {/* Hero Inner Content Layer */}
      <div className="hero-content-wrapper">
        <div className="hero-meta-strip font-mono">
          <div className="hero-sector-id">
            <span className="sector-pulse-light" />
            <span>SEC // {sectorCode || theme.toUpperCase()}</span>
          </div>
          <div className="hero-classification-tag">
            RESTRICTED // TRI-SERVICES LOGISTICS
          </div>
          {badge && <div className="hero-custom-badge">{badge}</div>}
        </div>

        <div className="hero-headline-row">
          {Icon && (
            <div className="hero-icon-container">
              <Icon size={28} className="hero-icon-svg" />
            </div>
          )}
          <div className="hero-titles-group">
            <h1 className="hero-stencil-title">{title}</h1>
            <p className="hero-tagline-text">{tagline}</p>
          </div>
        </div>

        {children && <div className="hero-actions-container">{children}</div>}
      </div>

      {/* Decorative Bottom Military Alignment Strip */}
      <div className="hero-bottom-trim" />
    </section>
  );
}

/**
 * Generates theme-specific inline SVG graphics
 */
function renderThemeBackground(theme) {
  switch (theme) {
    case 'home':
      return (
        <svg
          viewBox="0 0 800 240"
          preserveAspectRatio="xMidYMid meet"
          className="hero-svg-root"
        >
          <defs>
            <radialGradient id="radarSweepGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8aab5f" stopOpacity="0.45" />
              <stop offset="35%" stopColor="#5b6b3a" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#2b3320" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="gridLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8aab5f" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#8aab5f" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#8aab5f" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1="120" x2="800" y2="120" stroke="url(#gridLineGrad)" strokeWidth="1" />
          <line x1="400" y1="0" x2="400" y2="240" stroke="url(#gridLineGrad)" strokeWidth="1" />

          {/* Radar Center positioned in SVG view */}
          <g transform="translate(560, 120)">
            {/* Concentric Range Rings */}
            <circle r="40" stroke="#8aab5f" strokeOpacity="0.25" strokeWidth="1" fill="none" strokeDasharray="3 3" />
            <circle r="80" stroke="#8aab5f" strokeOpacity="0.3" strokeWidth="1" fill="none" />
            <circle r="130" stroke="#8aab5f" strokeOpacity="0.25" strokeWidth="1" fill="none" strokeDasharray="4 4" />
            <circle r="190" stroke="#8aab5f" strokeOpacity="0.35" strokeWidth="1.2" fill="none" />
            <circle r="250" stroke="#8aab5f" strokeOpacity="0.2" strokeWidth="1" fill="none" strokeDasharray="5 5" />

            {/* Crosshairs & Angle Rays */}
            <line x1="-260" y1="0" x2="260" y2="0" stroke="#8aab5f" strokeOpacity="0.3" strokeWidth="1" />
            <line x1="0" y1="-260" x2="0" y2="260" stroke="#8aab5f" strokeOpacity="0.3" strokeWidth="1" />
            <line x1="-180" y1="-180" x2="180" y2="180" stroke="#8aab5f" strokeOpacity="0.15" strokeWidth="0.8" strokeDasharray="2 4" />
            <line x1="-180" y1="180" x2="180" y2="-180" stroke="#8aab5f" strokeOpacity="0.15" strokeWidth="0.8" strokeDasharray="2 4" />

            {/* Rotating Radar Sweep Cone */}
            <g className="radar-sweep-anim">
              <path
                d="M 0 0 L 250 0 A 250 250 0 0,0 176 -176 Z"
                fill="url(#radarSweepGrad)"
              />
              <line x1="0" y1="0" x2="250" y2="0" stroke="#a4c676" strokeWidth="1.5" strokeOpacity="0.8" />
            </g>

            {/* Pulsing Tactical Blips */}
            <g transform="translate(60, -45)">
              <circle r="3.5" fill="#a9c486" />
              <circle r="12" stroke="#a9c486" strokeWidth="1" fill="none" className="radar-blip-pulse" />
              <text x="8" y="4" fill="#a9c486" fontSize="10" fontFamily="'Share Tech Mono', monospace" opacity="0.95">TGT-01 // LEH</text>
            </g>
            <g transform="translate(-110, 70)">
              <circle r="3" fill="#a9c486" />
              <circle r="10" stroke="#a9c486" strokeWidth="1" fill="none" className="radar-blip-pulse" style={{ animationDelay: '1.2s' }} />
              <text x="8" y="4" fill="#a9c486" fontSize="10" fontFamily="'Share Tech Mono', monospace" opacity="0.95">TGT-02 // JODH</text>
            </g>
            <g transform="translate(130, 80)">
              <circle r="3.5" fill="#a9c486" />
              <circle r="14" stroke="#a9c486" strokeWidth="1" fill="none" className="radar-blip-pulse" style={{ animationDelay: '2.1s' }} />
              <text x="8" y="4" fill="#a9c486" fontSize="10" fontFamily="'Share Tech Mono', monospace" opacity="0.95">TGT-03 // KOCHI</text>
            </g>
          </g>

          {/* Coordinate Overlays */}
          <g opacity="0.95" transform="translate(300, 205)" fill="#c9d1b8" fontSize="10" fontFamily="'Share Tech Mono', monospace">
            <text x="0" y="0">GRID REF: 34°10'N 77°35'E // NORTH-SEC</text>
            <text x="0" y="16">SURVEILLANCE RADAR: ACTIVE 240° AZIMUTH</text>
          </g>
        </svg>
      );

    case 'demand':
      return (
        <svg
          viewBox="0 0 800 240"
          preserveAspectRatio="xMidYMid meet"
          className="hero-svg-root"
        >
          {/* Grid lines */}
          <g stroke="#5b6b3a" strokeOpacity="0.15" strokeWidth="0.8">
            {Array.from({ length: 16 }).map((_, i) => (
              <line key={`dm-x-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="240" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`dm-y-${i}`} x1="0" y1={i * 30} x2="800" y2={i * 30} />
            ))}
          </g>

          {/* Seasonal Wave Curve */}
          <path
            d="M 50 140 Q 150 40 250 140 T 450 140 T 650 140 T 800 130"
            fill="none"
            stroke="#9bb37a"
            strokeWidth="2"
            strokeOpacity="0.75"
          />

          {/* Surge Spikes */}
          <path
            d="M 320 140 L 350 45 L 375 140"
            fill="none"
            stroke="#e0a947"
            strokeWidth="2.5"
            strokeDasharray="4 2"
          />
          <circle cx="350" cy="45" r="5" fill="#e0a947" />
          <text x="360" y="42" fill="#e0a947" fontSize="10" fontFamily="'Share Tech Mono', monospace" fontWeight="600">
            OP SURGE (+2.4x)
          </text>

          <path
            d="M 580 140 L 610 65 L 635 140"
            fill="none"
            stroke="#e0a947"
            strokeWidth="2"
            strokeDasharray="4 2"
          />
          <circle cx="610" cy="65" r="4" fill="#e0a947" />

          {/* Mean Reference Line */}
          <line x1="50" y1="140" x2="780" y2="140" stroke="#d8cb9f" strokeOpacity="0.4" strokeDasharray="3 3" />
          <text x="680" y="132" fill="#c9d1b8" fontSize="10" fontFamily="'Share Tech Mono', monospace" opacity="0.95">
            BASELINE $\mu$
          </text>
        </svg>
      );

    case 'alerts':
      return (
        <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" className="hero-svg-root">
          <defs>
            <radialGradient id="alertSweepGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e0a947" stopOpacity="0.45" />
              <stop offset="40%" stopColor="#e0a947" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#182118" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1200" height="240" fill="#182118" />
          <g transform="translate(920, 120)">
            <circle r="50" stroke="#e0a947" strokeOpacity="0.25" strokeWidth="1" fill="none" />
            <circle r="110" stroke="#e0a947" strokeOpacity="0.35" strokeWidth="1" fill="none" strokeDasharray="4 4" />
            <circle r="180" stroke="#d4705a" strokeOpacity="0.4" strokeWidth="1.2" fill="none" />
            <circle r="250" stroke="#e0a947" strokeOpacity="0.2" strokeWidth="1" fill="none" />
            <line x1="-260" y1="0" x2="260" y2="0" stroke="#e0a947" strokeOpacity="0.25" />
            <line x1="0" y1="-260" x2="0" y2="260" stroke="#e0a947" strokeOpacity="0.25" />

            <g className="radar-sweep-anim">
              <path d="M 0 0 L 250 0 A 250 250 0 0,0 176 -176 Z" fill="url(#alertSweepGrad)" />
              <line x1="0" y1="0" x2="250" y2="0" stroke="#e0a947" strokeWidth="1.5" />
            </g>

            {/* Amber Alert Blips */}
            <g transform="translate(75, -50)">
              <circle r="4" fill="#e0a947" />
              <circle r="15" stroke="#e0a947" strokeWidth="1.2" fill="none" className="radar-blip-pulse" />
              <text x="10" y="4" fill="#e0a947" fontSize="10" fontFamily="'Share Tech Mono', monospace" fontWeight="600">ALERT: STOCKOUT h=2</text>
            </g>
            <g transform="translate(-100, 40)">
              <circle r="4" fill="#d4705a" />
              <circle r="16" stroke="#d4705a" strokeWidth="1.2" fill="none" className="radar-blip-pulse" style={{ animationDelay: '1s' }} />
              <text x="10" y="4" fill="#d4705a" fontSize="10" fontFamily="'Share Tech Mono', monospace" fontWeight="600">OVERDUE // VEH-006</text>
            </g>
          </g>
          <g opacity="0.95" transform="translate(40, 180)" fill="#c9d1b8" fontSize="10" fontFamily="'Share Tech Mono', monospace">
            <text x="0" y="0">EARLY WARNING THRESHOLD: L+2 WEEKS ACTIVE</text>
            <text x="0" y="16">ALGORITHM ENGINE: SES (ALPHA 0.3) CONTINUOUS POLLING</text>
          </g>
        </svg>
      );

    case 'dashboard':
      return (
        <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" className="hero-svg-root">
          <rect width="1200" height="240" fill="#202717" />
          {/* Tactical Map Grid */}
          <g stroke="#c9b98a" strokeOpacity="0.12" strokeWidth="0.8">
            <line x1="100" y1="0" x2="100" y2="240" />
            <line x1="250" y1="0" x2="250" y2="240" />
            <line x1="400" y1="0" x2="400" y2="240" />
            <line x1="550" y1="0" x2="550" y2="240" />
            <line x1="700" y1="0" x2="700" y2="240" />
            <line x1="850" y1="0" x2="850" y2="240" />
            <line x1="1000" y1="0" x2="1000" y2="240" />
            <line x1="1150" y1="0" x2="1150" y2="240" />
            <line x1="0" y1="60" x2="1200" y2="60" />
            <line x1="0" y1="120" x2="1200" y2="120" />
            <line x1="0" y1="180" x2="1200" y2="180" />
          </g>

          {/* Elevation Contours */}
          <path
            d="M 650 30 C 720 10, 800 50, 870 30 C 940 10, 1020 40, 1120 20 L 1200 40 L 1200 240 L 650 240 Z"
            fill="none"
            stroke="#5b6b3a"
            strokeOpacity="0.25"
            strokeWidth="1.2"
          />
          <path
            d="M 680 70 C 750 45, 830 85, 900 65 C 970 45, 1050 75, 1150 55"
            fill="none"
            stroke="#5b6b3a"
            strokeOpacity="0.2"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <path
            d="M 720 120 C 790 95, 870 135, 940 115 C 1010 95, 1090 125, 1190 105"
            fill="none"
            stroke="#5b6b3a"
            strokeOpacity="0.22"
            strokeWidth="1"
          />

          {/* Coordinate Ticks & Crosses */}
          <g stroke="#c9b98a" strokeOpacity="0.4" strokeWidth="1">
            <path d="M 400 55 L 400 65 M 395 60 L 405 60" />
            <path d="M 700 115 L 700 125 M 695 120 L 705 120" />
            <path d="M 1000 175 L 1000 185 M 995 180 L 1005 180" />
          </g>

          <g fill="#c9d1b8" fontSize="10" fontFamily="'Share Tech Mono', monospace" opacity="0.95">
            <text x="412" y="64">ZONE: 43R // NORTHERN THEATRE</text>
            <text x="712" y="124">ELEV: +3,500M MSL</text>
            <text x="1012" y="184">COORDINATE: 34°08'N 77°34'E</text>
          </g>
        </svg>
      );

    case 'inventory':
      return (
        <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" className="hero-svg-root">
          <rect width="1200" height="240" fill="#182118" />
          {/* Blueprint Grid */}
          <g stroke="#7b9664" strokeOpacity="0.14" strokeWidth="0.8">
            {Array.from({ length: 24 }).map((_, i) => (
              <line key={`iv-x-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="240" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`iv-y-${i}`} x1="0" y1={i * 30} x2="1200" y2={i * 30} />
            ))}
          </g>

          {/* Blueprint Crate Outlines with cross bracing */}
          <g stroke="#a9c486" strokeOpacity="0.35" strokeWidth="1.2" fill="none" transform="translate(820, 40)">
            {/* Pallet 1 */}
            <rect x="0" y="30" width="70" height="50" rx="2" />
            <line x1="0" y1="30" x2="70" y2="80" />
            <line x1="70" y1="30" x2="0" y2="80" />
            <rect x="5" y="82" width="60" height="6" strokeWidth="1" fill="#5b6b3a" fillOpacity="0.2" />

            {/* Pallet 2 stacked */}
            <rect x="85" y="30" width="70" height="50" rx="2" />
            <line x1="85" y1="30" x2="155" y2="80" />
            <line x1="155" y1="30" x2="85" y2="80" />
            <rect x="90" y="82" width="60" height="6" strokeWidth="1" fill="#5b6b3a" fillOpacity="0.2" />

            {/* Crate Stack on Top */}
            <rect x="20" y="-15" width="45" height="40" />
            <line x1="20" y1="-15" x2="65" y2="25" />
            <line x1="65" y1="-15" x2="20" y2="25" />

            {/* Pallet 3 */}
            <rect x="170" y="10" width="80" height="70" rx="2" />
            <line x1="170" y1="10" x2="250" y2="80" />
            <line x1="250" y1="10" x2="170" y2="80" />
            <rect x="175" y="82" width="70" height="6" strokeWidth="1" fill="#5b6b3a" fillOpacity="0.2" />

            {/* Bay Labels */}
            <text x="0" y="110" fill="#a9c486" fontSize="10" fontFamily="'Share Tech Mono', monospace" opacity="0.95">
              STORAGE BAY B-04 // PALLETIZED DEPOT LEDGER
            </text>
          </g>
        </svg>
      );

    case 'requisitions':
      return (
        <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" className="hero-svg-root">
          <defs>
            <pattern id="diagonalHatch" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="16" stroke="#d8cb9f" strokeWidth="1.2" strokeOpacity="0.08" />
            </pattern>
          </defs>
          <rect width="1200" height="240" fill="#182118" />
          <rect width="1200" height="240" fill="url(#diagonalHatch)" />

          {/* Stamp Style Authority Badge */}
          <g transform="translate(860, 50)" stroke="#d8cb9f" strokeOpacity="0.4" fill="none">
            <rect x="0" y="0" width="260" height="110" rx="4" strokeWidth="1.5" strokeDasharray="6 3" />
            <rect x="6" y="6" width="248" height="98" rx="2" strokeWidth="0.8" />
            <text x="130" y="35" textAnchor="middle" fill="#d8cb9f" fontSize="12" fontFamily="'Barlow Condensed', sans-serif" fontWeight="700" letterSpacing="0.1em" opacity="0.95">
              PROCUREMENT AUTHORIZATION
            </text>
            <line x1="20" y1="45" x2="240" y2="45" stroke="#d8cb9f" strokeOpacity="0.3" />
            <text x="130" y="65" textAnchor="middle" fill="#c9d1b8" fontSize="10" fontFamily="'Share Tech Mono', monospace" opacity="0.95">
              STATUS: AUDITED &amp; DISPATCHED
            </text>
            <text x="130" y="85" textAnchor="middle" fill="#a3ad94" fontSize="10" fontFamily="'Share Tech Mono', monospace" opacity="0.95">
              FORM IAF-INDENT-V2 // MULTI-ECHELON
            </text>
          </g>
        </svg>
      );

    case 'maintenance':
      return (
        <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" className="hero-svg-root">
          <rect width="1200" height="240" fill="#1b2426" />
          {/* Engineering Technical Grid */}
          <g stroke="#4a6f94" strokeOpacity="0.14" strokeWidth="0.8">
            {Array.from({ length: 24 }).map((_, i) => (
              <line key={`mt-x-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="240" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`mt-y-${i}`} x1="0" y1={i * 30} x2="1200" y2={i * 30} />
            ))}
          </g>

          {/* Generic Line-art Tactical Transport Truck Silhouette (Schematic Vector) */}
          <g stroke="#8ab0d4" strokeOpacity="0.45" strokeWidth="1.3" fill="none" transform="translate(800, 50)">
            {/* Cargo Box Body */}
            <rect x="0" y="15" width="180" height="65" rx="2" />
            <line x1="45" y1="15" x2="45" y2="80" strokeDasharray="3 3" />
            <line x1="90" y1="15" x2="90" y2="80" strokeDasharray="3 3" />
            <line x1="135" y1="15" x2="135" y2="80" strokeDasharray="3 3" />

            {/* Cab */}
            <path d="M 180 35 L 215 35 L 235 60 L 235 80 L 180 80 Z" />
            {/* Windshield */}
            <path d="M 195 40 L 212 40 L 226 58 L 195 58 Z" fill="#8ab0d4" fillOpacity="0.1" />

            {/* Chassis Line */}
            <line x1="-10" y1="80" x2="240" y2="80" strokeWidth="2" />

            {/* Wheels (3 Axles Generic) */}
            <g fill="#1b2426" stroke="#8ab0d4" strokeWidth="1.5">
              {/* Front Wheel */}
              <circle cx="205" cy="88" r="14" />
              <circle cx="205" cy="88" r="6" />
              {/* Middle Tandem */}
              <circle cx="105" cy="88" r="14" />
              <circle cx="105" cy="88" r="6" />
              {/* Rear Tandem */}
              <circle cx="50" cy="88" r="14" />
              <circle cx="50" cy="88" r="6" />
            </g>

            {/* Technical Dimension Callouts */}
            <g stroke="#86a9cc" strokeOpacity="0.4" strokeWidth="0.8" fontSize="9" fontFamily="'Share Tech Mono', monospace" fill="#86a9cc">
              <line x1="0" y1="5" x2="235" y2="5" />
              <line x1="0" y1="0" x2="0" y2="10" />
              <line x1="235" y1="0" x2="235" y2="10" />
              <text x="110" y="0" textAnchor="middle">INTERVAL: 250 / 500 HRS</text>
            </g>
          </g>
        </svg>
      );

    case 'forecast':
      return (
        <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" className="hero-svg-root">
          <rect width="1200" height="240" fill="#1b2320" />
          {/* Oscilloscope Graticule */}
          <g stroke="#5b6b3a" strokeOpacity="0.15" strokeWidth="0.8">
            {Array.from({ length: 24 }).map((_, i) => (
              <line key={`fc-x-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="240" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`fc-y-${i}`} x1="0" y1={i * 30} x2="1200" y2={i * 30} />
            ))}
          </g>

          {/* Primary Signal Waveform Trace (Historical) */}
          <path
            d="M 200 130 Q 300 60 400 130 T 600 130 T 750 140 T 850 110 T 950 130"
            fill="none"
            stroke="#8aab5f"
            strokeWidth="2"
            strokeOpacity="0.65"
          />

          {/* Forecast Horizon Projection (Dashed Waveform) */}
          <path
            d="M 950 130 Q 1020 80 1100 130 T 1200 110"
            fill="none"
            stroke="#a4412f"
            strokeWidth="2"
            strokeDasharray="5 3"
            strokeOpacity="0.75"
          />

          {/* Damped Error Band Envelopes */}
          <path
            d="M 950 130 Q 1020 60 1100 100 T 1200 70"
            fill="none"
            stroke="#c9b98a"
            strokeWidth="1"
            strokeDasharray="2 3"
            strokeOpacity="0.3"
          />
          <path
            d="M 950 130 Q 1020 100 1100 160 T 1200 150"
            fill="none"
            stroke="#c9b98a"
            strokeWidth="1"
            strokeDasharray="2 3"
            strokeOpacity="0.3"
          />

          {/* Scope Reticle Origin Marker */}
          <circle cx="950" cy="130" r="4" fill="#d4705a" />
          <line x1="950" y1="20" x2="950" y2="220" stroke="#d4705a" strokeOpacity="0.4" strokeDasharray="3 3" />
          <text x="960" y="35" fill="#d4705a" fontSize="10" fontFamily="'Share Tech Mono', monospace" opacity="0.95" fontWeight="600">
            ORIGIN: T=104 // FORWARD 26 WEEKS
          </text>
        </svg>
      );

    case 'experiments':
      return (
        <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" className="hero-svg-root">
          <rect width="1200" height="240" fill="#182118" />
          {/* Data Lab Grid */}
          <g stroke="#a9c486" strokeOpacity="0.12" strokeWidth="0.8">
            {Array.from({ length: 24 }).map((_, i) => (
              <line key={`exp-x-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="240" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={`exp-y-${i}`} x1="0" y1={i * 30} x2="1200" y2={i * 30} />
            ))}
          </g>

          {/* Gaussian Normal Distribution Curve (Statistical Benchmark) */}
          <path
            d="M 750 200 C 850 200, 880 40, 950 40 C 1020 40, 1050 200, 1150 200"
            fill="none"
            stroke="#d8cb9f"
            strokeWidth="1.8"
            strokeOpacity="0.45"
          />
          <line x1="950" y1="40" x2="950" y2="200" stroke="#d8cb9f" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.4" />

          {/* Scatter Data Points Cluster */}
          <g fill="#a9c486" opacity="0.45">
            <circle cx="820" cy="180" r="2.5" />
            <circle cx="860" cy="150" r="2.5" />
            <circle cx="890" cy="110" r="2.5" />
            <circle cx="920" cy="70" r="3" />
            <circle cx="950" cy="50" r="3" />
            <circle cx="980" cy="75" r="3" />
            <circle cx="1010" cy="115" r="2.5" />
            <circle cx="1040" cy="155" r="2.5" />
            <circle cx="1080" cy="185" r="2.5" />
          </g>

          <text x="950" y="225" textAnchor="middle" fill="#c9d1b8" fontSize="10" fontFamily="'Share Tech Mono', monospace" opacity="0.95">
            N=90 BENCHMARK SERIES // 2,000 BOOTSTRAP RESAMPLES
          </text>
        </svg>
      );

    case 'audit':
      return (
        <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" className="hero-svg-root">
          <rect width="1200" height="240" fill="#182118" />
          {/* Terminal Scanlines */}
          <g stroke="#5b6b3a" strokeOpacity="0.1" strokeWidth="1">
            {Array.from({ length: 16 }).map((_, i) => (
              <line key={`aud-sl-${i}`} x1="0" y1={i * 15} x2="1200" y2={i * 15} />
            ))}
          </g>

          {/* Monospace Log Lines Stream */}
          <g fill="#a9c486" fontSize="10" fontFamily="'Share Tech Mono', monospace" opacity="0.85" transform="translate(750, 40)">
            <text x="0" y="20">&gt; 2026-11-07T12:00:15Z AUTH_VERIFY [OK] :: USER=PBSE ROLE=ADMIN</text>
            <text x="0" y="40">&gt; 2026-11-07T12:05:42Z REQ_APPROVE [OK] :: REQ-2026-004 BY SMNON</text>
            <text x="0" y="60">&gt; 2026-11-07T12:12:09Z STOCK_LEDGER_SYNC [OK] :: LEH DEPOT 12 LINES</text>
            <text x="0" y="80">&gt; 2026-11-07T12:18:33Z FLEET_TELEMETRY [LOG] :: 30 UNITS VERIFIED</text>
            <text x="0" y="100">&gt; 2026-11-07T12:24:00Z SYSTEM_INTEGRITY :: 100% IMMUTABLE TRAIL</text>
            <rect x="360" y="90" width="8" height="12" fill="#a9c486" className="terminal-cursor-blink" />
          </g>
        </svg>
      );

    case 'users':
      return (
        <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" className="hero-svg-root">
          <rect width="1200" height="240" fill="#182118" />
          {/* Security / ID Card Biometric Grid */}
          <g stroke="#d8cb9f" strokeOpacity="0.15" strokeWidth="0.8">
            <circle cx="950" cy="120" r="85" fill="none" strokeDasharray="4 4" />
            <circle cx="950" cy="120" r="60" fill="none" />
            <circle cx="950" cy="120" r="35" fill="none" strokeDasharray="2 3" />
            <line x1="950" y1="20" x2="950" y2="220" />
            <line x1="850" y1="120" x2="1050" y2="120" />
          </g>

          {/* ID Badge Contour Frame */}
          <g transform="translate(870, 60)" stroke="#d8cb9f" strokeOpacity="0.35" fill="none">
            <rect x="0" y="0" width="160" height="110" rx="4" />
            {/* Silhouette head */}
            <circle cx="80" cy="35" r="15" />
            <path d="M 55 75 C 55 55, 105 55, 105 75" />
            <text x="80" y="95" textAnchor="middle" fill="#c9d1b8" fontSize="10" fontFamily="'Share Tech Mono', monospace" opacity="0.95">
              ROLE ACCESS DIRECTORY
            </text>
          </g>
        </svg>
      );

    case 'about':
    default:
      return (
        <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid slice" className="hero-svg-root">
          <rect width="1200" height="240" fill="#182118" />
          {/* Survey Contour Topographic Lines */}
          <g stroke="#d8cb9f" strokeOpacity="0.2" fill="none" strokeWidth="1">
            <path d="M 600 40 C 700 10, 850 70, 950 30 C 1050 10, 1150 60, 1200 40" />
            <path d="M 600 80 C 720 50, 880 110, 980 70 C 1080 50, 1150 90, 1200 80" strokeDasharray="3 3" />
            <path d="M 600 120 C 750 90, 900 150, 1020 110 C 1100 90, 1170 130, 1200 120" strokeWidth="1.4" />
            <path d="M 600 160 C 780 130, 930 190, 1060 150 C 1120 130, 1180 170, 1200 160" strokeDasharray="4 4" />
            <path d="M 600 200 C 800 170, 960 230, 1100 190 C 1150 170, 1190 210, 1200 200" />
          </g>

          {/* Compass Rose Vector */}
          <g transform="translate(1050, 120)" stroke="#d8cb9f" strokeOpacity="0.4" fill="none">
            <circle r="30" strokeWidth="0.8" />
            <circle r="2" fill="#d8cb9f" />
            <polygon points="0,-35 4,-8 0,0 -4,-8" fill="#d8cb9f" fillOpacity="0.4" />
            <polygon points="0,35 4,8 0,0 -4,8" fill="#d8cb9f" fillOpacity="0.2" />
            <polygon points="35,0 8,4 0,0 8,-4" fill="#d8cb9f" fillOpacity="0.2" />
            <polygon points="-35,0 -8,4 0,0 -8,-4" fill="#d8cb9f" fillOpacity="0.2" />
            <text x="0" y="-40" textAnchor="middle" fill="#d8cb9f" fontSize="10" fontFamily="'Share Tech Mono', monospace" fontWeight="700">N</text>
          </g>
        </svg>
      );
  }
}
