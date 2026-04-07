# Wati: Nutrición Consciente (Monorepo)

Wati es una plataforma de recetas diseñada para usuarios con necesidades dietéticas específicas (FODMAPs, alergias, sensibilidades). Esta versión ha evolucionado a una **Arquitectura Multi-Usuario Cloud-Ready** gestionada en un **Monorepo**, con altos estándares de seguridad y cumplimiento **GDPR**.

## 🏗️ Estructura del Proyecto

El proyecto se divide en diferentes servicios orquestados por Docker Compose:

- **`/frontend`**: Aplicación Single Page Application (SPA) construida con **Vite 6 + React + TypeScript**. Gestiona la interfaz de usuario, perfiles de salud y consumo seguro por JWT.
- **`/backend`**: Microservicio central en **Node.js + Express**. Motor de reglas de negocio, proxy inteligente (con inyección de dietas), gestión de usuarios y caché.
- **`/telegram-bot`**: Bot de ingesta de recetas (**Wati Ingest Bot**). Permite procesar recetas desde fotos (OCR), texto o notas de voz (Whisper) y guardarlas directamente en el sistema.
- **`/nginx`**: Gateway de seguridad actuando como Proxy Inverso con soporte para TLS y configuraciones de seguridad avanzadas.
- **`/terraform`**: Infraestructura como Código (IaC) para la gestión segura de secretos mediante **HCP Vault Secrets**.
- **Almacenamiento (PostgreSQL & Redis)**: Persistencia relacional segura e In-Memory Database para performance y protección de cotas de APIs externas.
- **Umami Analytics**: Panel de analíticas auto-hospedado para tracking de eventos, funnels y métricas de uso en tiempo real.

## 🌟 Características Principales

- **Privacidad y Cumplimiento GDPR**: Perfiles de salud encriptados. Flujo legal de aceptación de términos y borrado en cascada de datos (`DELETE /api/auth/me`).
- **Autenticación Segura (JWT & Bcrypt)**: Cuentas individuales identificadas por **UUID v4**.
- **Ingesta Inteligente (IA & OCR)**: El **Telegram Bot** utiliza **NVIDIA NIM (OCDRNet)** para extraer ingredientes de fotos y **Groq Whisper** para transcribir recetas dictadas por voz.
- **Proxy Inteligente con IA**: El backend protege las API Keys y procesa recetas mediante análisis de lenguaje natural (**Llama 4 Maverick**) para aplicar filtros SIBO/FODMAP automáticos.
- **Sistema de Caché Optimizada (Redis & IndexedDB)**: TTL inteligente para APIs externas y motor de búsqueda instantáneo en el frontend mediante **Dexie**.
- **Gestión de Secretos Cloud**: Integración nativa con **HCP Vault** para proteger credenciales críticas fuera del código base.
- **Analytics en Tiempo Real (Umami)**: Tracking de eventos como recetas favoritas, búsquedas exitosas/fallidas, sugerencias al chef. Dashboard de popularidad de recetas y tasa de éxito del motor de búsqueda.
- **Navegación Responsive**: Menú hamburguesa en móviles, historial del navegador sincronizado (back/forward), y CORS habilitado para acceso desde red local.

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** + **TypeScript** + **Vite 6**
- **Tailwind CSS** (Glassmorphism & Componentes Premium)
- **Vitest** (Test Unitarios)
- **Umami** (Analytics auto-hospedado, GDPR-compliant)

### Backend e Infraestructura
- **Node.js** + **Express 5** (Compatible con `req.validatedQuery`)
- **Zod** (Validación de esquemas)
- **PostgreSQL 15** + **Sequelize CLI**
- **Redis 7** (In-Memory Data Store)
- **Nginx** (Reverse Proxy con TLS modular)
- **Terraform** (Gestión de HCP Vault)

### IA y Servicios Externos
- **NVIDIA NIM**: OCDRNet (OCR), Llama 4 Maverick (NLP), SDXL (Generación de Imágenes).
- **Groq API**: Whisper (Transcripción de audio de alta velocidad).

## 📊 Eventos de Analytics (Umami)

| Evento | Cuándo se dispara | Payload |
|---|---|---|
| `search_success` | Búsqueda con resultados | `{ query, resultsCount }` |
| `search_failed` | Búsqueda sin resultados | `{ query, resultsCount: 0 }` |
| `recipe_favorited` | Al marcar receta como favorita | `{ title, id }` |
| `recipe_unfavorited` | Al quitar receta de favoritos | `{ title, id }` |
| `suggest_to_chef` | Al sugerir receta al chef | `{ term }` |

**Dashboard de Umami**: `http://analytics.localhost` (requiere entrada en `/etc/hosts` o DNS local).

## 🚀 Instalación y Uso (Docker Compose)

### 1. Requisitos
- [Docker](https://www.docker.com/) y Docker Compose instalados.

### 2. Variables de Entorno
Asegúrate de configurar tu archivo `.env` basado en `.env.example`. 

```env
# Ejemplo de configuración necesaria
TELEGRAM_BOT_TOKEN=tu_token_aqui
TELEGRAM_USER_ID=tu_id_usuario
HCP_CLIENT_ID=tu_hcp_id
HCP_CLIENT_SECRET=tu_hcp_secret
UMAMI_APP_SECRET=tu_secreto_para_umami
```

### 3. Levantar la Plataforma
```bash
docker compose up -d --build
```

### 4. Inicializar la Base de Datos
```bash
docker compose exec backend npx sequelize-cli db:migrate
```

## 🧪 Desarrollo y Pruebas

```bash
# Frontend
cd frontend && npm install && npm test

# Backend (Requiere servicios activos)
cd backend && npm install && npm run coverage
```

## 📚 Documentación Adicional

| Documento | Descripción |
|---|---|
| [ArchitectureNotes.md](./docs/ArchitectureNotes.md) | Notas de arquitectura: filtrado de recetas, Express 5, modos MOCK/LIVE, TLS post-cuántico. |
| [ProductionChecklist.md](./docs/ProductionChecklist.md) | Checklist paso a paso para poner la aplicación en producción. |
| [HCP_VAULT_SETUP.md](./docs/HCP_VAULT_SETUP.md) | Guía de configuración para HCP Vault Secrets y Terraform. |

---
**Wati** — *Seguridad alimentaria impulsada por IA, ahora multicapa.*
