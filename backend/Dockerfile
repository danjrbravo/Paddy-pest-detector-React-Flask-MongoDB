# ── Backend — Flask + Gunicorn + YOLO (CPU optimizado) ──────────
FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema (mínimas para OpenCV)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primero (mejor caché)
COPY requirements.txt .

# Instalar dependencias Python (CPU-only PyTorch)
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    # Limpiar cachés para reducir tamaño
    && rm -rf /root/.cache/ultralytics \
    && rm -rf /root/.cache/pip

# Copiar solo el código (NO best.pt - se monta como volumen)
COPY app.py .
# Si hay otros archivos Python necesarios:
# COPY utils.py .
# COPY config.py .

# Crear directorios necesarios
RUN mkdir -p static/uploads static/results

# Usuario no-root (seguridad)
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

# Healthcheck para la nube
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/api/stats || exit 1

# Gunicorn: 2 workers CPU intensivo
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "app:app"]