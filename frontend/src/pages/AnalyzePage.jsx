import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useToast } from "../App";

// ── ICONS ────────────────────────────────────────────────────────
function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
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

function IconCapture() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function IconScan() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
    </svg>
  );
}

// ── COMPONENT ────────────────────────────────────────────────────
export default function AnalyzePage() {
  const navigate = useNavigate();
  const addToast = useToast();

  // tabs: "upload" | "camera"
  const [tab, setTab]           = useState("upload");
  const [preview, setPreview]   = useState(null);
  const [file, setFile]         = useState(null);
  const [capturedB64, setCapturedB64] = useState(null);
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [dragging, setDragging] = useState(false);

  // camera
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);

  // ── VALIDATION ──
  const validateFile = (f) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(f.type)) {
      addToast("Formato no soportado. Usa JPG,JPEG PNG o WEBP.", "error");
      return false;
    }
    if (f.size > 20 * 1024 * 1024) {
      addToast("El archivo excede el tamaño máximo de 20 MB.", "error");
      return false;
    }
    return true;
  };

  // ── DROP ZONE ──
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) loadFile(f);
  }, []);

  const loadFile = (f) => {
    if (!validateFile(f)) return;
    setFile(f);
    setCapturedB64(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  // ── CAMERA ──
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      addToast("No se pudo acceder a la cámara", "error");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCameraOn(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const b64 = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedB64(b64);
    setFile(null);
    setPreview(b64);
    stopCamera();
  };

  const clearImage = () => {
    setPreview(null);
    setFile(null);
    setCapturedB64(null);
    stopCamera();
    setCameraOn(false);
  };

  // ── SUBMIT ──
  const handleSubmit = async () => {
    if (!file && !capturedB64) {
      addToast("Por favor selecciona o captura una imagen", "error");
      return;
    }
    setLoading(true);
    try {
      let res;
      if (file) {
        const form = new FormData();
        form.append("image", file);
        form.append("name", name);
        res = await axios.post("/api/analyze", form);
      } else {
        res = await axios.post("/api/analyze", {
          image_b64: capturedB64,
          name
        });
      }
      addToast("Análisis completado", "success");
      navigate(`/result/${res.data._id}`);
    } catch (err) {
      addToast(err.response?.data?.error || "Error al analizar la imagen", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── SWITCH TAB ──
  const switchTab = (t) => {
    clearImage();
    setTab(t);
    if (t === "camera") startCamera();
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Nuevo Análisis</h1>
        <p className="page-subtitle">Sube una imagen o usa la cámara para detectar plagas del arroz (Sogata verde del arroz,gorgojito de agua,chinche marrón y gusano cogollero) con YOLO</p>
      </div>

      <div className="page-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>

          {/* ── LEFT: input ── */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Fuente de imagen</span>
              <div className="tab-group" style={{ maxWidth: 240 }}>
                <button className={`tab ${tab === "upload" ? "active" : ""}`} onClick={() => switchTab("upload")}>
                  Archivo
                </button>
                <button className={`tab ${tab === "camera" ? "active" : ""}`} onClick={() => switchTab("camera")}>
                  Cámara
                </button>
              </div>
            </div>

            <div className="card-body">
              {/* PREVIEW */}
              {preview ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={preview}
                    alt="Vista previa"
                    style={{
                      width: "100%", borderRadius: 12,
                      border: "1px solid var(--border)",
                      maxHeight: 420, objectFit: "contain",
                      background: "#000", display: "block"
                    }}
                  />
                  <button
                    className="btn btn-ghost"
                    onClick={clearImage}
                    style={{
                      position: "absolute", top: 10, right: 10,
                      padding: "6px 6px", borderRadius: 8
                    }}
                  >
                    <IconX />
                  </button>
                </div>
              ) : tab === "upload" ? (
                /* DROP ZONE */
                <label
                  className={`drop-zone ${dragging ? "drag-over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  style={{ cursor: "pointer" }}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={(e) => e.target.files[0] && loadFile(e.target.files[0])}
                  />
                  <div className="drop-zone-icon"><IconUpload /></div>
                  <p className="drop-zone-title">Arrastra una imagen o haz clic</p>
                  <p className="drop-zone-sub">JPG,JPEG, PNG, WEBP — máx. 20 MB</p>
                </label>
              ) : (
                /* CAMERA */
                <div>
                  <div className="camera-wrapper">
                    <video ref={videoRef} autoPlay playsInline muted />
                    {!cameraOn && (
                      <div style={{
                        position: "absolute", inset: 0, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        flexDirection: "column", gap: 12, background: "var(--bg3)"
                      }}>
                        <IconCamera style={{ width: 40, height: 40, opacity: 0.3 }} />
                        <button className="btn btn-primary" onClick={startCamera}>
                          <IconCamera /> Activar cámara
                        </button>
                      </div>
                    )}
                  </div>
                  {cameraOn && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
                      <button className="btn btn-primary" onClick={capturePhoto} style={{ gap: 10 }}>
                        <IconCapture /> Capturar foto
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: options + submit ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Opciones</span>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text2)", marginBottom: 8 }}>
                    Nombre del análisis (opcional)
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Ej: Parcela Norte — Semana 12"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                </div>

                <div style={{
                  padding: "12px 14px",
                  background: "var(--bg3)",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  fontSize: "0.8rem",
                  color: "var(--text3)",
                  lineHeight: 1.6
                }}>
                  El modelo YOLO detectará y clasificará automáticamente las plagas
                  presentes en la imagen con bounding boxes.
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading || (!file && !capturedB64)}
              style={{ width: "100%", padding: "14px", fontSize: "0.95rem" }}
            >
              {loading
                ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Analizando…</>
                : <><IconScan /> Analizar imagen</>}
            </button>

            {preview && (
              <button className="btn btn-ghost" onClick={clearImage} style={{ width: "100%" }}>
                Limpiar imagen
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}