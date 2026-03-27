# 🚀 Checklist de Puesta en Producción — Wati

Antes de desplegar en un servidor real, completar cada ítem en orden.

---

## 1. Infraestructura y Red

- [ ] Registrar un dominio y apuntar el DNS al servidor (`A` record)
- [ ] Abrir puertos `80` y `443` en el firewall / security group
- [ ] **Cerrar** los puertos de desarrollo `5173`, `5001`, `5432`, `6379` al tráfico externo — solo acceso interno entre contenedores Docker

---

## 2. Certificados TLS

- [ ] Reemplazar los certificados auto-firmados de desarrollo por un certificado real:
  - **Opción gratuita:** [Let's Encrypt](https://letsencrypt.org/) con Certbot
  - **Opción empresarial:** DigiCert, Sectigo u otra CA
- [ ] Montar el certificado real en `nginx/certs/server.crt` y `nginx/certs/server.key`
- [ ] Activar OCSP Stapling en `nginx/nginx.conf` (descomentar las 3 líneas marcadas con `# ssl_stapling`)
- [ ] Actualizar `server_name localhost;` en `nginx/nginx.conf` con tu dominio real
- [ ] Verificar puntuación A+ en [SSL Labs](https://www.ssllabs.com/ssltest/)

---

## 3. Variables de Entorno

- [ ] Rotar `JWT_SECRET` — generar con `openssl rand -base64 64`
- [ ] Cambiar `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` a valores únicos (no usar defaults)
- [ ] Establecer `NODE_ENV=production` en los servicios `frontend` y `backend` del `docker-compose.yml`
- [ ] Establecer `VITE_API_MODE=LIVE`
- [ ] Actualizar `FRONTEND_URL` al dominio de producción (controla los orígenes permitidos por CORS en el backend)
- [ ] Actualizar `VITE_API_URL` al dominio de producción (URL que usa el frontend para llamar al backend)

---

## 4. Seguridad

- [ ] Verificar que `nginx/certs/` esté en `.gitignore` y que **nunca** se haya commiteado una clave privada
- [ ] Registrar el dominio en [HSTS Preload List](https://hstspreload.org) (el header `Strict-Transport-Security` ya está configurado)
- [ ] Revisar y ajustar los límites de rate limiting (`globalLimiter` / `recipeLimiter` en `backend/server.js`) según el tráfico esperado
- [ ] Configurar backups automáticos del volumen `postgres_data`
- [ ] Rotar la `SPOONACULAR_KEY` si estuvo expuesta en logs o variables de entorno no cifradas

---

## 5. Base de Datos

- [ ] Ejecutar migraciones en el contenedor de producción:
  ```bash
  docker compose exec backend npx sequelize-cli db:migrate
  ```
- [ ] Verificar que `sequelize.sync()` en `backend/server.js` esté deshabilitado o en modo `{ force: false, alter: false }` — en producción no debe auto-alterar el esquema
- [ ] Confirmar que `ON DELETE CASCADE` en `profiles` y `favorite_recipes` opera correctamente (cubre el derecho al olvido GDPR)

---

## 6. Monitoreo

- [ ] Configurar logs centralizados (ej. Datadog, Grafana Loki, AWS CloudWatch)
- [ ] Configurar alertas para errores HTTP 5xx y límites de cuota de Spoonacular (`402`)
- [ ] Verificar que el endpoint de healthcheck responde correctamente:
  ```bash
  curl https://tu-dominio.com/api/status
  # Esperado: {"status":"ok","message":"Backend is running!","version":"1.0.0"}
  ```
- [ ] Configurar un cron de renovación automática de certificados Let's Encrypt (si aplica)
