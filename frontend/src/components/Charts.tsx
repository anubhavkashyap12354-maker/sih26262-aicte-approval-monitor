import React, { useState } from 'react';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  ShieldCheck, 
  GitBranch, 
  AlertTriangle,
  Info
} from 'lucide-react';

interface ChartProps {
  apps: Array<{
    id: string;
    inst: string;
    reg: string;
    rt: string;
    i: number;
    age: number;
    evc: number;
  }>;
  ul: Array<{
    inst: string;
    reg: string;
    t: string;
    d: number;
    s: number;
    id?: number;
  }>;
  dl: Array<{
    inst: string;
    reg: string;
    t: string;
    d: number;
    s: number;
    id?: number;
  }>;
  stageFn: (a: any) => string | null;
  leftFn: (a: any) => number;
  theme?: 'abyss' | 'daylight';
}

// -------------------------------------------------------------
// 1. Stage Distribution Donut Chart
// -------------------------------------------------------------
export const StageDistributionDonut: React.FC<ChartProps> = ({ apps, stageFn, leftFn }) => {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  const stages = [
    { name: 'Scrutiny', color: '#5de1ee', glow: 'rgba(93, 225, 238, 0.4)' },
    { name: 'EVC', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
    { name: 'SAC/SHC', color: '#6fe3a4', glow: 'rgba(111, 227, 164, 0.4)' },
  ];

  const total = Math.max(apps.length, 1);
  const stageData = stages.map((s) => {
    const list = apps.filter((a) => stageFn(a) === s.name);
    const count = list.length;
    const overdue = list.filter((a) => leftFn(a) < 0).length;
    const pct = apps.length > 0 ? (count / total) * 100 : 0;
    return { ...s, count, overdue, pct };
  });

  // Calculate SVG arc segments
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = 0;
  const segments = stageData.map((d) => {
    const strokeDasharray = `${(d.pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle;
    accumulatedAngle += (d.pct / 100) * circumference;
    return { ...d, strokeDasharray, strokeDashoffset };
  });

  const activeItem = hoveredStage 
    ? stageData.find((s) => s.name === hoveredStage) 
    : null;

  return (
    <div className="glass-card-interactive chart-card">
      <div className="chart-header">
        <div className="chart-title-group">
          <div className="chart-icon-box cyan">
            <PieIcon size={16} />
          </div>
          <div>
            <h3 className="chart-title">Stage-wise Pendency</h3>
            <span className="chart-subtitle">Distribution across workflow phases</span>
          </div>
        </div>
        <span className="badge-glass">{apps.length} active files</span>
      </div>

      <div className="donut-container">
        <div className="donut-graphic-wrapper">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="var(--line)"
              strokeWidth={strokeWidth}
              opacity={0.35}
            />
            {segments.map((seg) => (
              <circle
                key={seg.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={hoveredStage === seg.name ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className="donut-segment"
                onMouseEnter={() => setHoveredStage(seg.name)}
                onMouseLeave={() => setHoveredStage(null)}
                style={{
                  filter: hoveredStage === seg.name ? `drop-shadow(0 0 10px ${seg.glow})` : undefined,
                  transition: 'stroke-width 0.25s ease, filter 0.25s ease',
                  cursor: 'pointer',
                }}
              />
            ))}
          </svg>
          <div className="donut-center-info">
            {activeItem ? (
              <>
                <span className="donut-center-val" style={{ color: activeItem.color }}>
                  {activeItem.count}
                </span>
                <span className="donut-center-label">{activeItem.name}</span>
                <span className="donut-center-sub">{activeItem.pct.toFixed(0)}% of load</span>
              </>
            ) : (
              <>
                <span className="donut-center-val">{apps.length}</span>
                <span className="donut-center-label">Applications</span>
                <span className="donut-center-sub">Total Active</span>
              </>
            )}
          </div>
        </div>

        <div className="donut-legend">
          {stageData.map((s) => (
            <div
              key={s.name}
              className={`legend-item ${hoveredStage === s.name ? 'active' : ''}`}
              onMouseEnter={() => setHoveredStage(s.name)}
              onMouseLeave={() => setHoveredStage(null)}
            >
              <div className="legend-label-row">
                <span className="legend-indicator" style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                <span className="legend-name">{s.name}</span>
                <span className="legend-count">{s.count}</span>
              </div>
              <div className="legend-meta">
                <span className="legend-pct">{s.pct.toFixed(1)}%</span>
                {s.overdue > 0 ? (
                  <span className="legend-overdue-tag">⚠️ {s.overdue} overdue</span>
                ) : (
                  <span className="legend-ok-tag">✓ On Track</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. Regional Compliance & Overdue Grouped Bar Chart
// -------------------------------------------------------------
export const RegionalComplianceBarChart: React.FC<ChartProps> = ({ apps, leftFn }) => {
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const regions = ['North', 'South', 'East', 'West'];

  const regionMetrics = regions.map((r) => {
    const rApps = apps.filter((a) => a.reg === r);
    const total = rApps.length;
    const overdue = rApps.filter((a) => leftFn(a) < 0).length;
    const compliant = total - overdue;
    const rate = total > 0 ? Math.round((compliant / total) * 100) : 100;
    return { region: r, total, compliant, overdue, rate };
  });

  const maxVal = Math.max(...regionMetrics.map((m) => m.total), 1);

  return (
    <div className="glass-card-interactive chart-card">
      <div className="chart-header">
        <div className="chart-title-group">
          <div className="chart-icon-box blue">
            <BarChart3 size={16} />
          </div>
          <div>
            <h3 className="chart-title">Regional Processing & Overdue</h3>
            <span className="chart-subtitle">Jurisdictional throughput & SLA breach rates</span>
          </div>
        </div>
        <div className="chart-legend-mini">
          <span className="mini-legend compliant">Within SLA</span>
          <span className="mini-legend overdue">Overdue</span>
        </div>
      </div>

      <div className="bar-chart-container">
        {regionMetrics.map((rm) => {
          const compliantH = (rm.compliant / maxVal) * 100;
          const overdueH = (rm.overdue / maxVal) * 100;
          const isSelected = activeRegion === rm.region;

          return (
            <div
              key={rm.region}
              className={`bar-group ${isSelected ? 'selected' : ''}`}
              onMouseEnter={() => setActiveRegion(rm.region)}
              onMouseLeave={() => setActiveRegion(null)}
            >
              <div className="bar-column-wrapper">
                <div className="bar-track">
                  {/* Overdue Bar Segment */}
                  {rm.overdue > 0 && (
                    <div
                      className="bar-fill overdue"
                      style={{ height: `${Math.max(overdueH, 8)}%` }}
                      title={`${rm.overdue} Overdue in ${rm.region}`}
                    >
                      <span className="bar-value-tag">{rm.overdue}</span>
                    </div>
                  )}
                  {/* Compliant Bar Segment */}
                  {rm.compliant > 0 && (
                    <div
                      className="bar-fill compliant"
                      style={{ height: `${Math.max(compliantH, 8)}%` }}
                      title={`${rm.compliant} On Track in ${rm.region}`}
                    >
                      <span className="bar-value-tag">{rm.compliant}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bar-labels">
                <span className="bar-region-name">{rm.region}</span>
                <span className={`bar-compliance-badge ${rm.rate >= 80 ? 'good' : rm.rate >= 50 ? 'warn' : 'bad'}`}>
                  {rm.rate}% SLA
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {activeRegion && (
        <div className="chart-inspect-banner">
          <Info size={13} />
          <span>
            <strong>{activeRegion} Region:</strong> {regionMetrics.find((m) => m.region === activeRegion)?.total} total files · {regionMetrics.find((m) => m.region === activeRegion)?.compliant} on track · {regionMetrics.find((m) => m.region === activeRegion)?.overdue} escalated SLA breaches.
          </span>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 3. Overall Statutory SLA Compliance Gauge
// -------------------------------------------------------------
export const SLAComplianceGauge: React.FC<ChartProps> = ({ apps, ul, dl, leftFn }) => {
  // Aggregate total items
  const totalApps = apps.length;
  const overdueApps = apps.filter((a) => leftFn(a) < 0).length;

  const activeUl = ul.filter((u) => u.s < 2);
  const overdueUl = activeUl.filter((u) => u.d <= 0).length;

  const activeDl = dl.filter((u) => u.s < 2);
  const overdueDl = activeDl.filter((u) => u.d <= 0).length;

  const totalMonitored = totalApps + activeUl.length + activeDl.length;
  const totalOverdue = overdueApps + overdueUl + overdueDl;
  const compliantCount = Math.max(0, totalMonitored - totalOverdue);

  const complianceRate = totalMonitored > 0 
    ? Math.round((compliantCount / totalMonitored) * 100) 
    : 100;

  // Arc calculation for half-circle gauge
  const radius = 68;
  const stroke = 14;
  const arcLen = Math.PI * radius; // 180 degrees
  const offset = arcLen - (complianceRate / 100) * arcLen;

  const statusTone = complianceRate >= 80 ? 'optimal' : complianceRate >= 60 ? 'warning' : 'critical';
  const statusColor = complianceRate >= 80 ? '#6fe3a4' : complianceRate >= 60 ? '#ffc46b' : '#ff7a7a';

  return (
    <div className="glass-card-interactive chart-card gauge-card">
      <div className="chart-header">
        <div className="chart-title-group">
          <div className="chart-icon-box green">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h3 className="chart-title">AICTE Compliance Index</h3>
            <span className="chart-subtitle">Statutory APH adherence score</span>
          </div>
        </div>
        <span className={`status-pill-glass ${statusTone}`}>
          {statusTone.toUpperCase()}
        </span>
      </div>

      <div className="gauge-body">
        <div className="gauge-svg-wrapper">
          <svg width={170} height={95} viewBox="0 0 170 95" className="gauge-svg">
            <path
              d="M 15 85 A 68 68 0 0 1 155 85"
              fill="none"
              stroke="var(--line)"
              strokeWidth={stroke}
              strokeLinecap="round"
              opacity={0.3}
            />
            <path
              d="M 15 85 A 68 68 0 0 1 155 85"
              fill="none"
              stroke={statusColor}
              strokeWidth={stroke}
              strokeDasharray={arcLen}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
                filter: `drop-shadow(0 0 8px ${statusColor}66)`,
              }}
            />
          </svg>
          <div className="gauge-value-overlay">
            <span className="gauge-number" style={{ color: statusColor }}>
              {complianceRate}%
            </span>
            <span className="gauge-label">Health Score</span>
          </div>
        </div>

        <div className="gauge-breakdown-grid">
          <div className="gauge-metric-item">
            <span className="gauge-metric-num">{compliantCount}</span>
            <span className="gauge-metric-desc">In SLA</span>
          </div>
          <div className="gauge-metric-divider" />
          <div className="gauge-metric-item">
            <span className="gauge-metric-num overdue">{totalOverdue}</span>
            <span className="gauge-metric-desc">Breaches</span>
          </div>
          <div className="gauge-metric-divider" />
          <div className="gauge-metric-item">
            <span className="gauge-metric-num">{totalMonitored}</span>
            <span className="gauge-metric-desc">Monitored</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 4. Route Workflow Pipeline Breakdown
// -------------------------------------------------------------
export const RouteWorkflowChart: React.FC<ChartProps> = ({ apps }) => {
  const routes = [
    { code: 'S', label: 'Scrutiny Only', stages: 1 },
    { code: 'SE', label: 'Scrutiny → EVC', stages: 2 },
    { code: 'ES', label: 'EVC → SAC/SHC', stages: 2 },
    { code: 'E', label: 'EVC Direct', stages: 1 },
    { code: 'SES', label: 'Full Pathway', stages: 3 },
  ];

  const total = Math.max(apps.length, 1);
  const routeStats = routes.map((r) => {
    const count = apps.filter((a) => a.rt === r.code).length;
    const pct = (count / total) * 100;
    return { ...r, count, pct };
  });

  return (
    <div className="glass-card-interactive chart-card">
      <div className="chart-header">
        <div className="chart-title-group">
          <div className="chart-icon-box purple">
            <GitBranch size={16} />
          </div>
          <div>
            <h3 className="chart-title">Routing Pathways</h3>
            <span className="chart-subtitle">Statutory approval workflow allocation</span>
          </div>
        </div>
        <span className="badge-glass">5 Prescribed Routes</span>
      </div>

      <div className="route-list">
        {routeStats.map((rs) => (
          <div key={rs.code} className="route-item">
            <div className="route-row-top">
              <div className="route-code-badge">{rs.code}</div>
              <span className="route-name">{rs.label}</span>
              <span className="route-volume">{rs.count} inst.</span>
            </div>
            <div className="route-bar-track">
              <div 
                className="route-bar-progress" 
                style={{ width: `${Math.max(rs.pct, 4)}%` }} 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 5. Risk & Escalation Severity Radar
// -------------------------------------------------------------
export const UrgencyBreakdownChart: React.FC<{ items: Array<{ k: string; i: string; d: number; r: string }> }> = ({ items }) => {
  const l1 = items.filter((x) => x.d > 0 && x.d <= 15).length;
  const l2 = items.filter((x) => x.d <= 0 && x.d >= -7).length;
  const l3 = items.filter((x) => x.d < -7).length;
  const normal = items.filter((x) => x.d > 15).length;

  const tiers = [
    { name: 'Normal (>15d)', count: normal, color: '#6fe3a4', level: 'Standard' },
    { name: 'L1 Reminder (≤15d)', count: l1, color: '#ffc46b', level: 'Institution' },
    { name: 'L2 Overdue (≤0d)', count: l2, color: '#ff906b', level: 'Regional' },
    { name: 'L3 Critical (<-7d)', count: l3, color: '#ff5c5c', level: 'Bureau' },
  ];

  const total = Math.max(items.length, 1);

  return (
    <div className="glass-card-interactive chart-card">
      <div className="chart-header">
        <div className="chart-title-group">
          <div className="chart-icon-box red">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 className="chart-title">Escalation Ladder Tiers</h3>
            <span className="chart-subtitle">Action requirements by urgency level</span>
          </div>
        </div>
        <span className="badge-glass danger">{l2 + l3} Overdue</span>
      </div>

      <div className="urgency-grid">
        {tiers.map((t) => (
          <div key={t.name} className="urgency-tier-card" style={{ borderLeft: `3px solid ${t.color}` }}>
            <div className="urgency-top">
              <span className="urgency-level-tag" style={{ color: t.color }}>{t.level}</span>
              <span className="urgency-count">{t.count}</span>
            </div>
            <span className="urgency-name">{t.name}</span>
            <div className="urgency-bar-track">
              <div 
                className="urgency-bar-fill" 
                style={{ 
                  width: `${(t.count / total) * 100}%`,
                  backgroundColor: t.color,
                  boxShadow: `0 0 6px ${t.color}66`
                }} 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
