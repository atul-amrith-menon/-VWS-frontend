import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Shield, XCircle, CheckCircle2, Loader2, Zap, AlertTriangle, Lock, Globe, Search, FileWarning, Share2, Key, Cpu, Database, Code2, GitBranch, Server, Radio } from 'lucide-react';

/* ── Map phase/message keywords → icon + colour for the active attack banner ── */
const ATTACK_META = [
  { keys: ['crawl'],                              icon: '🕷️',  label: 'Web Crawler',                      color: '#818cf8' },
  { keys: ['sql'],                                icon: '💉',  label: 'SQL Injection',                    color: '#f87171' },
  { keys: ['xss', 'cross-site scripting'],        icon: '⚡',  label: 'Cross-Site Scripting (XSS)',       color: '#f87171' },
  { keys: ['csrf'],                               icon: '🔒',  label: 'CSRF Token Testing',               color: '#fbbf24' },
  { keys: ['misconfigur', 'header', 'misconfig'], icon: '🛡️',  label: 'Security Misconfiguration',        color: '#fbbf24' },
  { keys: ['traversal', 'directory'],             icon: '📂',  label: 'Directory Traversal',              color: '#f87171' },
  { keys: ['redirect'],                           icon: '↪️',  label: 'Open Redirect',                    color: '#fbbf24' },
  { keys: ['clickjack'],                          icon: '🖱️',  label: 'Clickjacking',                     color: '#fbbf24' },
  { keys: ['auth', 'authentication'],             icon: '🔑',  label: 'Weak Authentication',              color: '#f87171' },
  { keys: ['nmap', 'infrastructure', 'port'],     icon: '🗺️',  label: 'Nmap Infrastructure Scan',         color: '#f87171' },
  { keys: ['sensitive data'],                     icon: '🔍',  label: 'Sensitive Data Exposure',          color: '#fbbf24' },
  { keys: ['ssrf', 'server-side request'],        icon: '📡',  label: 'SSRF Probing',                     color: '#f87171' },
  { keys: ['cors', 'cross-origin'],               icon: '🌐',  label: 'CORS Misconfiguration',            color: '#fbbf24' },
  { keys: ['idor', 'direct object'],              icon: '🔓',  label: 'IDOR Enumeration',                 color: '#f87171' },
  { keys: ['business logic', 'api endpoint'],     icon: '🧩',  label: 'Business Logic / API Discovery',   color: '#fbbf24' },
  { keys: ['parameter pollution', 'hpp'],         icon: '⚙️',  label: 'HTTP Parameter Pollution',         color: '#fbbf24' },
  { keys: ['xxe', 'xml external'],               icon: '📄',  label: 'XXE Injection',                    color: '#f87171' },
  { keys: ['saving', 'dedup'],                    icon: '💾',  label: 'Saving Results',                   color: '#34d399' },
  { keys: ['complet'],                            icon: '✅',  label: 'Scan Complete',                    color: '#34d399' },
  { keys: ['initializ', 'connecting'],            icon: '🔌',  label: 'Initialising Agents',              color: '#818cf8' },
];

function getAttackMeta(phase = '', message = '') {
  const haystack = `${phase} ${message}`.toLowerCase();
  for (const entry of ATTACK_META) {
    if (entry.keys.some(k => haystack.includes(k))) return entry;
  }
  return { icon: '🔍', label: phase || 'Scanning…', color: '#818cf8' };
}

// Maximum reconnect attempts before giving up
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

export default function ScanProgressPage() {
  const { scanId } = useParams();
  const navigate   = useNavigate();
  const [progress, setProgress]   = useState({ phase: 'Initializing', progress: 0, message: 'Starting scan…', status: 'running' });
  const [cancelled, setCancelled] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const retryCountRef = useRef(0);
  const esRef = useRef(null);

  useEffect(() => {
    let retryTimer = null;

    function openStream() {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const url = `/api/scan/stream/${scanId}?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (e) => {
        let data;
        try { data = JSON.parse(e.data); } catch { return; }

        if (data.heartbeat && !data.done) return;

        setProgress(prev => ({ ...prev, ...data }));
        retryCountRef.current = 0;

        const terminal = ['completed', 'error', 'cancelled'].includes(data.status) || data.done || data.progress >= 100;
        if (terminal) {
          es.close();
          if (data.status === 'completed' || data.done) {
            setTimeout(() => navigate(`/scan/${scanId}/results`), 800);
          }
        }
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

    return () => {
      if (esRef.current) esRef.current.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [scanId, navigate]);

  const handleCancel = async () => {
    setCancelled(true);
    if (esRef.current) esRef.current.close();
    await api.post(`/api/scan/${scanId}/cancel`).catch(() => {});
    navigate(`/scan/${scanId}/results`);
  };

  const pct        = Math.min(100, Math.round(progress.progress || 0));
  const attackMeta = getAttackMeta(progress.phase, progress.message);

  // Phase steps shown in the dot tracker
  const PHASE_STEPS = ['Crawling', 'SQLi / XSS', 'Misconfig', 'Advanced', 'Completed'];

  return (
    <div className="container py-5">
      <div className="mx-auto glass-card p-5" style={{ maxWidth: 640 }}>
        {/* ── Header icon ── */}
        <div className="text-center mb-4">
          {progress.status === 'completed'
            ? <CheckCircle2 size={52} className="text-success mb-2" />
            : progress.status === 'error'
            ? <XCircle size={52} className="text-danger mb-2" />
            : <div className="vx-scan-pulse mb-2"><Shield size={52} /></div>
          }
          <h1 className="h5 fw-bold gradient-text mb-1">Scanning in Progress</h1>
          {streamError && (
            <p className="text-danger small mt-2">{streamError}</p>
          )}
        </div>

        {/* ── Active Attack Banner ── */}
        {progress.status !== 'completed' && progress.status !== 'error' && (
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
            const done = pct >= (i + 1) * (100 / PHASE_STEPS.length);
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
    </div>
  );
}
