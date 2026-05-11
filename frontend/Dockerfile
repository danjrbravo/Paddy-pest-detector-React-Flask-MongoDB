# ── Stage 1: Build ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Nginx ─────────────────────────────────────────────
FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración nginx CON PROXY para API (CORREGIDA)
RUN printf 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # Proxy para API - Manejar TODOS los métodos HTTP\n\
    location /api/ {\n\
        proxy_pass http://backend:5000/api/;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
        proxy_read_timeout 300s;\n\
        proxy_connect_timeout 75s;\n\
        \n\
        # IMPORTANTE: No limitar los métodos HTTP\n\
        # proxy_method POST;  ← ELIMINA esta línea si está\n\
    }\n\
\n\
    # React Router / SPA - Manejar rutas de React\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    # Cache assets\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
\n\
    # Gzip\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost || exit 1

CMD ["nginx", "-g", "daemon off;"]