#!/usr/bin/env bash
# ============================================================
# generate-dev-certs.sh
# Genera certificados ECDSA P-384 auto-firmados para desarrollo.
# ⚠️  NO usar en producción. Para producción, usar una CA real.
# ============================================================
set -e

CERTS_DIR="$(dirname "$0")/certs"
mkdir -p "$CERTS_DIR"

echo "🔐 Generando certificado ECDSA P-384 auto-firmado..."

openssl req -x509 \
  -newkey ec \
  -pkeyopt ec_paramgen_curve:P-384 \
  -keyout  "$CERTS_DIR/server.key" \
  -out     "$CERTS_DIR/server.crt" \
  -days    365 \
  -nodes \
  -subj    "/CN=localhost/O=Wati Dev/C=CL" \
  -addext  "subjectAltName=DNS:localhost,IP:127.0.0.1"

chmod 600 "$CERTS_DIR/server.key"
chmod 644 "$CERTS_DIR/server.crt"

echo ""
echo "✅ Certificados generados en: $CERTS_DIR"
echo "   server.crt — Certificado público  (ECDSA P-384, 365 días)"
echo "   server.key — Clave privada        (¡NO commitear, ya en .gitignore!)"
echo ""
echo "▶  Próximo paso: docker compose up -d --build"
echo "   Accedé a la app en: https://localhost"
echo "   (El navegador mostrará advertencia TLS — aceptar una vez para dev)"
