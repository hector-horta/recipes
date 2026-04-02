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

# Copiar configuración TLS post-cuántica
# OQS Nginx espera la configuración en /opt/nginx/nginx-conf/nginx.conf por defecto
COPY nginx.conf /opt/nginx/nginx-conf/nginx.conf

# Set correct permissions for directories nginx needs to write to
RUN mkdir -p /var/log/nginx /var/cache/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /opt/nginx/logs

# El directorio de certificados se monta como volumen en docker-compose.
# Exponer puertos HTTP (redirect) y HTTPS
EXPOSE 80 443

# Run as non-root user
USER nginx
