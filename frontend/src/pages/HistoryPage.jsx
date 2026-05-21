import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useToast } from "../App";

const API = import.meta.env.VITE_API_URL || "";

// ── ICONS ────────────────────────────────────────────────────────
function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
    </svg>
  );
}

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3"/>
      <path d="M12 2v8"/>
      <path d="m8 6 4-4 4 4"/>
    </svg>
  );
}

// ── CLASS COLORS ──────────────────────────────────────────────────
const PRESET = {
  "Brown Planthopper": "#8B4513",
  "Water weevil": "#3b82f6",
  "Army worm": "#ef4444",
  "Leaf hopper": "#22c55e",
};
function classColor(name, i = 0) {
  if (PRESET[name]) return PRESET[name];
  return `hsl(${(i * 47) % 360}, 70%, 55%)`;
}

// ── STATISTICS COMPONENT ──────────────────────────────────────────
function StatisticsFooter() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const addToast = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get("/api/stats");
      setStats(res.data);
    } catch (error) {
      addToast("Error al cargar estadísticas", "error");
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="stats-footer loading">
        <div className="spinner" style={{ width: 24, height: 24 }} />
        <span>Cargando estadísticas...</span>
      </div>
    );
  }

  if (!stats || stats.total_analyses === 0) {
    return (
      <div className="stats-footer empty">
        <IconChart />
        <span>Sin datos estadísticos disponibles</span>
      </div>
    );
  }

  const totalDetections = stats.class_distribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="stats-footer">
      <div className="stats-header">
        <IconChart />
        <h3>Estadísticas Globales</h3>
      </div>
      
      <div className="stats-summary">
        <div className="stat-item">
          <div className="stat-label">Total Análisis</div>
          <div className="stat-value">{stats.total_analyses}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Total Detecciones</div>
          <div className="stat-value">{totalDetections}</div>
        </div>
      </div>

      <div className="stats-distribution">
        <div className="stats-subtitle">Distribución por Plaga</div>
        <div className="distribution-bars">
          {stats.class_distribution.map((item, index) => (
            <div key={item.class} className="distribution-item">
              <div className="distribution-label">
                <span 
                  className="distribution-color" 
                  style={{ backgroundColor: classColor(item.class, index) }}
                />
                <span className="distribution-name">{item.class}</span>
                <span className="distribution-count">{item.count}</span>
              </div>
              <div className="distribution-bar-container">
                <div 
                  className="distribution-bar"
                  style={{
                    width: `${(item.count / totalDetections) * 100}%`,
                    backgroundColor: classColor(item.class, index)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── HISTORY CARD ──────────────────────────────────────────────────
function HistoryCard({ item, onView, onDelete }) {
  const counts   = item.counts || {};
  const classes  = Object.keys(counts);
  const dateStr  = new Date(item.created_at).toLocaleDateString("es-CO", {
    day: "2-digit", month: "short", year: "numeric"
  });

  return (
    <div className="history-card">
      <div style={{ position: "relative" }} onClick={() => onView(item._id)}>
        <img
          src={`${API}${item.result_url}`}
          alt={item.name}
          className="history-thumb"
          onError={(e) => { e.target.src = `${API}${item.upload_url}`; }}
        />
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          padding: "4px 10px", borderRadius: 99,
          fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#fff"
        }}>
          {item.total_objects} obj.
        </div>
      </div>

      <div className="history-info">
        <p className="history-name" title={item.name}>{item.name}</p>
        <p className="history-meta">{dateStr}</p>

        <div className="history-chips">
          {classes.map((cls, i) => (
            <span
              key={cls}
              className="chip"
              style={{ borderColor: classColor(cls, i), color: classColor(cls, i) }}
            >
              {cls}: {counts[cls]}
            </span>
          ))}
          {classes.length === 0 && (
            <span className="chip" style={{ color: "var(--text3)" }}>Sin detecciones</span>
          )}
        </div>
      </div>

      <div style={{
        display: "flex", gap: 8,
        padding: "0 16px 16px",
        borderTop: "1px solid var(--border)",
        paddingTop: 12
      }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1, padding: "8px" }}
          onClick={() => onView(item._id)}
        >
          <IconEye /> Ver
        </button>
        <button
          className="btn btn-danger"
          style={{ padding: "8px 12px" }}
          onClick={(e) => { e.stopPropagation(); onDelete(item._id, item.name); }}
        >
          <IconTrash />
        </button>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────
export default function HistoryPage() {
  const navigate = useNavigate();
  const addToast = useToast();

  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [total,   setTotal]   = useState(0);
  const PER_PAGE = 12;

  const fetchHistory = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/history?page=${p}&per_page=${PER_PAGE}`);
      setItems(res.data.results);
      setPages(res.data.pages);
      setTotal(res.data.total);
      setPage(p);
    } catch {
      addToast("Error al cargar el historial", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  const handleDeleteAll = async () => {
    if (!window.confirm("¿Seguro que quieres borrar TODO el historial?")) return;
    try {
      await axios.delete("/api/history");
      addToast("Historial eliminado", "success");
      await fetchHistory(1);
    } catch {
      addToast("Error al borrar historial", "error");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar "${name}"?`)) return;
    try {
      await axios.delete(`/api/history/${id}`);
      addToast("Análisis eliminado", "success");
      fetchHistory(page);
    } catch {
      addToast("Error al eliminar", "error");
    }
  };

  const handleView = (id) => navigate(`/result/${id}`);

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">Historial</h1>
            <p className="page-subtitle">
              {total} análisis guardado{total !== 1 ? "s" : ""}
            </p>
          </div>
          <button className="btn btn-danger" onClick={handleDeleteAll}>
            <IconTrash /> Borrar Historial
          </button>

          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Nuevo análisis <IconArrow />
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
            </svg>
            <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text2)" }}>Sin análisis todavía</p>
            <p>Realiza tu primer análisis para verlo aquí.</p>
            <button className="btn btn-primary" onClick={() => navigate("/")} style={{ marginTop: 8 }}>
              Analizar imagen
            </button>
          </div>
        ) : (
          <>
            <div className="history-grid">
              {items.map(item => (
                <HistoryCard
                  key={item._id}
                  item={item}
                  onView={handleView}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {pages > 1 && (
              <div className="pagination">
                <button onClick={() => fetchHistory(page - 1)} disabled={page === 1}>
                  ‹
                </button>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className={p === page ? "active" : ""}
                    onClick={() => fetchHistory(p)}
                  >
                    {p}
                  </button>
                ))}
                <button onClick={() => fetchHistory(page + 1)} disabled={page === pages}>
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer de Estadísticas */}
      <div className="page-footer">
        <StatisticsFooter />
      </div>
    </>
  );
}