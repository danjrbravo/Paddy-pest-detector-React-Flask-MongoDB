# ── Backend — Flask + Gunicorn + OpenCV ──────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema para OpenCV y libGL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*
# Instalar dependencias Python (cacheadas si requirements.txt no cambia)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

# Copiar código fuente
COPY . .

# Crear carpetas estáticas (por si no existen en la imagen)
RUN mkdir -p static/uploads static/results

# Usuario no-root por seguridad
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/api/stats || exit 1

# Gunicorn en producción: 2 workers síncronos (YOLO usa GPU/CPU intensivo)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "app:app"]

