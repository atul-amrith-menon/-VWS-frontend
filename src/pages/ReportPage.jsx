import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Shield, AlertTriangle, Info, Printer, ArrowLeft } from 'lucide-react';
import { ChartsSection } from './ScanResultsPage';

const SEVERITY_MAP = {
  high:   { cls: 'risk-high',   label: 'HIGH' },
  medium: { cls: 'risk-medium', label: 'MEDIUM' },
  low:    { cls: 'risk-low',    label: 'LOW' },
  info:   { cls: 'risk-info',   label: 'INFO' },
};

function getSeverityKey(v) {
  const k = (v.risk_level || v.severity || 'info').toLowerCase();
  return SEVERITY_MAP[k] ? k : 'info';
}

// Group vulns by type (mirrors ScanResultsPage groupByType)
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
      const worstOf = items =>
        items.reduce((best, v) => {
          const k = getSeverityKey(v);
          return order[k] < order[best] ? k : best;
        }, 'info');
      return order[worstOf(a.items)] - order[worstOf(b.items)];
    });
}

export default function ReportPage() {
  const { scanId } = useParams();
  const navigate   = useNavigate();
  const [scan, setScan]   = useState(null);
  const [vulns, setVulns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/scan/${scanId}/report`)
      .then(r => { setScan(r.data.scan); setVulns(r.data.vulnerabilities || []); })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [scanId, navigate]);

  if (loading) return <div className="vx-fullscreen-loader"><div className="vx-spinner" /></div>;
  if (!scan)   return null;

  const counts = { high: 0, medium: 0, low: 0, info: 0 };
  vulns.forEach(v => {
    const k = getSeverityKey(v);
    counts[k]++;
  });

  const threatScore = Math.min(100, counts.high * 25 + counts.medium * 10 + counts.low * 3 + counts.info);
  const scoreColor  = threatScore >= 70 ? 'var(--vx-danger)' : threatScore >= 40 ? 'var(--vx-warning)' : 'var(--vx-success)';
  const groups      = groupByType(vulns);

  return (
    <>
      {/* ── Print-specific styles injected inline so they always apply ── */}
      <style>{`
        @media print {
          body { background: #fff !important; color: #111 !important; }
          .no-print { display: none !important; }
          .glass-card {
            background: #fff !important;
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
          }
          .gradient-text { color: #111 !important; -webkit-text-fill-color: #111 !important; }
          .vx-spinner, nav, header, footer { display: none !important; }
          /* Keep charts visible */
          .recharts-wrapper, .recharts-surface { overflow: visible !important; }
          /* Page breaks */
          .page-break-before { page-break-before: always; }
        }
      `}</style>

      <div className="container py-4" style={{ maxWidth: 860 }}>
        {/* Toolbar — hidden in print */}
        <div className="d-flex justify-content-between align-items-center mb-3 no-print">
          <button
            onClick={() => navigate(`/scan/${scanId}/results`)}
            className="vx-btn-ghost d-flex align-items-center gap-2"
          >
            <ArrowLeft size={15} /> Back to Results
          </button>
          <button onClick={() => window.print()} className="vx-btn-outline d-flex align-items-center gap-2">
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>

        <div className="glass-card p-5">
          {/* Report Header */}
          <div className="d-flex align-items-center gap-3 mb-4 pb-4 border-bottom" style={{ borderColor: 'var(--vx-border)' }}>
            <div className="brand-icon flex-shrink-0"><Shield size={24} /></div>
            <div>
              <h1 className="h4 fw-bold gradient-text mb-0">Vultix Vulnerability Report</h1>
              <div className="text-muted small">{scan.target_url}</div>
              <div className="text-muted small">Generated: {new Date().toLocaleString()}</div>
            </div>
          </div>

          {/* Score & Summary — 3 columns × 2 rows for clean PDF layout */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Threat Score',    val: `${threatScore}/100`,    color: scoreColor },
              { label: 'Critical / High', val: counts.high,              color: 'var(--vx-danger)' },
              { label: 'Medium',          val: counts.medium,            color: 'var(--vx-warning)' },
              { label: 'Low / Info',      val: counts.low + counts.info, color: 'var(--vx-info)' },
              { label: 'Unique Types',    val: groups.length,            color: 'var(--vx-primary)' },
              { label: 'Time Taken',      val: (() => {
                const d = scan.duration_seconds;
                if (!d) return '\u2014';
                if (d < 60) return `${Math.round(d)}s`;
                return `${Math.floor(d / 60)}m ${Math.round(d % 60)}s`;
              })(),                                                       color: 'var(--vx-text-muted)' },
            ].map(({ label, val, color }) => (
              <div className="col-4" key={label}>
                <div style={{
                  border: '1px solid var(--vx-border)',
                  borderRadius: 8,
                  padding: '12px 8px',
                  textAlign: 'center',
                  background: 'var(--vx-bg-card)',
                }}>
                  <div className="summary-number" style={{ color, fontSize: '1.55rem', lineHeight: 1.2 }}>{val}</div>
                  <div className="summary-label" style={{ fontSize: '0.7rem', marginTop: 4 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>


          {/* ── Analytics Charts (visible in print/PDF) ── */}
          {vulns.length > 0 && (
            <ChartsSection vulns={vulns} counts={counts} groups={groups} />
          )}

          {/* Findings */}
          <h2 className="h6 fw-bold mb-3 d-flex align-items-center gap-2 page-break-before">
            <AlertTriangle size={16} className="text-warning" /> Findings ({vulns.length})
          </h2>

          {vulns.length === 0 ? (
            <div className="text-center py-4 text-muted">No vulnerabilities detected.</div>
          ) : (
            vulns.map((v, i) => {
              const sk = getSeverityKey(v);
              const s  = SEVERITY_MAP[sk];
              return (
                <div key={i} className="mb-4 pb-4" style={{ borderBottom: '1px solid var(--vx-border)' }}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className={`risk-badge ${s.cls}`}>{s.label}</span>
                    <span className="fw-semibold">{v.vuln_type || v.vulnerability_type}</span>
                  </div>
                  {v.url && <div className="text-muted small mb-1">URL: {v.url}</div>}
                  {v.description && <p className="small mb-2">{v.description}</p>}
                  {v.evidence && (
                    <div className="evidence-box p-2 mb-2">
                      <div className="small fw-semibold text-danger mb-1">Evidence</div>
                      <code style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{v.evidence}</code>
                    </div>
                  )}
                  {(v.solution || v.recommendation) && (
                    <div className="solution-box p-2">
                      <div className="small fw-semibold text-success mb-1">Recommendation</div>
                      <p className="mb-0 small">{v.solution || v.recommendation}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
