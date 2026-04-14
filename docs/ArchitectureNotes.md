# 📝 Notas de Arquitectura — Wati

## Búsqueda y Filtrado de Recetas

- **Filtro de recetas**: En modo LIVE, el frontend solicita **15 recetas** cuando el usuario está autenticado (10 para anónimos) y aplica filtros de seguridad local, garantizando exactamente 10 resultados visibles.
- **Filtro SIBO/FODMAP**: El análisis de riesgo SIBO se realiza automáticamente al procesar la receta con Llama 4 Maverick, identificando ingredientes high-FODMAP. Nunca se aplica por defecto sin análisis.
- **Stale Closure**: `useCallback` en `useWatiSearch` incluye `user` en sus dependencias para evitar que el perfil médico y el conteo de recetas queden desactualizados tras el login.

## Express 5 y Middleware

- **Compatibilidad Express 5**: El middleware de validación usa `req.validatedQuery` en lugar de mutar `req.query`, que es de solo lectura en Express 5.
- **Trust Proxy**: Express tiene `trust proxy = 1` activado para que el rate limiting opere correctamente detrás de Nginx (sin esto, el limiter vería siempre la IP interna del contenedor Nginx).

## Modos de Operación

- **MOCK vs LIVE**: Controlado exclusivamente por `VITE_API_MODE` en `.env`. Los cambios requieren recrear los contenedores Docker (`docker compose up -d`), no solo reiniciarlos.

---

## 🛡️ Resiliencia y Validación

- **Capa de Resiliencia**: Se utiliza un wrapper centralizado para peticiones `fetch` externas que implementa protección contra **SSRF** mediante una whitelist de dominios y reintentos con **Exponential Backoff** para mitigar fallos intermitentes de APIs de LLMs (NVIDIA NIM, Groq).
- **Validación Multicapa**: Tanto el Bot de Telegram como el Backend validan los datos de entrada con **Zod**. En el backend, las rutas utilizan `req.validatedBody` para garantizar que solo datos limpios y tipados lleguen a la lógica de negocio.
- **Comunicación entre Servicios**: El Bot se comunica con el Backend mediante una API Key compartida en los headers, asegurando que solo el bot autorizado pueda ingestar recetas automáticamente.

---

## 🔐 TLS Post-Cuántico (Nginx)

La aplicación incluye un reverse proxy Nginx construido sobre la imagen [Open Quantum Safe](https://openquantumsafe.org/), que soporta el intercambio de clave híbrido **X25519 + ML-KEM-768 (FIPS 203)** — protegiendo las comunicaciones contra ataques *harvest-now-decrypt-later*.

### Configuración activa

| Parámetro | Valor |
|---|---|
| Versiones TLS | TLSv1.2, TLSv1.3 |
| Cifradores TLS 1.2 | `ECDHE-ECDSA-AES256-GCM-SHA384`, `ECDHE-ECDSA-CHACHA20-POLY1305`, `ECDHE-ECDSA-AES128-GCM-SHA256` |
| Cifradores TLS 1.3 | `TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256` |
| Grupos de clave | `X25519MLKEM768` (PQC híbrido) → `X25519` → `P-384` |
| Excluidos | RSA key exchange, MD5, SHA1, CBC, RC4 |

**Por qué ML-KEM-768 (FIPS 203):** Los cifrados asimétricos clásicos (RSA, ECDH) son vulnerables a computadoras cuánticas con el algoritmo de Shor. ML-KEM es el estándar post-cuántico del NIST que resiste ese vector. El modo híbrido garantiza que incluso si ML-KEM tiene una vulnerabilidad desconocida, la seguridad clásica de X25519 sigue protegiendo la sesión.

### Levantar TLS en desarrollo

```bash
# 1. Generar certificados ECDSA auto-firmados (solo la primera vez)
bash nginx/generate-dev-certs.sh

# 2. Levantar todos los servicios incluyendo Nginx
docker compose up -d --build

# La app ahora es accesible en https://localhost
# El navegador mostrará advertencia TLS — aceptar una vez (cert auto-firmado)
```

### Arquitectura de red

```
Cliente (HTTPS :443)
        │ TLS 1.3 + X25519MLKEM768 (FIPS 203)
        ▼
  [ Nginx / OQS ]  ← único punto de entrada público
        │ HTTP interno (red Docker: app-network)
        ├──▶ [ Frontend :5173 ]
        └──▶ [ Backend  :5001 ]
                │
                ├──▶ [ PostgreSQL :5432 ]
                └──▶ [ Redis      :6379 ]
```

> En producción, los puertos `5001`, `5173`, `5432` y `6379` deben estar cerrados al tráfico externo — solo `80` y `443` públicos.
