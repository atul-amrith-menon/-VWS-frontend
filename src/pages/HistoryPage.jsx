import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Shield, Clock, Trash2, ChevronRight, RotateCcw, ArrowLeft } from 'lucide-react';

const STATUS_COLOR = { completed: 'risk-success', running: 'risk-info', error: 'risk-danger', cancelled: 'risk-warning' };

export default function HistoryPage() {
  const [scans, setScans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchScans = () => {
    api.get('/api/scans')
      .then(r => setScans(r.data.scans || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchScans(); }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this scan?')) return;
    await api.delete(`/api/scan/${id}`);
    setScans(s => s.filter(x => x.id !== id));
  };

  if (loading) return <div className="vx-fullscreen-loader"><div className="vx-spinner" /></div>;

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center gap-3">
          <button onClick={() => navigate('/')} className="vx-btn-ghost d-flex align-items-center gap-1">
            <ArrowLeft size={14} /> Home
          </button>
          <h1 className="h5 fw-bold gradient-text d-flex align-items-center gap-2 mb-0">
            <Clock size={20} /> Scan History
          </h1>
        </div>
        <button onClick={fetchScans} className="vx-btn-ghost d-flex align-items-center gap-1">
          <RotateCcw size={14} /> Refresh
        </button>
      </div>

      {scans.length === 0 ? (
        <div className="glass-card p-5 text-center">
          <Shield size={48} className="text-muted mb-3" />
          <h2 className="h6 fw-bold">No scans yet</h2>
          <p className="text-muted small mb-3">Run your first scan to see results here.</p>
          <Link to="/" className="btn-scan px-4 py-2">Start Scanning</Link>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="vx-table w-100">
            <thead>
              <tr>
                <th>#</th>
                <th>Target URL</th>
                <th>Status</th>
                <th>Started</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scans.map(scan => (
                <tr key={scan.id} onClick={() => navigate(`/scan/${scan.id}/results`)} className="vx-table-row">
                  <td className="text-muted small">{scan.id}</td>
                  <td>
                    <span className="fw-medium small text-truncate d-block" style={{ maxWidth: 280 }}>
                      {scan.target_url}
                    </span>
                  </td>
                  <td>
                    <span className={`risk-badge ${STATUS_COLOR[scan.status] || 'risk-info'}`}>
                      {scan.status}
                    </span>
                  </td>
                  <td className="text-muted small">
                    {scan.created_at ? new Date(scan.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        className="vx-btn-icon text-danger"
                        onClick={e => handleDelete(e, scan.id)}
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                      <ChevronRight size={15} className="text-muted" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
