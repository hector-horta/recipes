# 🛠️ Wati: Guía de Desarrollo de Features

Esta guía define el flujo de trabajo estándar para implementar nuevas funcionalidades en el ecosistema Wati. Está diseñada para ser consumida tanto por humanos como por agentes de IA.

---

## 🤖 Contexto para Agentes (System Prompt Snippet)
Al desarrollar en este repositorio, sigue siempre este flujo: `Database -> Backend (Model/Route) -> Frontend (API/Hook/UI) -> Analytics -> Verification`.

---

## 1. Persistencia (Base de Datos)
Wati utiliza **PostgreSQL** con **Sequelize**. Los cambios deben ser rastreables mediante migraciones.

- **Directorio:** `backend/migrations` y `backend/models`
- **Buenas Prácticas:**
    - Usa **UUID v4** como llave primaria para todas las tablas nuevas.
    - Usa **JSONB** para campos de datos flexibles (ej: ingredientes, metadatos).
    - Siempre define `underscored: true` en los modelos.
    - **Seguridad:** Nunca guardes datos médicos en texto plano. Usa `SecureVault` en el frontend antes de enviar si es necesario, o lógica de encriptación en el backend.

```bash
# Crear migración
docker compose exec backend npx sequelize-cli migration:generate --name nombre-del-cambio
```

---

## 2. Lógica de Negocio (Backend)
El backend usa **Express 5** (soporta promesas nativas en rutas).

- **Validación:** Usa **Zod** para validar `req.body` y `req.query`.
- **Rutas:** Agrégalas en `backend/routes/` y regístralas en `backend/server.js`.
- **Caché:** Si el feature consume una API externa, implementa caché en **Redis** (`backend/config/redis.js`).
- **Seguridad:** 
    - Usa `authenticateToken` para rutas privadas.
    - Usa `InputSanitizer` para limpiar strings de entrada.

---

## 3. Interfaz de Usuario (Frontend)
Construido con **React 18**, **TypeScript** y **Tailwind CSS**.

- **API:** Define las llamadas en `frontend/src/api/`.
- **Estado:** Usa **React Query** (`@tanstack/react-query`) para fetching de datos.
- **Hooks:** Centraliza la lógica en hooks personalizados (`frontend/src/hooks/`).
- **Navegación:** Si creas una vista nueva, sincroniza el estado con el historial del navegador (`history.pushState`) en `App.tsx` para soportar los botones Back/Forward.

---

## 4. Analíticas y Telemetría
Cada feature debe ser medible desde el día 1.

- **Umami:** Usa `(window as any).umami.track('evento', { metadata })`.
- **Backend Logs:** Usa `ActivityLogger.log('ACTION', { data })` para persistir eventos críticos en Postgres.

---

## 5. Verificación (Testing)
No se considera terminado un feature sin tests unitarios.

- **Framework:** Vitest.
- **Frontend:** `npm test` (dentro de `/frontend`).
- **Backend:** `npm run coverage` (dentro de `/backend`).

---

## 🛡️ Checklist de Seguridad y Calidad
- [ ] ¿Los campos de entrada están validados con Zod?
- [ ] ¿La ruta del backend tiene el middleware de autenticación correcto?
- [ ] ¿Se están exponiendo secretos en los logs o respuestas? (Nunca lo hagas).
- [ ] ¿El componente de React es responsivo (mobile-first)?
- [ ] ¿Se agregó el evento de tracking en Umami?
- [ ] ¿Se creó la migración de base de datos si aplica?

---
*Esta guía es dinámica. Si encuentras un patrón mejor, actualiza este documento.*
