import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Shield, Search, Globe, AlertTriangle, Lock,
  FileWarning, RefreshCw, ChevronRight, Clock, ExternalLink,
  Cpu, Database, Share2, Key, Code2, GitBranch, Server, Radio
} from 'lucide-react';

/* ── All attacks the scanner performs ─────────────────────────────────────── */
const TRADITIONAL_CHECKS = [
  { icon: <AlertTriangle size={18}/>, label: 'SQL Injection',            desc: 'Identifies SQL injection points in query parameters and forms.',                            glow: 'danger',  tag: 'HIGH'   },
  { icon: <Zap           size={18}/>, label: 'Cross-Site Scripting (XSS)', desc: 'Detects reflected & stored XSS vectors across all input surfaces.',                      glow: 'danger',  tag: 'HIGH'   },
  { icon: <Code2         size={18}/>, label: 'Server-Side Template Injection (SSTI)', desc: 'Detects template injection vulnerabilities by executing benign mathematical evaluations.', glow: 'danger', tag: 'HIGH' },
  { icon: <Lock          size={18}/>, label: 'CSRF',                     desc: 'Checks for missing or weak Cross-Site Request Forgery token protection.',                    glow: 'warning', tag: 'MEDIUM' },
  { icon: <Globe         size={18}/>, label: 'Security Misconfiguration', desc: 'Scans HTTP headers, cookies, HTTPS enforcement, and exposed server config.',                glow: 'warning', tag: 'MEDIUM' },
  { icon: <Search        size={18}/>, label: 'Directory Traversal',       desc: 'Probes for path traversal vulnerabilities that expose sensitive files.',                    glow: 'danger',  tag: 'HIGH'   },
  { icon: <FileWarning   size={18}/>, label: 'Sensitive File Exposure',   desc: 'Discovers exposed .env files, backups, git repos, config files, and admin panels.',        glow: 'warning', tag: 'MEDIUM' },
  { icon: <Share2        size={18}/>, label: 'Open Redirect',             desc: 'Identifies redirect parameters that can be hijacked to send users to malicious sites.',    glow: 'warning', tag: 'MEDIUM' },
  { icon: <Shield        size={18}/>, label: 'Clickjacking',              desc: 'Checks for missing X-Frame-Options and CSP frame-ancestors headers.',                      glow: 'warning', tag: 'MEDIUM' },
  { icon: <Key           size={18}/>, label: 'Weak Authentication',       desc: 'Evaluates authentication strength, default credentials, and login protections.',            glow: 'danger',  tag: 'HIGH'   },
  { icon: <Server        size={18}/>, label: 'Infrastructure & Port Scan (Nmap)', desc: 'Scans top 100 ports, detects exposed services, outdated versions, and missing HTTP security headers.', glow: 'danger', tag: 'HIGH' },
];

const AI_CHECKS = [
  { icon: <Radio         size={18}/>, label: 'Server-Side Request Forgery (SSRF)', desc: 'AI probes internal network endpoints and cloud metadata services for SSRF vectors.',           glow: 'danger',  tag: 'HIGH'   },
  { icon: <Globe         size={18}/>, label: 'CORS Misconfiguration',              desc: 'AI tests cross-origin resource sharing policies for overly permissive configurations.',         glow: 'warning', tag: 'MEDIUM' },
  { icon: <Key           size={18}/>, label: 'Insecure Direct Object Reference (IDOR)', desc: 'AI enumerates ID parameters to detect unauthorized access to other users\' data.',         glow: 'danger',  tag: 'HIGH'   },
  { icon: <GitBranch     size={18}/>, label: 'Business Logic & API Endpoint Discovery', desc: 'AI discovers hidden API endpoints and tests for business logic flaws.',                    glow: 'warning', tag: 'MEDIUM' },
  { icon: <Code2         size={18}/>, label: 'HTTP Parameter Pollution (HPP)',     desc: 'AI fuzzes duplicate parameter submissions to bypass validation and filters.',                    glow: 'warning', tag: 'MEDIUM' },
  { icon: <Database      size={18}/>, label: 'XML External Entity (XXE) Injection', desc: 'AI injects malicious XML payloads to detect XXE vulnerabilities in XML parsers.',             glow: 'danger',  tag: 'HIGH'   },
  { icon: <Cpu           size={18}/>, label: 'Sensitive Data Exposure',            desc: 'AI scans responses for exposed API keys, tokens, PII, and internal system data.',               glow: 'warning', tag: 'MEDIUM' },
];

const TAG_COLOR = { HIGH: 'tag-high', MEDIUM: 'tag-medium', LOW: 'tag-low' };

function CheckCard({ c }) {
  return (
    <div className="col-md-6" >
      <div className={`glass-card security-check-card p-3`} data-glow={c.glow}>
        <div className="check-card-glow" />
        <div className="d-flex align-items-start gap-3">
          <div className={`check-icon-wrap check-icon-${c.glow}`}>{c.icon}</div>
          <div className="flex-1">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="fw-semibold small">{c.label}</span>
              <span className={`check-severity-tag ${TAG_COLOR[c.tag]}`}>{c.tag}</span>
            </div>
            <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.8rem' }}>{c.desc}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl]         = useState('');
  const [useAi, setUseAi]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    api.get('/api/scans')
      .then(r => setRecentScans((r.data.scans || []).slice(0, 5)))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/scan', { target_url: url, use_ai: useAi });
      navigate(`/scan/${res.data.scan_id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start scan.');
      setLoading(false);
    }
  };

  const statusBadge = (status) => {
    const map = { completed: 'success', running: 'info', error: 'danger', cancelled: 'warning' };
    return map[status] || 'muted';
  };

  // Smart routing: running scans → progress page; everything else → results
  const scanRoute = (scan) => scan.status === 'running'
    ? `/scan/${scan.id}`
    : `/scan/${scan.id}/results`;

  return (
    <div className="container py-4">
      {/* ── Hero ── */}
      <div className="hero-section text-center mb-4">
        <div className="hero-glow" />
        <div className="hero-icon mb-3"><Shield size={52} /></div>
        <h1 className="display-6 fw-bold mb-2">
          <span className="gradient-text">Web Vulnerability</span> Scanner
        </h1>
        <p className="text-muted mx-auto" style={{ maxWidth: 500 }}>
          Detect XSS, SQL Injection, CSRF, SSTI, Nmap port scans, and more — powered by Vultix AI.
        </p>
        <div className="mt-2 small text-muted">
          Signed in as <span className="gradient-text fw-semibold">{user?.username}</span>
        </div>
      </div>

      {/* ── Scan Form ── */}
      <div className="scan-form-wrapper mb-5 mx-auto" style={{ maxWidth: 680 }}>
        <div className="glass-card p-4">
          {error && <div className="vx-alert vx-alert-danger mb-3">{error}</div>}
          <form onSubmit={handleSubmit}>
            <label className="form-label fw-semibold small mb-2">Target URL</label>
            <div className="input-group mb-3">
              <span className="glass-input-icon input-group-text"><Globe size={16}/></span>
              <input
                className="glass-input form-control"
                value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                style={{ borderRadius: 0 }}
              />
              <button className="btn-scan" type="submit" disabled={loading}>
                {loading
                  ? <><span className="vx-spinner-sm me-2" />Scanning…</>
                  : <><Search size={16} className="me-2" />Scan Now</>}
              </button>
            </div>
            
            <div className="form-check form-switch mb-2">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="useAiToggle" 
                checked={useAi} 
                onChange={(e) => setUseAi(e.target.checked)} 
              />
              <label className="form-check-label small fw-semibold" htmlFor="useAiToggle" style={{ color: 'var(--vx-text)' }}>
                Enable AI Orchestrator (vLLM / DeepSeek)
              </label>
            </div>

            <div className="mt-2 small text-muted d-flex align-items-center gap-1">
              <Shield size={12} /> Scanning is safe and read-only — no data is modified.
            </div>
          </form>
        </div>
      </div>

      {/* ── Recent Scans ── */}
      {recentScans.length > 0 && (
        <section className="mb-5">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
              <Clock size={16} className="text-muted" /> Recent Scans
            </h2>
            <Link to="/history" className="vx-link small d-flex align-items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="row g-3">
            {recentScans.map(scan => (
              <div className="col-md-6 col-lg-4" key={scan.id}>
                <div className="glass-card scan-card p-3" onClick={() => navigate(scanRoute(scan))}>
                  <div className="d-flex align-items-start justify-content-between">
                    <div className="flex-1 min-width-0">
                      <div className="d-flex align-items-center gap-1 mb-1">
                        <ExternalLink size={12} className="text-muted flex-shrink-0" />
                        <span className="small fw-medium text-truncate" style={{ maxWidth: 180 }}>
                          {scan.target_url}
                        </span>
                      </div>
                      <span className={`risk-badge risk-${statusBadge(scan.status)}`}>{scan.status}</span>
                    </div>
                    <ChevronRight size={16} className="text-muted flex-shrink-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Traditional Security Checks ── */}
      <section className="security-checks-section mb-5">
        <div className="d-flex align-items-center gap-3 mb-4">
          <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
            <Shield size={16} className="section-title-icon" /> Traditional Security Checks
          </h2>
          <span className="core-checks-label"><RefreshCw size={10} /> {TRADITIONAL_CHECKS.length} CHECKS</span>
        </div>
        <div className="row g-3">
          {TRADITIONAL_CHECKS.map((c, i) => <CheckCard key={i} c={c} />)}
        </div>
      </section>

      {/* ── AI-Powered Checks ── */}
      <section className="security-checks-section mb-5">
        <div className="d-flex align-items-center gap-3 mb-4">
          <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
            <Cpu size={16} className="section-title-icon" style={{ color: 'var(--vx-accent)' }} />
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              AI-Powered Deep Checks
            </span>
          </h2>
          <span className="core-checks-label" style={{ background: 'rgba(34,211,238,.08)', borderColor: 'rgba(34,211,238,.2)', color: 'var(--vx-accent)' }}>
            <Cpu size={10} /> {AI_CHECKS.length} AI CHECKS
          </span>
        </div>
        <div className="row g-3">
          {AI_CHECKS.map((c, i) => <CheckCard key={i} c={c} />)}
        </div>
      </section>
    </div>
  );
}
