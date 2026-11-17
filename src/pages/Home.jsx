import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { DEPOTS, getSystemSummaryStats } from '../data/index.js';
import PageHero from '../components/PageHero.jsx';
import { Panel, KpiTile } from '../components/ui/index.js';
import {
  Building2,
  Package,
  Calendar,
  Truck,
  Shield,
  Anchor,
  Plane,
  ArrowRight,
  Compass,
  Activity,
  TrendingUp,
  CheckCircle2,
  LogIn,
  FileText,
  AlertTriangle
} from 'lucide-react';

export default function Home() {
  const { isAuthenticated, openLoginModal } = useAuth();
  const stats = useMemo(() => getSystemSummaryStats(), []);
  const { stockLines } = useInventory();

  // Branch statistics
  const branchCounts = useMemo(() => {
    const armyDepots = DEPOTS.filter((d) => d.service === 'Army');
    const navyDepots = DEPOTS.filter((d) => d.service === 'Navy');
    const airForceDepots = DEPOTS.filter((d) => d.service === 'Air Force');

    const armyLines = stockLines.filter((l) => l.service === 'Army').length;
    const navyLines = stockLines.filter((l) => l.service === 'Navy').length;
    const airForceLines = stockLines.filter((l) => l.service === 'Air Force').length;

    return {
      army: { depots: armyDepots, lines: armyLines },
      navy: { depots: navyDepots, lines: navyLines },
      airForce: { depots: airForceDepots, lines: airForceLines }
    };
  }, [stockLines]);

  const liveAlertsFeed = [
    { id: 1, depot: 'LEH', level: 'CRITICAL', msg: 'Anti-Freeze Winter Diesel: Stock-out projected in 3w under sub-zero AWS pull' },
    { id: 2, depot: 'JODH', level: 'SURGE', msg: 'Heavy Dust Air Filters: Seasonal sandstorm surge active (+2.2x consumption)' },
    { id: 3, depot: 'KOCHI', level: 'REORDER', msg: 'Ready-to-Eat Marine Rations: Run-down reaches lead-time threshold (4w cover)' },
    { id: 4, depot: 'CHAND', level: 'MAINT', msg: 'VEH-008 Heavy Transport: Engine hours at 482 / 500h interval (Service due)' },
    { id: 5, depot: 'GUWAH', level: 'INFO', msg: 'IV Fluids (Ringer Lactate): Advance monsoon pre-positioning verified' }
  ];

  return (
    <div className="home-console-view fade-in-section">
      {/* Full-width Radar Hero */}
      <PageHero
        theme="home"
        sectorCode="COMMAND-PORTAL"
        title="INDIAN ARMED FORCES LOGISTICS AND INVENTORY SYSTEM"
        tagline="Multi-echelon decision-support simulation modeling seasonal demand, operational surges, and statistical inventory thresholds across Tri-Services logistics nodes."
        icon={Compass}
        badge="ACADEMIC SIMULATION // 8 THEATRE DEPOTS"
      >
        <div className="hero-actions-grid">
          {isAuthenticated ? (
            <Link to="/dashboard" className="hero-btn hero-btn-primary military-lift">
              <span>Go to My Dashboard</span>
              <ArrowRight size={16} />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openLoginModal('/dashboard')}
              className="hero-btn hero-btn-primary military-lift"
            >
              <LogIn size={16} />
              <span>Sign In to Console</span>
            </button>
          )}

          <Link to="/about" className="hero-btn hero-btn-secondary military-lift">
            <FileText size={16} />
            <span>Method and Data</span>
          </Link>
        </div>
      </PageHero>

      {/* Slim Live Feed Ticker */}
      <div className="live-alerts-ticker font-mono" role="region" aria-label="Simulated Live Operational Alerts">
        <div className="ticker-label">
          <AlertTriangle size={14} className="text-amber" />
          <span>LIVE INTEL FEED:</span>
        </div>
        <div className="ticker-track">
          <div className="ticker-content">
            {liveAlertsFeed.concat(liveAlertsFeed).map((alert, idx) => (
              <span key={`${alert.id}-${idx}`} className="ticker-item">
                <span className={`ticker-depot tag-${alert.level.toLowerCase()}`}>[{alert.depot}]</span>
                <span className="ticker-msg">{alert.msg}</span>
                <span className="ticker-sep">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="page-container home-body-content">
        {/* Three-Step Strip: Monitor, Forecast, Act */}
        <div className="home-workflow-strip">
          <div className="workflow-card">
            <div className="workflow-icon-box text-sage">
              <Activity size={20} />
            </div>
            <div className="workflow-text">
              <h4 className="workflow-title font-mono">1. MONITOR</h4>
              <p className="workflow-desc">Continuous-review tracking across 8 theatre depots and 30 tactical transport units.</p>
            </div>
          </div>

          <div className="workflow-card">
            <div className="workflow-icon-box text-sand">
              <TrendingUp size={20} />
            </div>
            <div className="workflow-text">
              <h4 className="workflow-title font-mono">2. FORECAST</h4>
              <p className="workflow-desc">Rolling-origin mathematical projections anticipating stock-outs ahead of static ROP.</p>
            </div>
          </div>

          <div className="workflow-card">
            <div className="workflow-icon-box text-steel">
              <CheckCircle2 size={20} />
            </div>
            <div className="workflow-text">
              <h4 className="workflow-title font-mono">3. ACT</h4>
              <p className="workflow-desc">Multi-echelon indent authorizations, commander approvals, and maintenance dispatch.</p>
            </div>
          </div>
        </div>

        {/* Row of Animated KPI Tiles */}
        <section className="home-kpi-row" style={{ marginTop: '24px' }}>
          <div className="kpi-grid four-cards-grid">
            <KpiTile
              label="Active Depots"
              value={stats.totalDepots}
              icon={Building2}
              accent="sage"
              subtext="5 Army, 2 Navy, 1 Air Force nodes"
            />
            <KpiTile
              label="Supply Commodities"
              value={stats.totalItems}
              icon={Package}
              accent="sand"
              subtext="Rations, POL, Medical, Engineering"
            />
            <KpiTile
              label="Evaluation Timeline"
              value={stats.totalWeeks}
              unit="Weeks"
              icon={Calendar}
              accent="steel"
              subtext="52w Baseline + 52w Backtest Runway"
            />
            <KpiTile
              label="Tactical Vehicles"
              value={30}
              unit="Units"
              icon={Truck}
              accent="amber"
              subtext="Interval usage & proactive maintenance"
            />
          </div>
        </section>

        {/* Three Service Branch Panels with Themed Visuals */}
        <section className="home-branches-section" style={{ marginTop: '28px' }}>
          <div className="section-heading-wrap">
            <div className="section-heading-accent" />
            <h2 className="section-heading-title font-mono">TRI-SERVICES LOGISTICS NODES</h2>
            <div className="section-heading-ticks" aria-hidden="true">
              <span /><span /><span />
            </div>
          </div>

          <div className="branch-panels-grid">
            {/* Army Panel: Contour Topographic Pattern */}
            <Panel
              title="INDIAN ARMY LOGISTICS NODES"
              icon={Shield}
              badge={`${branchCounts.army.depots.length} DEPOTS`}
              className="branch-panel branch-army"
            >
              <p className="branch-panel-desc">
                High-altitude northern passes, desert sectors, and forward transit holding formations.
              </p>
              <div className="branch-depots-chips">
                {branchCounts.army.depots.map((d) => (
                  <div key={d.id} className="depot-chip font-mono">
                    <span className="depot-chip-name">{d.name}</span>
                    <span className="depot-chip-sub">LT: {d.leadTimeWeeks}w</span>
                  </div>
                ))}
              </div>
              <div className="branch-panel-footer font-mono">
                <span>Active Stock Lines: <strong>{branchCounts.army.lines}</strong></span>
                <span>Command: Northern, Western, South Western, Eastern, Southern</span>
              </div>
            </Panel>

            {/* Navy Panel: Sonar Rings Pattern */}
            <Panel
              title="INDIAN NAVY LOGISTICS NODES"
              icon={Anchor}
              badge={`${branchCounts.navy.depots.length} DEPOTS`}
              className="branch-panel branch-navy"
            >
              <p className="branch-panel-desc">
                Eastern and Southern Naval Commands sustaining fleet readiness and maritime supply chains.
              </p>
              <div className="branch-depots-chips">
                {branchCounts.navy.depots.map((d) => (
                  <div key={d.id} className="depot-chip font-mono">
                    <span className="depot-chip-name">{d.name}</span>
                    <span className="depot-chip-sub">LT: {d.leadTimeWeeks}w</span>
                  </div>
                ))}
              </div>
              <div className="branch-panel-footer font-mono">
                <span>Active Stock Lines: <strong>{branchCounts.navy.lines}</strong></span>
                <span>Command: Eastern Naval, Southern Naval Commands</span>
              </div>
            </Panel>

            {/* Air Force Panel: Flight Path Arcs Pattern */}
            <Panel
              title="INDIAN AIR FORCE LOGISTICS NODES"
              icon={Plane}
              badge={`${branchCounts.airForce.depots.length} DEPOT`}
              className="branch-panel branch-airforce"
            >
              <p className="branch-panel-desc">
                Western Air Command airlift hub provisioning northern staging bases and high-tempo aviation wings.
              </p>
              <div className="branch-depots-chips">
                {branchCounts.airForce.depots.map((d) => (
                  <div key={d.id} className="depot-chip font-mono">
                    <span className="depot-chip-name">{d.name}</span>
                    <span className="depot-chip-sub">LT: {d.leadTimeWeeks}w</span>
                  </div>
                ))}
              </div>
              <div className="branch-panel-footer font-mono">
                <span>Active Stock Lines: <strong>{branchCounts.airForce.lines}</strong></span>
                <span>Command: Western Air Command</span>
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </div>
  );
}
