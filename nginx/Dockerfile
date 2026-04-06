# ============================================================
# Nginx con soporte Open Quantum Safe (OQS)
# Incluye liboqs + OpenSSL provider con ML-KEM (FIPS 203)
# Soporta X25519MLKEM768 como grupo de intercambio de clave.
# ============================================================
FROM openquantumsafe/nginx:latest
USER root

# Create non-root user for security
# Running as non-root prevents privilege escalation attacks
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -G nginx -u 1001

# Copiar configuración TLS post-cuántica y tipos MIME
# OQS Nginx espera la configuración en /opt/nginx/nginx-conf/ por defecto
COPY nginx.conf /opt/nginx/nginx-conf/nginx.conf
COPY mime.types /opt/nginx/nginx-conf/mime.types

# Set correct permissions for directories nginx needs to write to
RUN mkdir -p /var/log/nginx /var/cache/nginx \
        /opt/nginx/client_body_temp \
        /opt/nginx/proxy_temp \
        /opt/nginx/fastcgi_temp \
        /opt/nginx/uwsgi_temp \
        /opt/nginx/scgi_temp && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /opt/nginx

# El directorio de certificados se monta como volumen en docker-compose.
# Exponer puertos HTTP (redirect) y HTTPS
EXPOSE 80 443

# USER nginx
