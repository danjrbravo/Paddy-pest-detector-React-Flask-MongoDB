import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useToast } from "../App";

const API = import.meta.env.VITE_API_URL || "";

// ── ICONS ────────────────────────────────────────────────────────
function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
    </svg>
  );
}

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

function IconCompare() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="8" height="18" rx="1"/>
      <rect x="13" y="3" width="8" height="18" rx="1"/>
    </svg>
  );
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

// ── CONFIDENCE BAR ────────────────────────────────────────────────
function ConfBar({ value }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 80 ? "var(--accent)" : pct >= 50 ? "var(--warn)" : "var(--danger)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        flex: 1, height: 5, background: "var(--bg3)",
        borderRadius: 99, overflow: "hidden"
      }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--text2)", minWidth: 42 }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

const PRESET = {
  "Brown Planthopper": "#8B4513", // café
  "Water weevil": "#3b82f6",      // azul

  "Army worm": "#ef4444",         // rojo (ejemplo)
  "Leaf hopper": "#22c55e",       // verde (ejemplo)
};

function classColor(name, index) {
  if (PRESET[name]) return PRESET[name];
  const hue = (index * 47) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

// ── COMPONENT ────────────────────────────────────────────────────
export default function ResultPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const addToast     = useToast();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState("result"); // "result" | "original"
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    axios.get(`/api/history/${id}`)
      .then(r => setData(r.data))
      .catch(() => addToast("No se pudo cargar el análisis", "error"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar este análisis?")) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/history/${id}`);
      addToast("Análisis eliminado", "success");
      navigate("/history");
    } catch {
      addToast("Error al eliminar", "error");
      setDeleting(false);
    }
  };

  const downloadResult = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`${API}${data.result_url}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resultado_${id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast("Imagen descargada", "success");
    } catch {
      addToast("Error al descargar la imagen", "error");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-body" style={{ paddingTop: 40 }}>
        <p style={{ color: "var(--text3)" }}>Análisis no encontrado.</p>
        <button className="btn btn-ghost" onClick={() => navigate("/")} style={{ marginTop: 16 }}>
          <IconArrow /> Volver
        </button>
      </div>
    );
  }

  const detections   = data.detections || [];
  const counts       = data.counts || {};
  const classNames   = Object.keys(counts);
  const totalObjects = data.total_objects || 0;

  // sort detections by confidence desc
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);

  return (
    <>
      {/* HEADER */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <button
              className="btn btn-ghost"
              onClick={() => navigate(-1)}
              style={{ marginBottom: 12, padding: "7px 14px", fontSize: "0.82rem" }}
            >
              <IconArrow /> Atrás
            </button>
            <h1 className="page-title" style={{ fontSize: "1.6rem" }}>{data.name}</h1>
            <p className="page-subtitle" style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
              {new Date(data.created_at).toLocaleString("es-CO")} · {totalObjects} objeto{totalObjects !== 1 ? "s" : ""} detectado{totalObjects !== 1 ? "s" : ""}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" onClick={() => navigate("/")}>
              Analizar nueva imagen
            </button>
            <button className="btn btn-ghost" onClick={downloadResult} disabled={downloading}>
              <IconDownload /> {downloading ? "Descargando…" : "Descargar"}
            </button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              <IconTrash /> {deleting ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* STAT ROW */}
        <div className="stat-row" style={{ gridTemplateColumns: `repeat(${Math.min(classNames.length + 1, 4)}, 1fr)` }}>
          <div className="stat-card">
            <p className="stat-label">Total detectado</p>
            <p className="stat-value">{totalObjects}</p>
          </div>
          {classNames.map((cls, i) => (
            <div className="stat-card" key={cls} style={{ borderTop: `3px solid ${classColor(cls, i)}` }}>
              <p className="stat-label">{cls}</p>
              <p className="stat-value" style={{ color: classColor(cls, i) }}>{counts[cls]}</p>
            </div>
          ))}
        </div>

        {/* IMAGES + DETECTIONS */}
        <div className="result-split">
          {/* IMAGE */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Imagen</span>
              <div className="tab-group" style={{ maxWidth: 220 }}>
                <button className={`tab ${view === "result" ? "active" : ""}`} onClick={() => setView("result")}>
                  Resultado
                </button>
                <button className={`tab ${view === "original" ? "active" : ""}`} onClick={() => setView("original")}>
                  Original
                </button>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <img
                src={`${API}${view === "result" ? data.result_url : data.upload_url}`}
                alt={view}
                className="result-image"
                style={{ borderRadius: 0, border: "none", maxHeight: 520 }}
              />
            </div>
          </div>

          {/* DETECTIONS LIST */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Detecciones</span>
              <span className="badge" style={{ background: "var(--bg3)", color: "var(--text2)", border: "1px solid var(--border)" }}>
                {detections.length}
              </span>
            </div>
            <div className="card-body" style={{ maxHeight: 520, overflowY: "auto" }}>
              {sorted.length === 0 ? (
                <div className="empty-state" style={{ padding: "40px 16px" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <p>No se detectaron objetos</p>
                </div>
              ) : (
                <div className="detection-list">
                  {sorted.map((det, i) => {
                    const color = classColor(det.class, classNames.indexOf(det.class));
                    return (
                      <div key={i} className="detection-item" style={{ borderLeft: `3px solid ${color}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span className="detection-class">{det.class}</span>
                            <span style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.72rem",
                              color: "var(--text3)",
                              background: "var(--bg2)",
                              padding: "2px 7px",
                              borderRadius: 99,
                              border: "1px solid var(--border)"
                            }}>
                              #{i + 1}
                            </span>
                          </div>
                          <ConfBar value={det.confidence} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CLASS DISTRIBUTION */}
        {classNames.length > 0 && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header">
              <span className="card-title">Distribución por clase</span>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {classNames.map((cls, i) => {
                  const pct = totalObjects > 0 ? (counts[cls] / totalObjects) * 100 : 0;
                  const color = classColor(cls, i);
                  return (
                    <div key={cls}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
                          {cls}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text2)" }}>
                          {counts[cls]} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div style={{ height: 8, background: "var(--bg3)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}