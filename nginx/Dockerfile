# ============================================================
# Nginx con soporte Open Quantum Safe (OQS)
# Incluye liboqs + OpenSSL provider con ML-KEM (FIPS 203)
# Soporta X25519MLKEM768 como grupo de intercambio de clave.
# ============================================================
FROM openquantumsafe/nginx:latest

# Create non-root user for security
# Running as non-root prevents privilege escalation attacks
RUN usermod -u 1001 nginx && \
    groupmod -g 1001 nginx

# Copiar configuración TLS post-cuántica
COPY nginx.conf /etc/nginx/nginx.conf

# Set correct permissions for directories nginx needs to write to
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx

# El directorio de certificados se monta como volumen en docker-compose.
# Exponer puertos HTTP (redirect) y HTTPS
EXPOSE 80 443

# Run as non-root user
USER nginx
