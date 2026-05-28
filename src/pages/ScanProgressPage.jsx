import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  Shield, XCircle, CheckCircle2, Loader2, AlertTriangle,
  Info, ChevronDown, ChevronUp, Layers, ExternalLink, Radio
} from 'lucide-react';

/* ── Map phase/message keywords → icon + colour for the active attack banner ── */
const ATTACK_META = [
  { keys: ['waf', 'firewall'],                         icon: '🛡️',  label: 'WAF Pre-detection & Evasion',       color: '#f97316' },
  { keys: ['crawl'],                                   icon: '🕷️',  label: 'Web Crawler',                       color: '#818cf8' },
  { keys: ['sql'],                                     icon: '💉',  label: 'SQL Injection',                     color: '#f87171' },
  { keys: ['xss', 'cross-site scripting'],             icon: '⚡',  label: 'Cross-Site Scripting (XSS)',        color: '#f87171' },
  { keys: ['csrf'],                                    icon: '🔒',  label: 'CSRF Token Testing',                color: '#fbbf24' },
  { keys: ['misconfigur', 'header', 'misconfig'],      icon: '🛡️',  label: 'Security Misconfiguration',         color: '#fbbf24' },
  { keys: ['traversal', 'directory'],                  icon: '📂',  label: 'Directory Traversal',               color: '#f87171' },
  { keys: ['redirect'],                                icon: '↪️',  label: 'Open Redirect',                     color: '#fbbf24' },
  { keys: ['clickjack'],                               icon: '🖱️',  label: 'Clickjacking',                      color: '#fbbf24' },
  { keys: ['auth', 'authentication'],                  icon: '🔑',  label: 'Weak Authentication',               color: '#f87171' },
  { keys: ['nmap', 'infrastructure', 'port'],          icon: '🗺️',  label: 'Nmap Infrastructure Scan',          color: '#f87171' },
  { keys: ['sensitive data'],                          icon: '🔍',  label: 'Sensitive Data Exposure',           color: '#fbbf24' },
  { keys: ['ssrf', 'server-side request'],             icon: '📡',  label: 'SSRF Probing',                      color: '#f87171' },
  { keys: ['ssti', 'template injection'],              icon: '💻',  label: 'SSTI Injection Testing',            color: '#f87171' },
  { keys: ['cors', 'cross-origin'],                    icon: '🌐',  label: 'CORS Misconfiguration',             color: '#fbbf24' },
  { keys: ['idor', 'direct object'],                   icon: '🔓',  label: 'IDOR Enumeration',                  color: '#f87171' },
  { keys: ['business logic', 'api endpoint'],          icon: '🧩',  label: 'Business Logic / API Discovery',    color: '#fbbf24' },
  { keys: ['parameter pollution', 'hpp'],              icon: '⚙️',  label: 'HTTP Parameter Pollution',          color: '#fbbf24' },
  { keys: ['xxe', 'xml external'],                     icon: '📄',  label: 'XXE Injection',                     color: '#f87171' },
  { keys: ['saving', 'dedup'],                         icon: '💾',  label: 'Saving Results',                    color: '#34d399' },
  { keys: ['complet'],                                 icon: '✅',  label: 'Scan Complete',                     color: '#34d399' },
  { keys: ['initializ', 'connecting'],                 icon: '🔌',  label: 'Initialising Agents',               color: '#818cf8' },
  { keys: ['baseline'],                                icon: '📊',  label: 'Baseline Scan',                     color: '#818cf8' },
  { keys: ['ai scan', 'ai agent'],                     icon: '🤖',  label: 'AI Deep Scan',                      color: '#22d3ee' },
];

function getAttackMeta(phase = '', message = '') {
  const haystack = `${phase} ${message}`.toLowerCase();
  for (const entry of ATTACK_META) {
    if (entry.keys.some(k => haystack.includes(k))) return entry;
  }
  return { icon: '🔍', label: phase || 'Scanning…', color: '#818cf8' };
}

const SEVERITY_MAP = {
  high:   { label: 'HIGH',   cls: 'risk-high' },
  medium: { label: 'MEDIUM', cls: 'risk-medium' },
  low:    { label: 'LOW',    cls: 'risk-low' },
  info:   { label: 'INFO',   cls: 'risk-info' },
};
function getSeverityKey(v) {
  const k = (v.risk_level || v.severity || 'info').toLowerCase();
  return SEVERITY_MAP[k] ? k : 'info';
}

// Maximum reconnect attempts before giving up
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;
// How often to poll for live findings (ms)
const POLL_INTERVAL_MS = 5000;

export default function ScanProgressPage() {
  const { scanId }  = useParams();
  const navigate    = useNavigate();

  const [progress, setProgress]     = useState({ phase: 'Initializing', progress: 0, message: 'Starting scan…', status: 'running', vulns_found: 0 });
  const [cancelled, setCancelled]   = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [liveVulns, setLiveVulns]   = useState([]);
  const [trayOpen, setTrayOpen]     = useState(true);
  const [wafDetected, setWafDetected] = useState(false);

  const retryCountRef = useRef(0);
  const esRef         = useRef(null);
  const pollTimerRef  = useRef(null);
  const isRunningRef  = useRef(true);
  // SSE debounce: batch rapid-fire progress events into a single React render
  const sseDebounceRef  = useRef(null);
  const ssePendingRef   = useRef(null);

  /* ─── Live findings polling ─────────────────────────────────────── */
  const fetchLiveVulns = async () => {
    try {
      const res = await api.get(`/api/scan/${scanId}`);
      const found = res.data.vulnerabilities || [];
      setLiveVulns(found);
    } catch {
      // ignore — scan may not have started yet
    }
  };

  const startPolling = () => {
    // Fetch immediately on start to load any existing findings
    fetchLiveVulns();
  };

  const stopPolling = () => {
    isRunningRef.current = false;
    // Final fetch to get all findings after completion
    fetchLiveVulns();
  };

  /* ─── SSE Stream ────────────────────────────────────────────────── */
  useEffect(() => {
    let retryTimer = null;
    isRunningRef.current = true;

    function openStream() {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }

      const url = `/api/scan/stream/${scanId}?token=${encodeURIComponent(token)}`;
      const es   = new EventSource(url);
      esRef.current = es;

      es.onmessage = (e) => {
        let data;
        try { data = JSON.parse(e.data); } catch { return; }

        if (data.heartbeat && !data.done) return;

        // Terminal events (completed / error / cancelled / done=true) must be
        // applied immediately — they trigger navigation and stream teardown.
        const terminal = ['completed', 'error', 'cancelled'].includes(data.status) || data.done || data.progress >= 100;

        if (terminal) {
          // Cancel any pending debounce and flush this event immediately.
          if (sseDebounceRef.current) {
            clearTimeout(sseDebounceRef.current);
            sseDebounceRef.current = null;
          }
          const hay = `${data.phase || ''} ${data.message || ''}`.toLowerCase();
          if (hay.includes('waf') || hay.includes('firewall')) setWafDetected(true);
          setProgress(prev => ({ ...prev, ...data }));
          if (data.vulnerabilities) setLiveVulns(data.vulnerabilities);
          retryCountRef.current = 0;
          es.close();
          stopPolling();
          if (data.status === 'completed' || data.done) {
            setTimeout(() => navigate(`/scan/${scanId}/results`), 800);
          }
          return;
        }

        // Non-terminal event: buffer and apply after 150 ms of silence.
        // This collapses bursts of 5-10 events/s down to ~6 renders/s,
        // keeping the progress bar smooth without any visible lag.
        ssePendingRef.current = data;
        if (sseDebounceRef.current) clearTimeout(sseDebounceRef.current);
        sseDebounceRef.current = setTimeout(() => {
          const d = ssePendingRef.current;
          if (!d) return;
          const hay = `${d.phase || ''} ${d.message || ''}`.toLowerCase();
          if (hay.includes('waf') || hay.includes('firewall')) setWafDetected(true);
          setProgress(prev => ({ ...prev, ...d }));
          if (d.vulnerabilities) setLiveVulns(d.vulnerabilities);
          retryCountRef.current = 0;
          sseDebounceRef.current = null;
        }, 150);
      };

      es.onerror = async () => {
        es.close();

        if (retryCountRef.current === 0) {
          try {
            const res = await api.post('/api/auth/refresh');
            localStorage.setItem('token', res.data.access_token);
          } catch {
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
        }

        retryCountRef.current += 1;
        if (retryCountRef.current > MAX_RETRIES) {
          setStreamError(`Stream disconnected after ${MAX_RETRIES} retries. Please refresh.`);
          return;
        }

        const delay = Math.min(RETRY_DELAY_MS * retryCountRef.current, 15000);
        retryTimer = setTimeout(openStream, delay);
      };
    }

    openStream();
    startPolling();

    return () => {
      if (esRef.current) esRef.current.close();
      if (retryTimer) clearTimeout(retryTimer);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (sseDebounceRef.current) clearTimeout(sseDebounceRef.current);
      isRunningRef.current = false;
    };
  }, [scanId, navigate]);

  const handleCancel = async () => {
    setCancelled(true);
    if (esRef.current) esRef.current.close();
    stopPolling();
    await api.post(`/api/scan/${scanId}/cancel`).catch(() => {});
    navigate(`/scan/${scanId}/results`);
  };

  const pct        = Math.min(100, Math.round(progress.progress || 0));
  const attackMeta = getAttackMeta(progress.phase, progress.message);

  // Use the SSE vulns_found if available, otherwise fall back to polled list length
  const vulnsFound = (progress.vulns_found != null && progress.vulns_found > 0)
    ? progress.vulns_found
    : liveVulns.length;

  // Phase steps shown in the dot tracker
  const PHASE_STEPS = ['Crawling', 'SQLi / XSS', 'Misconfig', 'Advanced', 'SSTI', 'Completed'];

  // Group live vulns by severity for the mini tray
  const sevGroups = { high: [], medium: [], low: [], info: [] };
  liveVulns.forEach(v => { const k = getSeverityKey(v); sevGroups[k].push(v); });

  const isComplete = ['completed', 'error', 'cancelled'].includes(progress.status);

  return (
    <div className="container py-5">
      <div className="mx-auto" style={{ maxWidth: 680 }}>

        {/* ── WAF Banner ── */}
        {wafDetected && (
          <div
            className="glass-card mb-4 p-3 d-flex align-items-center gap-3"
            style={{ border: '1px solid rgba(249,115,22,0.35)', background: 'rgba(249,115,22,0.07)', borderRadius: 'var(--vx-radius-sm)' }}
          >
            <span style={{ fontSize: '1.4rem' }}>🛡️</span>
            <div>
              <div className="fw-bold small" style={{ color: '#f97316' }}>WAF Detected</div>
              <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                A Web Application Firewall was detected. AI agents are using evasion techniques to bypass it.
              </div>
            </div>
          </div>
        )}

        {/* ── Main Card ── */}
        <div className="glass-card p-5">
          {/* Header icon */}
          <div className="text-center mb-4">
            {progress.status === 'completed'
              ? <CheckCircle2 size={52} className="text-success mb-2" />
              : progress.status === 'error'
              ? <XCircle size={52} className="text-danger mb-2" />
              : <div className="vx-scan-pulse mb-2"><Shield size={52} /></div>
            }
            <h1 className="h5 fw-bold gradient-text mb-1">
              {isComplete ? 'Scan Complete' : 'Scanning in Progress'}
            </h1>
            {streamError && (
              <p className="text-danger small mt-2">{streamError}</p>
            )}
          </div>

          {/* ── Live Vuln Counter ── */}
          {vulnsFound > 0 && !isComplete && (
            <div
              className="mb-4 text-center"
              style={{
                background: vulnsFound > 0 ? 'rgba(248,113,113,0.07)' : 'var(--vx-primary-bg)',
                border: `1px solid ${vulnsFound > 0 ? 'rgba(248,113,113,0.2)' : 'rgba(129,140,248,0.2)'}`,
                borderRadius: 'var(--vx-radius-sm)',
                padding: '10px 16px',
              }}
            >
              <span style={{ fontSize: '2rem', fontWeight: 800, color: vulnsFound > 0 ? 'var(--vx-danger)' : 'var(--vx-primary)', lineHeight: 1 }}>
                {vulnsFound}
              </span>
              <div className="small text-muted mt-1">
                {vulnsFound === 1 ? 'vulnerability found so far' : 'vulnerabilities found so far'}
              </div>
            </div>
          )}

          {/* ── Active Attack Banner ── */}
          {!isComplete && (
            <div
              className="glass-card mb-4 p-3"
              style={{
                border: `1px solid ${attackMeta.color}33`,
                background: `${attackMeta.color}0d`,
                borderRadius: 'var(--vx-radius-sm)',
                transition: 'all 0.4s ease',
              }}
            >
              <div className="d-flex align-items-center gap-3">
                <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{attackMeta.icon}</span>
                <div className="flex-1 min-width-0">
                  <div
                    className="fw-semibold small mb-1"
                    style={{ color: attackMeta.color, letterSpacing: '0.3px' }}
                  >
                    CURRENTLY RUNNING
                  </div>
                  <div
                    className="fw-bold"
                    style={{ color: 'var(--vx-text)', fontSize: '1rem' }}
                  >
                    {attackMeta.label}
                  </div>
                  <div
                    className="text-muted mt-1"
                    style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {progress.message}
                  </div>
                </div>
                <div
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: attackMeta.color,
                    boxShadow: `0 0 8px ${attackMeta.color}`,
                    animation: 'pulse 1.5s infinite',
                    flexShrink: 0,
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Progress Bar ── */}
          <div className="mb-4">
            <div className="d-flex justify-content-between small text-muted mb-2">
              <span style={{ color: 'var(--vx-text-muted)' }}>{progress.phase}</span>
              <span className="fw-bold gradient-text">{pct}%</span>
            </div>
            <div className="vx-progress-track">
              <div className="vx-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* ── Phase dot tracker ── */}
          <div className="d-flex justify-content-between mb-4">
            {PHASE_STEPS.map((phase, i) => {
              const done   = pct >= (i + 1) * (100 / PHASE_STEPS.length);
              const active = !done && pct >= i * (100 / PHASE_STEPS.length);
              return (
                <div key={phase} className="text-center" style={{ flex: 1 }}>
                  <div className={`vx-phase-dot ${done ? 'vx-phase-done' : ''} ${active ? 'vx-phase-active' : ''}`}>
                    {done ? <CheckCircle2 size={12} /> : i + 1}
                  </div>
                  <div className="mt-1" style={{ fontSize: '0.6rem', color: 'var(--vx-text-muted)' }}>{phase}</div>
                </div>
              );
            })}
          </div>

          {/* ── Cancel / Redirect ── */}
          {progress.status === 'running' && !cancelled && (
            <div className="text-center">
              <button onClick={handleCancel} className="vx-btn-ghost d-inline-flex align-items-center gap-2">
                <XCircle size={16} /> Cancel Scan
              </button>
            </div>
          )}

          {progress.status === 'completed' && (
            <div className="text-center">
              <div className="d-flex align-items-center justify-content-center gap-2 text-muted small">
                <Loader2 size={14} className="spin" /> Redirecting to results…
              </div>
            </div>
          )}
        </div>

        {/* ── Live Findings Tray ── */}
        {liveVulns.length > 0 && (
          <div className="glass-card mt-4" style={{ overflow: 'hidden' }}>
            {/* Tray Header */}
            <button
              className="w-100 border-0 d-flex align-items-center justify-content-between p-3"
              style={{ background: 'transparent', cursor: 'pointer', color: 'inherit' }}
              onClick={() => setTrayOpen(o => !o)}
            >
              <div className="d-flex align-items-center gap-2">
                <AlertTriangle size={15} style={{ color: 'var(--vx-danger)' }} />
                <span className="fw-semibold small" style={{ color: 'var(--vx-text)' }}>
                  Live Findings
                </span>
                {/* Severity pills */}
                <div className="d-flex gap-1">
                  {sevGroups.high.length   > 0 && <span className="risk-badge risk-high"   style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{sevGroups.high.length}H</span>}
                  {sevGroups.medium.length > 0 && <span className="risk-badge risk-medium" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{sevGroups.medium.length}M</span>}
                  {sevGroups.low.length    > 0 && <span className="risk-badge risk-low"    style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{sevGroups.low.length}L</span>}
                  {sevGroups.info.length   > 0 && <span className="risk-badge risk-info"   style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{sevGroups.info.length}I</span>}
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {isComplete ? 'Final' : 'Real-time SSE'}
                </span>
                {trayOpen ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
              </div>
            </button>

            {/* Tray Body */}
            {trayOpen && (
              <div style={{ maxHeight: 320, overflowY: 'auto', borderTop: '1px solid var(--vx-border)' }}>
                {liveVulns.map((v, i) => {
                  const sk = getSeverityKey(v);
                  const s  = SEVERITY_MAP[sk];
                  const type = v.vuln_type || v.vulnerability_type || 'Unknown';
                  const url  = v.url || '—';
                  return (
                    <div
                      key={i}
                      className="d-flex align-items-center gap-3 px-3 py-2"
                      style={{
                        borderBottom: i < liveVulns.length - 1 ? '1px solid var(--vx-border)' : 'none',
                        animation: 'fadeInUp 0.3s ease both',
                        animationDelay: `${Math.min(i * 0.03, 0.3)}s`,
                      }}
                    >
                      <span className={`risk-badge ${s.cls} flex-shrink-0`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                        {s.label}
                      </span>
                      <div className="flex-1 min-width-0">
                        <div className="small fw-semibold text-truncate" style={{ color: 'var(--vx-text)' }}>{type}</div>
                        <div className="d-flex align-items-center gap-1" style={{ color: 'var(--vx-text-muted)', fontSize: '0.72rem' }}>
                          <ExternalLink size={10} />
                          <span className="text-truncate">{url}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tray Footer */}
            {trayOpen && !isComplete && (
              <div
                className="d-flex align-items-center justify-content-center gap-1 py-2"
                style={{ borderTop: '1px solid var(--vx-border)', fontSize: '0.72rem', color: 'var(--vx-text-muted)' }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', animation: 'pulse 1.5s infinite' }} />
                Streaming live via SSE — full details available after scan completes
              </div>
            )}
          </div>
        )}

        {/* Placeholder tray when scan started but no findings yet */}
        {liveVulns.length === 0 && !isComplete && (
          <div
            className="glass-card mt-4 p-3 text-center"
            style={{ border: '1px dashed var(--vx-border)' }}
          >
            <div className="d-flex align-items-center justify-content-center gap-2 text-muted small">
              <Radio size={13} style={{ animation: 'pulse 1.5s infinite' }} />
              Scanning… findings will appear here in real-time
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
