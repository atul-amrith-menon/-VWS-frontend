import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import {
  Shield, AlertTriangle, CheckCircle2, Info, FileText,
  ChevronDown, ChevronUp, ExternalLink, Trash2, Tag, Layers
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const SEVERITY_MAP = {
  high:   { label: 'HIGH',   cls: 'risk-high',   border: 'vuln-high',   icon: <AlertTriangle size={14}/> },
  medium: { label: 'MEDIUM', cls: 'risk-medium',  border: 'vuln-medium', icon: <AlertTriangle size={14}/> },
  low:    { label: 'LOW',    cls: 'risk-low',     border: 'vuln-low',    icon: <Info size={14}/> },
  info:   { label: 'INFO',   cls: 'risk-info',    border: 'vuln-info',   icon: <Info size={14}/> },
};

function getSeverityKey(v) {
  const k = (v.risk_level || v.severity || 'info').toLowerCase();
  return SEVERITY_MAP[k] ? k : 'info';
}

// ── Unique colour palette — one distinct colour per vuln type ────────────────
const UNIQUE_COLORS = [
  '#818cf8', '#f87171', '#34d399', '#fbbf24', '#38bdf8',
  '#a78bfa', '#fb923c', '#4ade80', '#e879f9', '#f472b6',
  '#22d3ee', '#facc15', '#86efac', '#c084fc', '#60a5fa',
  '#f97316', '#2dd4bf', '#e11d48', '#7c3aed', '#0ea5e9',
];

// Severity colors still used in the summary cards
const SEVERITY_COLORS = {
  high:   '#f87171',
  medium: '#fbbf24',
  low:    '#38bdf8',
  info:   '#6b7280',
};

// Assign a unique stable color to each vuln type by name
function getTypeColor(index) {
  return UNIQUE_COLORS[index % UNIQUE_COLORS.length];
}

// Custom tooltip shared by both charts
function VxTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(22,27,45,0.96)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: '0.8rem',
      color: '#e6edf3',
      boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
    }}>
      {label && <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill || p.stroke || '#e6edf3' }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// ── Pie label renderer — positions % outside the slice using midAngle ─────────
const RADIAN = Math.PI / 180;
function renderPieLabel({ cx, cy, midAngle, outerRadius, percent }) {
  if (percent < 0.05) return null; // skip tiny slices
  const r   = outerRadius + 18;
  const x   = cx + r * Math.cos(-midAngle * RADIAN);
  const y   = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x} y={y}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ fontSize: '0.7rem', fontWeight: 600, fill: '#8b949e', pointerEvents: 'none' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ── Charts Section (exported so ReportPage can reuse it) ─────────────────────
export function ChartsSection({ vulns, counts, groups }) {
  // Pie data — one slice per unique vuln type (unique colors)
  const pieData = groups
    .slice(0, 12)
    .map((g, i) => ({
      name: g.vuln_type.length > 28 ? g.vuln_type.slice(0, 28) + '…' : g.vuln_type,
      fullName: g.vuln_type,
      value: g.items.length,
      color: getTypeColor(i),
    }));

  // Bar data — top 10 vuln types, same unique color as pie
  const barData = groups
    .slice(0, 10)
    .map((g, i) => ({
      name: g.vuln_type.length > 22 ? g.vuln_type.slice(0, 22) + '…' : g.vuln_type,
      fullName: g.vuln_type,
      count: g.items.length,
      color: getTypeColor(i),
    }));

  if (vulns.length === 0) return null;

  return (
    <div className="glass-card p-4 mb-4" style={{ borderRadius: 'var(--vx-radius)' }}>
      <h2
        className="h6 fw-bold mb-4 d-flex align-items-center gap-2"
        style={{ color: 'var(--vx-text)' }}
      >
        <Shield size={16} style={{ color: 'var(--vx-primary)' }} />
        Vulnerability Analytics
      </h2>

      <div className="row g-4">
        {/* ── Pie Chart ── */}
        <div className="col-md-6">
          <div
            className="text-center mb-2 small fw-semibold"
            style={{ color: 'var(--vx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.72rem' }}
          >
            Findings by Type
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={88}
                paddingAngle={3}
                dataKey="value"
                label={renderPieLabel}
                labelLine={false}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip content={<VxTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ── Bar Chart ── */}
        <div className="col-md-6">
          <div
            className="text-center mb-2 small fw-semibold"
            style={{ color: 'var(--vx-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.72rem' }}
          >
            Instances by Type {groups.length > 10 && <span style={{ fontWeight: 400 }}>(top 10)</span>}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#8b949e', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                tick={{ fill: '#8b949e', fontSize: 10, width: 155 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.length > 20 ? v.slice(0, 20) + '…' : v}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <VxTooltip
                      active={active}
                      payload={payload}
                      label={d?.fullName}
                    />
                  );
                }}
              />
              <Bar dataKey="count" name="Instances" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {barData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color} opacity={0.88} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Single instance row inside a group ─────────────────────────────────────
function InstanceRow({ vuln }) {
  const [open, setOpen] = useState(false);
  const sk = getSeverityKey(vuln);
  const s  = SEVERITY_MAP[sk];

  return (
    <div className="mb-2" style={{ borderLeft: '2px solid var(--vx-border)', paddingLeft: '0.75rem' }}>
      <button
        className="w-100 text-start border-0 bg-transparent py-2 px-1 d-flex align-items-start gap-2"
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', background: 'transparent', color: 'inherit' }}
      >
        <ExternalLink size={12} className="text-muted mt-1 flex-shrink-0" />
        <span className="small text-truncate flex-1" style={{ color: 'var(--vx-text)', maxWidth: '70%' }}>
          {vuln.url || '—'}
        </span>
        <span className={`risk-badge ${s.cls} ms-auto flex-shrink-0`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
          {s.label}
        </span>
        {open ? <ChevronUp size={13} className="text-muted flex-shrink-0" /> : <ChevronDown size={13} className="text-muted flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-1 pb-2">
          {vuln.description && (
            <p className="small text-secondary mb-2 mt-1">{vuln.description}</p>
          )}
          {vuln.evidence && (
            <div className="evidence-box p-2 mb-2">
              <div className="small fw-semibold mb-1 text-danger">Evidence</div>
              <code style={{ wordBreak: 'break-all', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                {vuln.evidence}
              </code>
            </div>
          )}
          {(vuln.solution || vuln.recommendation) && (
            <div className="solution-box p-2">
              <div className="small fw-semibold mb-1 text-success">Recommendation</div>
              <p className="mb-0 small">{vuln.solution || vuln.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Group card: one vuln_type, N instances ──────────────────────────────────
function VulnGroupCard({ group }) {
  const [open, setOpen] = useState(false);

  const order = { high: 0, medium: 1, low: 2, info: 3 };
  const worstKey = group.items.reduce((best, v) => {
    const k = getSeverityKey(v);
    return order[k] < order[best] ? k : best;
  }, 'info');
  const s = SEVERITY_MAP[worstKey];

  return (
    <div className={`glass-card vuln-card ${s.border} mb-3`}>
      <button
        className="w-100 text-start p-3 border-0 d-flex align-items-center gap-3"
        onClick={() => setOpen(o => !o)}
        style={{ background: 'transparent', color: 'inherit', cursor: 'pointer' }}
      >
        <span className={`risk-badge ${s.cls} flex-shrink-0`}>{s.label}</span>

        <span className="fw-semibold flex-1 d-flex align-items-center gap-2" style={{ color: 'var(--vx-text)' }}>
          {group.vuln_type}
        </span>

        <span
          className="flex-shrink-0 d-flex align-items-center gap-1 small"
          style={{
            background: 'var(--vx-glass)',
            border: '1px solid var(--vx-border)',
            borderRadius: '999px',
            padding: '2px 10px',
            color: 'var(--vx-text-muted)',
          }}
        >
          <Layers size={12} />
          {group.items.length} {group.items.length === 1 ? 'instance' : 'instances'}
        </span>

        {open ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
      </button>

      {open && (
        <div className="px-3 pb-3">
          <div
            className="small fw-semibold mb-2 d-flex align-items-center gap-1"
            style={{ color: 'var(--vx-text-muted)' }}
          >
            <Tag size={12} /> Affected URLs
          </div>
          {group.items.map((v, i) => (
            <InstanceRow key={i} vuln={v} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Group raw flat vuln list by vuln_type ────────────────────────────────────
function groupByType(vulns) {
  const map = new Map();
  for (const v of vulns) {
    const type = (v.vuln_type || v.vulnerability_type || 'Unknown').trim();
    if (!map.has(type)) map.set(type, []);
    map.get(type).push(v);
  }
  const order = { high: 0, medium: 1, low: 2, info: 3 };
  return Array.from(map.entries())
    .map(([vuln_type, items]) => ({ vuln_type, items }))
    .sort((a, b) => {
      const worstOf = (items) =>
        items.reduce((best, v) => {
          const k = getSeverityKey(v);
          return order[k] < order[best] ? k : best;
        }, 'info');
      return order[worstOf(a.items)] - order[worstOf(b.items)];
    });
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ScanResultsPage() {
  const { scanId }  = useParams();
  const navigate    = useNavigate();
  const [scan, setScan]       = useState(null);
  const [vulns, setVulns]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    api.get(`/api/scan/${scanId}`)
      .then(r => { setScan(r.data.scan); setVulns(r.data.vulnerabilities || []); })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [scanId, navigate]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this scan? This cannot be undone.')) return;
    await api.delete(`/api/scan/${scanId}`);
    navigate('/history');
  };

  if (loading) return <div className="vx-fullscreen-loader"><div className="vx-spinner" /></div>;
  if (!scan)   return null;

  // Severity counts (based on individual instances, not groups)
  const counts = { high: 0, medium: 0, low: 0, info: 0 };
  vulns.forEach(v => {
    const k = getSeverityKey(v);
    counts[k]++;
  });

  const threatScore = Math.min(100,
    counts.high * 25 + counts.medium * 10 + counts.low * 3 + counts.info);
  const scoreColor = threatScore >= 70
    ? 'var(--vx-danger)' : threatScore >= 40
    ? 'var(--vx-warning)' : 'var(--vx-success)';

  // Apply severity filter, then group
  const filtered = filter === 'all'
    ? vulns
    : vulns.filter(v => getSeverityKey(v) === filter);

  const groups    = groupByType(filtered);
  const allGroups = groupByType(vulns); // unfiltered groups for charts

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="h5 fw-bold gradient-text mb-1 d-flex align-items-center gap-2">
            <Shield size={20} /> Scan Results
          </h1>
          <div className="small text-muted d-flex align-items-center gap-1">
            <ExternalLink size={12} />{scan.target_url}
          </div>
        </div>
        <div className="d-flex gap-2">
          <Link to={`/report/${scanId}`} className="vx-btn-outline d-flex align-items-center gap-1">
            <FileText size={15} /> Report
          </Link>
          <button onClick={handleDelete} className="vx-btn-danger d-flex align-items-center gap-1">
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Threat Score',    value: `${threatScore}/100`,                    color: scoreColor },
          { label: 'Critical / High', value: counts.high,                              color: 'var(--vx-danger)' },
          { label: 'Medium',          value: counts.medium,                            color: 'var(--vx-warning)' },
          { label: 'Low / Info',      value: counts.low + counts.info,                 color: 'var(--vx-info)' },
          { label: 'Unique Types',    value: groupByType(vulns).length,                color: 'var(--vx-primary)' },
          { label: 'Time Taken',      value: (() => {
            const d = scan.duration_seconds;
            if (!d) return '—';
            if (d < 60) return `${Math.round(d)}s`;
            return `${Math.floor(d / 60)}m ${Math.round(d % 60)}s`;
          })(),                                                                         color: 'var(--vx-text-muted)' },
        ].map(({ label, value, color }) => (
          <div className="col-6 col-md-4 col-lg" key={label}>
            <div className="glass-card summary-card p-3 text-center">
              <div className="summary-number" style={{ color }}>{value}</div>
              <div className="summary-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Analytics Charts ── */}
      <ChartsSection vulns={vulns} counts={counts} groups={allGroups} />

      {/* Filter Tabs */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {['all', 'high', 'medium', 'low', 'info'].map(f => (
          <button
            key={f}
            className={`vx-filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.toUpperCase()} {f === 'all' ? `(${vulns.length})` : `(${counts[f] || 0})`}
          </button>
        ))}
      </div>

      {/* Grouped Vulnerability List */}
      {groups.length === 0 ? (
        <div className="glass-card p-5 text-center">
          <CheckCircle2 size={48} className="text-success mb-3" />
          <h2 className="h6 fw-bold">No vulnerabilities found</h2>
          <p className="text-muted small">
            {filter === 'all'
              ? 'This target looks clean for the checks performed.'
              : `No ${filter} severity issues found.`}
          </p>
        </div>
      ) : (
        <>
          <div className="small text-muted mb-3 d-flex align-items-center gap-1">
            <Layers size={13} />
            {groups.length} vulnerability {groups.length === 1 ? 'category' : 'categories'} ·{' '}
            {filtered.length} total {filtered.length === 1 ? 'instance' : 'instances'}
          </div>
          {groups.map((g) => (
            <VulnGroupCard key={g.vuln_type} group={g} />
          ))}
        </>
      )}
    </div>
  );
}
