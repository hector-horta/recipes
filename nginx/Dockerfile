# ============================================================
# Nginx con soporte Open Quantum Safe (OQS)
# Incluye liboqs + OpenSSL provider con ML-KEM (FIPS 203)
# Soporta X25519MLKEM768 como grupo de intercambio de clave.
# ============================================================
FROM openquantumsafe/nginx:latest

# Copiar configuración TLS post-cuántica
COPY nginx.conf /etc/nginx/nginx.conf

# El directorio de certificados se monta como volumen en docker-compose.
# Exponer puertos HTTP (redirect) y HTTPS
EXPOSE 80 443
