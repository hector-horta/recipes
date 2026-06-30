# 🛠️ Wati: Guía de Desarrollo de Features

> **Propósito**: Este archivo es la **referencia principal y autocontenida** para desarrollar nuevas funcionalidades en el ecosistema Wati. Contiene toda la estructura del proyecto, esquemas, convenciones y patrones necesarios para que un agente de IA (o un desarrollador) pueda comenzar a trabajar **sin necesidad de explorar el codebase**.

---

## 🚀 Inicio Rápido (Quick Start)

Para levantar el entorno de desarrollo por primera vez:

1. **Clonar y Configurar**:
   ```bash
   git clone [repo]
   cp .env.example .env  # Configura tus llaves de API (NVIDIA, GROQ, etc.)
   ```

2. **Levantar Infraestructura**:
   ```bash
   docker compose up -d --build
   ```

3. **Preparar Base de Datos**:
   ```bash
   docker compose exec backend npx sequelize-cli db:migrate
   docker compose exec backend npx sequelize-cli db:seed:all
   ```

4. **Verificar**:
   - Wati UI: `http://localhost:5173`
   - More Admin: `http://localhost:5174`
   - API Status: `http://localhost:5001/api/status`
   - Logs: `http://localhost:8080` (Dozzle)

---

## 🏗️ Arquitectura y Calidad de Código

Para combatir la deuda técnica y mantener el codebase profesional:

### Principios Críticos de Diseño
1. **SSRF Protection**: Toda integración externa (Spoonacular, Groq, NVIDIA) debe pasar por el Proxy del Backend (`ingest.js` o `NvidiaNIM.js`). Nunca llames APIs de terceros desde el frontend.
2. **Frontend API Client**: Prohibido usar `fetch` directo. Usar `frontend/src/lib/api.ts`.
   - Esto garantiza que `credentials: 'include'` y los headers de i18n/auth sean consistentes.
3. **Manejo de Errores y Telemetría**: Nunca usar `console.log` o `console.error` directamente.
   - **Backend**: Usar los métodos estáticos de `ActivityLogger` para logs estructurados y telemetría.
   - **Frontend**: Usar el singleton `logger` (`frontend/src/utils/logger.ts`) para unificar logs de consola y trackeo de eventos.
4. **Validación Zod**: Todo input externo (req.body, req.query, env vars) DEBE ser validado con Zod antes de tocar la lógica. **Usa `backend/models/validators.js`** como repositorio central de esquemas para asegurar consistencia entre rutas.
5. **No Static URLs**: Prohibido usar URLs de API hardcodeadas en el frontend. Usar el wrapper `api` de `frontend/src/lib/api.ts` que inyecta automáticamente el `CONFIG.API_URL`.
6. **Resiliencia Frontend**: Usa reintentos (`retry`) en hooks de búsqueda y gestión de estados de error amigables para el usuario.
7. **Auth Rule**: Wati usa **Hybrid Auth**. Los usuarios se autentican con contraseña, pero las funcionalidades core (como agregar a favoritos) están **soft-gated** y requieren validación de correo vía un link JWT.
8. **External Integrations Rule**: Todos los servicios de terceros (como Resend) DEBEN estar abstraídos detrás de una **IEmailService Facade**. La lógica de negocio nunca debe interactuar directamente con SDKs externos.
9. **Multi-tenancy Isolation**: Toda nueva funcionalidad que maneje datos de usuario o contenido (recetas, planes, etc.) DEBE filtrar por `organization_id`. El `organization_id` se extrae automáticamente del JWT y está disponible en `req.user.organizationId` (o `req.user.organization_id`). Para migrar datos antiguos, consultar la [Guía de Migración](file:///docs/MigrationGuideToMultitenant.md).
10. **Frontend Independence**: Cada frontend (`wati`, `more-admin`) corre en su propio contenedor Docker y es independiente. Comparten lógica a través de `packages/` pero mantienen sus propios ciclos de despliegue y configuraciones de i18n.
11. **Admin Content Management**: El panel `more-admin` es el responsable de gestionar el catálogo global (`organization_id = NULL`). Toda nueva funcionalidad de gestión debe incluir soporte para **bulk actions** (acciones en masa) y feedback visual inmediato vía toasts.
12. **Content Resilience (Images)**: Para mitigar errores de generación por AI, se debe proveer un mecanismo de "Refresh/Regenerate Image" que permita al admin forzar una nueva generación especificando el problema (ej: "texto en la imagen").
13. **Tag Consistency**: Los tags son globales. Al crear/editar contenido, se deben usar los `keys` del catálogo de tags para asegurar la integridad de las traducciones en todas las apps. **Prohibido hardcodear strings de tags en las recetas.**
14. **XSS Sanitization**: Todo contenido HTML proveniente de fuentes externas (AI, OCR, Scrapers) DEBE ser sanitizado en el frontend usando `DOMPurify` con una whitelist estricta antes de renderizarse.
15. **Telemetry First**: Ninguna feature está completa sin su correspondiente evento de analytics (Umami) y logs estructurados (ActivityLogger).
16. **Pure JS Dependencies (Bcrypt)**: Para evitar fallos y crashes de compilación nativa en entornos de contenedores Docker o despliegues en la nube, se prohíbe el uso de `bcrypt` (librería nativa de C++). En su lugar, se debe utilizar **`bcryptjs`** (implementación pura de JavaScript). Toda nueva funcionalidad de autenticación o encriptación de contraseñas debe importar y utilizar `bcryptjs` de forma estricta.
---

## 📁 Estructura Completa del Proyecto

```
/
├── .env                          # Variables de entorno globales (Docker Compose las inyecta)
├── SECURITY.md                   # Políticas de seguridad, Auth y prevención (i.e. CSRF)
├── docker-compose.yml
├── backend/
│   ├── server.js                 # Entry point — Express 5 app, routes, rate limiting, CORS
│   ├── package.json              # type: "module" (ESM)
│   ├── vitest.config.ts          # Test: environment: 'node'
│   ├── .sequelizerc              # Sequelize CLI paths
│   ├── config/
│   │   ├── env.js                # Validación estricta con Zod. FUENTE ÚNICA de process.env
│   │   ├── resiliency.js         # Fetch con whitelist (SSRF protection) y reintentos (Exponential Backoff)
│   │   ├── config.cjs            # Sequelize CLI config (CommonJS requerido por CLI)
│   │   ├── database.js           # Sequelize instance + connectDB()
│   │   ├── redis.js              # Redis client + connectRedis()
│   │   ├── cors.js               # CORS config (localhost, local network, credentials)
│   │   ├── medical.js            # INTOLERANCE_CATALOG + MEDICAL_TRIGGERS (fuente de verdad unificada)
│   │   ├── bullmq.js             # BullMQ/IORedis connection factory + queue/job type constants
│   │   └── vault.js              # HCP Vault OAuth2 client
│   ├── models/
│   │   ├── User.js
│   │   ├── Profile.js            # Asociaciones: User.hasOne(Profile), Profile.belongsTo(User)
│   │   ├── FavoriteRecipe.js     # Asociaciones: User.hasMany(FavoriteRecipe)
│   │   ├── Organization.js       # Entidad de inquilino (tenant)
│   │   ├── UserOrganization.js   # Tabla intermedia de membresía y roles
│   │   ├── Recipe.js             # Filtrado por organization_id
│   │   ├── SearchLog.js
│   │   ├── ActivityLog.js
│   │   ├── NutritionalPlan.js    # Plan alimentario asignado a pacientes
│   │   └── validators.js         # Schemas Zod (recipeQuerySchema, adminRecipeSchema, addOrgUserSchema, bulkOrgUsersSchema, organizationUpdateSchema, registerSchema, loginSchema, etc.)
│   ├── middleware/
│   │   ├── auth.js               # authenticateToken, optionalAuthenticateToken
│   │   ├── validate.js           # validateQuery(zodSchema) → req.validatedQuery
│   │   └── recoveryLogger.js     # recoveryLogger (middleware), saveIngestLog (function)
│   ├── routes/
│   │   ├── auth.js               # /api/auth/*
│   │   ├── favorites.js          # /api/favorites/*
│   │   ├── recipes.js            # /api/recipes/*
│   │   ├── ingest.js             # /api/ingest/* (Telegram Bot ingestion)
│   │   ├── suggestions.js        # /api/suggestions/*
│   │   ├── admin.js              # /api/admin/* (Super Admin panel)
│   │   ├── nutri.js              # /api/nutri/* (Health Professional BFF)
│   │   ├── plans.js              # /api/plans/* (Patient Plans)
│   │   ├── shop.js               # /api/shop/* (Shopping lists)
│   │   └── jobs.js               # /api/jobs/* (AI job status polling)
│   ├── services/
│   │   ├── ActivityLogger.js     # Telemetría + alertas Telegram (fire-and-forget)
│   │   ├── RecipeProvider.js     # Búsqueda en DB + caché Redis + filtrado por intolerancias
│   │   ├── NvidiaNIM.js          # OCR (Llama 4), estructurar recetas, traducción AI, generar imágenes
│   │   ├── GeminiService.js      # Generación de imágenes con Google Gemini (Imagen 4.0)
│   │   ├── GroqWhisper.js        # Transcripción de audio
│   │   ├── IEmailService.js      # Facade de correos (Dev/Resend)
│   │   ├── AdminStatsService.js   # Servicio para cálculo de estadísticas de administración
│   │   ├── OrganizationService.js # Servicio para gestión de inquilinos y membresías de usuarios
│   │   ├── AdminRecipeService.js  # Servicio para CRUD y gestión de recetas globales
│   │   ├── AdminTagService.js     # Servicio para CRUD y gestión de etiquetas globales
│   │   ├── NutriRecipeService.js  # Gestión de recetas específicas de clínica
│   │   ├── IngredientConsolidatorService.js # Consolidación de ingredientes para listas de compras
│   │   ├── PDFGeneratorService.js # Generación de PDFs (planes nutricionales, recetas)
│   │   └── DietPlanService.js     # Gestión de planes nutricionales y asignaciones
│   ├── queues/
│   │   └── aiQueue.js            # BullMQ Queue singleton (Express enqueues AI jobs here)
│   ├── worker.js                 # ⚡ Standalone AI worker process (node worker.js)
│   ├── utils/
│   │   ├── tagTranslations.js    # TAG_TRANSLATIONS map, normalizeTag(), normalizeTags()
│   │   ├── ingestSanitizer.js    # sanitizeStructuredRecipe() — mapea output LLM a ENUMs/tipos DB
│   │   ├── asyncHandler.js       # Wrapper para rutas async en Express 5
│   │   ├── retry.js              # withRetry() — reintentos con exponential backoff para APIs externas
│   │   ├── urlValidator.js       # validateExternalUrl() — SSRF protection para URLs externas
│   │   ├── regenerateAllImages.js
│   │   ├── regenerateSpecificImages.js
│   │   └── migrateToTenant.js    # Script de migración multi-tenant (ver docs/MigrationGuideToMultitenant.md)
│   ├── migrations/               # Sequelize CLI migrations (.cjs)
│   ├── seeders/
│   ├── tests/                    # Tests unitarios e integración del backend (*.test.js)
│   │   ├── AdminStatsService.test.js
│   │   ├── OrganizationService.test.js
│   │   ├── NutriRecipeService.test.js
│   │   └── DietPlanService.test.js
│   ├── scratch/                  # ⚠️ Scripts temporales de debug — NO COMMITEAR (en .gitignore)
│   ├── public/recipes/           # Imágenes estáticas de recetas (servido por Express)
│   └── ingest_logs/              # Recovery logs de ingesta (JSON)
│
├── frontend/
│   ├── package.json              # Entorno de tests + dependencias compartidas
│   ├── tsconfig.json             # Configuración TS (incluye tests)
│   ├── vitest.config.ts          # Runner de tests centralizado
│   ├── pnpm-workspace.yaml       # Definición de sub-workspace
│   ├── apps/
│   │   ├── wati/                 # Aplicación principal (B2C)
│   │   │   ├── src/              # Lógica, páginas y componentes de Wati
│   │   │   │   ├── AuthContext.tsx
│   │   │   │   ├── ToastContext.tsx
│   │   │   │   ├── App.tsx
│   │   │   │   ├── main.tsx
│   │   │   │   ├── api/          # PrivacyProxy, MedicalRegistry, SecurityScrubber
│   │   │   │   ├── hooks/        # useWatiSearch, useFavorites, etc.
│   │   │   │   ├── components/   # RecipeCard, LoginModal, etc.
│   │   │   │   └── test/
│   │   │   │       └── setup.ts  # Setup global de Vitest
│   │   │   └── package.json
│   │   └── more-admin/           # Panel de administración (B2B/Gestión)
│   │       ├── src/
│   │       │   ├── pages/        # GlobalRecipes.tsx (Gestión de contenido)
│   │       │   ├── locales/      # i18n para admin
│   │       │   └── components/
│   │       ├── package.json
│   │       └── Dockerfile        # Container independiente
│   ├── packages/
│   │   ├── ui-kit/               # Biblioteca de UI (@wati/ui-kit)
│   │   │   ├── src/
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Button.tsx
│   │   │   │   └── Input.tsx
│   │   │   └── package.json
│   │   ├── api-client/           # Cliente de API compartido (@wati/api-client)
│   │   └── types/                # Tipos compartidos (@wati/types)
│   └── tests/                    # Estructura de tests espejada
│       ├── apps/
│       │   └── wati/             # Tests de la aplicación Wati
│       └── packages/
│           └── ui-kit/           # Tests de la biblioteca UI
│
├── telegram-bot/                 # Bot de ingesta de recetas
│   ├── src/
│   │   ├── index.js              # Entry point — Polling, Auth y Router de eventos
│   │   ├── config.js             # Validación de env vars del bot
│   │   ├── handlers/             # Lógica de mensajes, voz, imágenes y callbacks
│   │   ├── services/             # backendStore.js (Cliente API con x-api-key)
│   │   └── utils/                # logger.js estructurado, SessionManager, Formatter
│   ├── package.json              # Scripts: start, dev (node --watch)
│   └── Dockerfile                # Configuración multi-etapa para producción
├── nginx/                        # Reverse proxy OQS (TLS post-cuántico)
└── terraform/                    # IaC para HCP Vault Secrets
```

---

## 🗃️ Esquemas de Base de Datos (Sequelize Models)

> Todas las tablas usan `underscored: true` y `timestamps: true` (genera `created_at`, `updated_at`).
> Las PKs son **UUID v4** (`DataTypes.UUIDV4`).

### `users`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK, default UUIDV4 |
| `email` | STRING | NOT NULL, UNIQUE, isEmail |
| `password_hash` | STRING | NOT NULL |
| `display_name` | STRING | NOT NULL |
| `is_active` | BOOLEAN | NOT NULL, default: true |
| `is_verified` | BOOLEAN | NOT NULL, default: false |
| `role` | ENUM | 'user', 'admin', 'super_admin' |
| `accepted_terms_at` | DATE | NOT NULL |
| `data_exported_at` | DATE | nullable |
| `created_at` | DATE | auto |
| `updated_at` | DATE | auto |

### `organizations`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `name` | STRING | NOT NULL, UNIQUE |
| `slug` | STRING | NOT NULL, UNIQUE |
| `is_active` | BOOLEAN | default: true |
| `settings` | JSONB | default: {} |

### `user_organizations`
| Column | Type | Constraints |
|---|---|---|
| `user_id` | UUID | PK, FK → users(id) |
| `organization_id` | UUID | PK, FK → organizations(id) |
| `role` | STRING | default: 'user' |

### `profiles`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users(id), ON DELETE CASCADE |
| `diet` | ENUM('None','Vegan','Vegetarian','Keto','Paleo','SIBO') | default: 'None' |
| `intolerances` | JSONB | default: [] |
| `conditions` | JSONB | default: [] (Sincronizado con intolerancias, ej: 'SIBO') |
| `excluded_ingredients` | TEXT | nullable, default: '' |
| `daily_calories` | INTEGER | nullable, default: 2000 |
| `onboarding_completed` | BOOLEAN | default: false |
| `language` | STRING(5) | default: 'en' |
| `severities` | JSONB | default: {} |

**Asociaciones**: `User.hasOne(Profile)`, `Profile.belongsTo(User)`

### `recipes`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `title_es` | STRING | NOT NULL |
| `title_en` | STRING | NOT NULL |
| `slug` | STRING | UNIQUE |
| `prep_time_minutes` | INTEGER | default: 0 |
| `cook_time_minutes` | INTEGER | default: 0 |
| `servings` | INTEGER | default: 1 |
| `difficulty` | ENUM('easy','medium','hard') | default: 'medium' |
| `ingredients` | JSONB | default: [] |
| `steps` | JSONB | default: [] |
| `tags` | JSONB | default: [] |
| `image_url` | STRING | nullable |
| `image_filename` | STRING | nullable |
| `sibo_risk_level` | ENUM('safe','caution','avoid') | default: 'safe' |
| `sibo_alerts` | JSONB | default: [] |
| `source_type` | ENUM('manual','ocr_image','audio','telegram') | default: 'manual' |
| `source_reference` | STRING | nullable |
| `status` | ENUM('draft','published','archived') | default: 'draft' |
| `created_by` | UUID | nullable, FK → users(id) |
| `organization_id` | UUID | nullable, FK → organizations(id) |

**Formato de `ingredients` (JSONB array)**:
```json
[{
  "name": { "es": "Ajo", "en": "Garlic" },
  "quantity": "2",
  "unit": { "es": "dientes", "en": "cloves" },
  "siboAlert": true
}]
```

**Formato de `steps` (JSONB array)**:
```json
[{
  "order": 1,
  "instruction": { "es": "Picar el ajo.", "en": "Chop the garlic." },
  "type": "active",
  "durationMinutes": 5
}]
```

**Formato de `tags` (JSONB array)**:
```json
[{ "es": "Saludable", "en": "Healthy" }, { "es": "Desayuno", "en": "Breakfast" }]
```

### `favorite_recipes`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users(id), ON DELETE CASCADE |
| `recipe_id` | UUID | NOT NULL |
| `title` | STRING | NOT NULL |
| `image` | STRING | nullable |

**Asociaciones**: `User.hasMany(FavoriteRecipe)`, `FavoriteRecipe.belongsTo(User)`
**Lazy association**: `FavoriteRecipe.belongsTo(Recipe, { constraints: false })` — se define via `associateWithRecipe(Recipe)` para evitar import circular.

### `search_logs`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `term` | STRING | NOT NULL |
| `status` | ENUM('failed','suggested') | default: 'failed' |
| `conversion` | BOOLEAN | default: false |
| `user_id` | STRING | nullable |
| `ip` | STRING | nullable |

> **Nota**: `timestamps: false` — no tiene created_at/updated_at.

### `tags` (Diccionario de traducciones — Activo Global)
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `key` | STRING | NOT NULL, UNIQUE |
| `es` | STRING | NOT NULL |
| `en` | STRING | NOT NULL |
| `created_at` | DATE | auto |
| `updated_at` | DATE | auto |

> **Nota**: Se utiliza como diccionario centralizado para `normalizeTags()`. Las recetas aún guardan tags desnormalizados en JSONB por performance de lectura.
> **⚠️ Tags son un activo GLOBAL** — no tienen `organization_id`. Son compartidos por todas las apps del ecosistema (Wati, Nutri, etc.).

### `activity_logs`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `action` | ENUM('SEARCH','VIEW_RECIPE','ADD_FAVORITE','INGEST_SUCCESS','INGEST_FAIL') | NOT NULL |
| `metadata` | JSONB | default: {} |
| `failed_search` | BOOLEAN | default: false |
| `user_id` | UUID | nullable |
| `ip` | STRING(64) | nullable |
| `created_at` | DATE | auto |

> **Nota**: `updatedAt: false` — los logs son inmutables.

---

## 🔌 API Reference (Backend Endpoints)

> **⚠️ IMPORTANTE**: El archivo **`backend/swagger.yaml`** es la fuente de verdad técnica para los endpoints. Esta sección es un resumen informativo.

### Rutas Registradas en `server.js`

| Prefix | Router File | Auth |
|---|---|---|
| `/api/auth` | `routes/auth.js` | Mixto |
| `/api/favorites` | `routes/favorites.js` | authenticateToken |
| `/api/ingest` | `routes/ingest.js` | Mixto |
| `/api/admin` | `routes/admin.js` | optionalAuthenticateToken + super_admin |
| `/api/suggestions` | `routes/suggestions.js` | Público |
| `/api/recipes` | `routes/recipes.js` | optionalAuthenticateToken |
| `/api/nutri` | `routes/nutri.js` | authenticateToken |
| `/api/plans` | `routes/plans.js` | authenticateToken |
| `/api/shop` | `routes/shop.js` | authenticateToken |
| `/api/jobs` | `routes/jobs.js` | optionalAuthenticateToken + admin/super_admin |

### Endpoints Inline en `server.js`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/status` | Público | Healthcheck |
| GET | `/api/medical/catalog` | Público | Catálogo de intolerancias |
| GET | `/api/medical/triggers` | Público | Medical triggers map |
| GET | `/api/recipes` | optionalAuthenticateToken | Búsqueda de recetas (RecipeProvider) |

### Auth Routes (`/api/auth/*`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/register` | Público | `{ email, password, displayName, acceptedTerms, language }` | `{ token, user }` |
| POST | `/login` | Público | `{ email, password }` | `{ token, user }` |
| GET | `/me` | authenticateToken | — | `{ id, email, displayName, profile, createdAt, updatedAt }` |
| PUT | `/profile` | authenticateToken | Partial profile fields | `profile` object |
| DELETE | `/me` | authenticateToken | — | `{ message }` (GDPR delete cascade) |

### Favorites Routes (`/api/favorites/*`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/` | authenticateToken | — | `FavoriteRecipe[]` (includes Recipe data) |
| POST | `/` | authenticateToken | `{ recipeId, title, image }` | `{ favorited: bool, data? }` (toggle) |
| DELETE | `/:recipeId` | authenticateToken | — | `{ message }` |

### Suggestions Routes (`/api/suggestions/*`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/` | Público | `{ term, userId? }` | `{ message, searchLog }` |
| GET | `/stats` | Público | — | `{ totalFailed, totalSuggested, conversionRate, recentFailedTerms }` |

### Admin Routes (`/admin/*`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/stats` | Admin (`super_admin`) | — | Agregados de rendimiento, uptime de NVIDIA y estadísticas de uso |
| GET | `/organizations` | Admin (`super_admin`) | — | Lista de todas las organizaciones con contador de usuarios |
| POST | `/organizations` | Admin (`super_admin`) | `{ name, slug }` | Objeto de la organización creada |
| GET | `/organizations/:id` | Admin (`super_admin`) | — | Detalle de la organización e información de sus usuarios asociados |
| PUT | `/organizations/:id` | Admin (`super_admin`) | `{ name, slug, is_active }` | Organización actualizada y limpia caché de recetas |
| DELETE | `/organizations/:id` | Admin (`super_admin`) | — | Alterna el estado activo/suspendido de la organización y limpia caché |
| POST | `/organizations/:id/users` | Admin (`super_admin`) | `{ displayName, email, role }` | Asocia o crea un nuevo usuario y lo añade a la organización |
| POST | `/organizations/:id/users/bulk` | Admin (`super_admin`) | `{ users: [{ displayName, email, role }] }` | Procesa masivamente usuarios en transacción y los añade a la org |
| DELETE | `/organizations/:id/users/:userId` | Admin (`super_admin`) | — | Desasocia un usuario de la organización sin eliminar su cuenta |
| GET | `/recipes` | Admin (`super_admin`) | — | Recetas globales, con soporte de paginación (`number` y `offset`) |
| POST | `/recipes` | Admin (`super_admin`) | `{ title_es, title_en, prep_time_minutes, ... }` | `Recipe` creada y limpia caché de RecipeProvider |
| PUT | `/recipes/:id` | Admin (`super_admin`) | `{ title_es, title_en, prep_time_minutes, ... }` | `Recipe` actualizada y limpia caché de RecipeProvider |
| DELETE | `/recipes/:id` | Admin (`super_admin`) | — | Receta eliminada y limpia caché de RecipeProvider |
| GET | `/tags` | Admin (`super_admin`) | — | Lista el diccionario global de etiquetas |
| POST | `/tags` | Admin (`super_admin`) | `{ key, es, en }` | Tag creado y limpia caché de TagService/RecipeProvider |
| PUT | `/tags/:id` | Admin (`super_admin`) | `{ key, es, en }` | Tag actualizado y limpia caché de TagService/RecipeProvider |
| DELETE | `/tags/:id` | Admin (`super_admin`) | — | Tag eliminado y limpia caché de TagService/RecipeProvider |
| POST | `/translate` | Admin (`super_admin`, `admin`) | `{ text, from: 'es'\|'en', to: 'es'\|'en' }` | Traduce texto entre ES↔EN usando NVIDIA NIM (Llama 4). Respuesta síncrona |

### Jobs Routes (`/api/jobs/*`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/:id` | Admin (`admin`, `super_admin`) | — | Estado del job AI: `{ id, name, status, progress, result, failedReason }` |
| GET | `/` | Admin (`super_admin`) | — | Dashboard de jobs recientes: waiting, active, completed, failed |

### Ingestion Routes (`/api/ingest/*`)

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/:slugOrId/:action` | Mixto | `{ issue? }` | Depende de la acción (por ejemplo, para `refresh-image` retorna la receta con la nueva imagen; acepta tanto slug como id UUID en la URL) |

---

## 🧩 Patrones y Convenciones Establecidos

### Backend

#### Módulos ESM
- `package.json` tiene `"type": "module"` — usar `import/export`, no `require`.
- Las migraciones **deben ser `.cjs`** (CommonJS) porque Sequelize CLI no soporta ESM.

#### Creación de Rutas
```javascript
// 1. Crear archivo en backend/routes/miFeature.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  // Express 5 soporta async nativo - no necesita try/catch wrapper para next(err)
  // Pero si necesitas manejo específico, usa try/catch
});

export default router;

// 2. Registrar en server.js
import miFeatureRoutes from './routes/miFeature.js';
app.use('/api/mi-feature', miFeatureRoutes);
```

#### Documentación con Swagger (OpenAPI)
Todo nuevo endpoint **DEBE** ser documentado en el archivo `backend/swagger.yaml`.
La documentación debe seguir el estándar OpenAPI 3.0, definiendo:
- Method y Path.
- Tags y Summary.
- Parámetros (Query, Path, Body) con esquemas correspondientes.
- Respuestas exitosas (200, 201) y de error (400, 401, 404, 409, 500).
- Requisitos de seguridad (e.g., `bearerAuth`, `adminApiKey`) si la ruta está protegida.

#### Validación con Zod
```javascript
// En models/validators.js — definir el schema
import { z } from 'zod';
export const miSchema = z.object({
  campo: z.string().trim().max(100).optional()
});

// En la ruta — usar el middleware
import { validateQuery } from '../middleware/validate.js';
import { miSchema } from '../models/validators.js';
router.get('/', validateQuery(miSchema), (req, res) => {
  // Usar req.validatedQuery (NO req.query) — Express 5 hace req.query read-only
  const { campo } = req.validatedQuery;
});
```

#### Aislamiento Multi-inquilino (Multi-tenancy)
Toda consulta a datos de organización debe filtrar por `organization_id`. Sin embargo, las **recetas de Wati son globales** (`organization_id = NULL`) y deben estar siempre disponibles.

```javascript
// Para datos estrictamente privados de una org (ej: planes de Nutri)
router.get('/', authenticateToken, async (req, res) => {
  const items = await MyModel.findAll({
    where: { organization_id: req.user.organization_id }
  });
  res.json(items);
});

// Para recetas: incluir siempre las globales de Wati (NULL) + las de la org
import { Op } from 'sequelize';
const orgId = req.user?.organization_id ?? null;
const where = {
  organization_id: orgId
    ? { [Op.or]: [orgId, null] }  // Org propia + globales Wati
    : null                         // Solo globales (usuario Wati sin org)
};
```

> **Regla**: Nunca filtrar recetas exclusivamente por `organization_id` sin incluir `NULL`. Eso ocultaría el catálogo global de Wati a usuarios de otras plataformas.

#### Autenticación y Sesión
- **HttpOnly Cookies**: Wati usa JWT persistidos en cookies `HttpOnly` (Lax, Secure en producción). Esto protege contra robo de sesión vía XSS.
- **`authenticateToken`**: Valida el JWT de la cookie. Rechaza con 401/403. Setea `req.user`.
- **`optionalAuthenticateToken`**: Intenta validar si existe cookie. Si no, continúa sin `req.user`.
- **`requireAdminKey`**: Middleware para rutas críticas (ingesta, admin). Verifica el header `X-Admin-Key` contra `config.ADMIN_API_KEY`.
- **Separación de Secretos JWT**: Wati utiliza tres secretos criptográficos independientes para firmar y verificar tokens:
  1. `JWT_SECRET`: Utilizado para los tokens de sesión del usuario (autenticación estándar).
  2. `JWT_VERIFY_SECRET`: Utilizado para los links de verificación de correo electrónico.
  3. `JWT_RESET_SECRET`: Utilizado para los links de restablecimiento de contraseña.
  - *En desarrollo/pruebas*: Si no se configuran `JWT_VERIFY_SECRET` y `JWT_RESET_SECRET`, estas variables heredan el valor de `JWT_SECRET` por simplicidad.
  - *En producción (`NODE_ENV=production`)*: Los tres secretos son obligatorios y deben ser estrictamente diferentes entre sí. Si alguno falta o coincide con otro, la aplicación lanzará un error de validación de Zod y no iniciará.

#### Modelo Sequelize (Nuevo)
```javascript
// backend/models/MiModelo.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const MiModelo = sequelize.define('MiModelo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // ...campos
}, {
  tableName: 'mi_tabla',   // snake_case plural
  timestamps: true,
  underscored: true         // OBLIGATORIO — genera created_at, no createdAt
});
```

#### Migración (Nueva)
```bash
docker compose exec backend npx sequelize-cli migration:generate --name nombre-del-cambio
```
- Las migraciones son `.cjs` (CommonJS).
- Nombre de archivo: `YYYYMMDDHHMMSS-nombre.cjs`
- Usar `queryInterface.createTable()` / `addColumn()` / etc.
- Siempre incluir `up` y `down`.

#### Caché Redis
```javascript
import { redisClient } from '../config/redis.js';

// Lectura
if (redisClient.isReady) {
  const cached = await redisClient.get('mi:clave');
  if (cached) return JSON.parse(cached);
}

// Escritura
if (redisClient.isReady) {
  await redisClient.setEx('mi:clave', 3600, JSON.stringify(data)); // TTL: 1h
}
```
> Redis es opcional — siempre verificar `redisClient.isReady` antes de usarlo. Si Redis no está disponible, la app debe funcionar sin caché.

#### Cola de Trabajos AI (BullMQ)
Las operaciones AI pesadas (generación de imágenes, ingest OCR) se desacoplan del event loop de Express mediante una cola BullMQ procesada por un worker standalone (`node worker.js`).

**Arquitectura:**
```
┌──────────────────────┐         ┌─────────────────┐
│   Express Server     │         │   AI Worker      │
│   (server.js)        │ ──────► │   (worker.js)    │
│                      │  Redis  │                  │
│  CRUD, Auth, etc.    │  Queue  │  Gemini (imgs)   │
│  /api/jobs (status)  │ ◄────── │  NVIDIA NIM      │
└──────────────────────┘         └─────────────────┘
```

**Encolar un job desde una ruta:**
```javascript
import { getAiQueue } from '../queues/aiQueue.js';
import { JOB_TYPES } from '../config/bullmq.js';

const queue = getAiQueue();
const job = await queue.add(JOB_TYPES.GENERATE_IMAGE, {
  recipeId: recipe.id,
  title: recipe.title_en,
  feedback: 'Make it warmer tones',
  details: recipe.toJSON(),
});

res.status(202).json({ jobId: job.id });
```

**Consultar estado desde el frontend:**
```typescript
const status = await api.get(`/jobs/${jobId}`);
// { id, name, status: 'completed', progress: 100, result: { imageUrl: '...' } }
```

**Tipos de job disponibles** (definidos en `config/bullmq.js`):
| Constante | Valor | Descripción |
|---|---|---|
| `JOB_TYPES.GENERATE_IMAGE` | `generate-image` | Genera imagen de receta con Gemini Imagen 4.0 |
| `JOB_TYPES.INGEST_IMAGE` | `ingest-image` | OCR + estructura desde una imagen |
| `JOB_TYPES.INGEST_IMAGES` | `ingest-images` | OCR + estructura desde dos imágenes |
| `JOB_TYPES.INGEST_TEXT` | `ingest-text` | Estructura receta desde texto libre |
| `JOB_TYPES.INGEST_AUDIO` | `ingest-audio` | Transcribe audio y estructura receta |

> **Nota**: La traducción (`POST /api/admin/translate`) se mantiene **síncrona** porque es una operación rápida (~1-2s) y el usuario necesita el resultado inmediato en el campo de edición. Solo las operaciones pesadas (>5s) deben encolarse.

> **Regla**: Si agregas un nuevo tipo de job AI, debes: (1) agregar la constante en `config/bullmq.js`, (2) agregar el handler en `worker.js`, y (3) documentar el tipo aquí.

#### Telemetría y Logging
```javascript
import { ActivityLogger } from '../services/ActivityLogger.js';

// Log a DB (fire-and-forget, nunca bloquea)
ActivityLogger.log('ACTION_NAME', { metadata }, {
  userId: req.user?.id || null,
  ip: req.ip,
  failedSearch: false
});

// Alerta Telegram (fire-and-forget)
ActivityLogger.alertAsync('🔴 *Mensaje de alerta*');
```
> **Acciones válidas en el ENUM**: `'SEARCH'`, `'VIEW_RECIPE'`, `'ADD_FAVORITE'`, `'INGEST_SUCCESS'`, `'INGEST_FAIL'`.
> Si necesitas una nueva acción, **primero agrega el valor al ENUM** en una migración y en el modelo `ActivityLog.js`.

#### Error Handling
- El Global Error Handler está en `server.js`.
- Errores graves (5xx, NVIDIA, Groq) generan alertas Telegram automáticas.
- Para errores custom, `throw` un error con `.status`: `const err = new Error('msg'); err.status = 400; throw err;`

#### 🚨 Manejo de Errores y Logging
Wati utiliza un sistema de logging estructurado a través de `ActivityLogger`.

**Niveles de Log:**
- `ActivityLogger.info(msg, context)`: Eventos informativos del sistema.
- `ActivityLogger.warn(msg, context)`: Situaciones inesperadas pero no críticas.
- `ActivityLogger.error(msg, error, context)`: Errores que requieren atención. En desarrollo muestra el stack trace; en producción lo oculta del cliente pero lo persiste en logs internos.

**Reglas de Oro:**
1. **Nunca usar `console.log` o `console.error` directamente** — usar los métodos de `ActivityLogger`.
2. **Propagación**: Siempre usar `try { ... } catch (e) { next(e); }` en las rutas para que el Global Error Handler capture el error.
3. **Privacidad**: Nunca loguear passwords, tokens o info sensible del usuario (PII) en los mensajes de log.
4. **Respuesta al Cliente**: El error handler enmascara errores 5xx con un mensaje genérico. Los errores 4xx deben tener mensajes descriptivos para el usuario.

#### Sanitización de Ingesta (LLM → DB)
Cuando el LLM (NvidiaNIM) estructura una receta, los valores pueden no coincidir con los ENUMs de la DB (ej: `"Fácil"` en vez de `"easy"`). El módulo `utils/ingestSanitizer.js` normaliza:
- **`difficulty`**: mapea español/sinónimos → `'easy'|'medium'|'hard'`
- **`siboRiskLevel`**: mapea español/colores → `'safe'|'caution'|'avoid'`
- **`prepTimeMinutes/cookTimeMinutes/servings`**: extrae números de strings como `"15 min"`
- **`tags`**: pasa por `normalizeTags()` para asegurar formato `{es, en}`
- **`ingredients/steps/siboAlerts`**: asegura que sean arrays

```javascript
import { sanitizeStructuredRecipe } from '../utils/ingestSanitizer.js';
const structuredRaw = await analyzeAndStructureRecipe(text, apiKey);
const structured = sanitizeStructuredRecipe(structuredRaw);
```
> **Regla**: Siempre pasar el output del LLM por `sanitizeStructuredRecipe()` antes de crear el registro en DB.

#### Detección de Duplicados (Ingest 409)
Las rutas de ingesta verifican si ya existe una receta con el mismo slug antes de crearla:
```javascript
if (await checkConflict(slug, recipeData, res)) return;
```
Si existe, responde `409 { error, conflict: true, recipe }`. El Telegram Bot usa esta respuesta para ofrecer al usuario actualizar la receta existente.

> **Nota**: Las recetas ingestadas se publican directamente con `status: 'published'` (auto-publicación). Esto es intencional ya que el Telegram Bot es de uso privado y el chef revisa la receta en el mensaje del bot antes de confirmar.

#### Filtrado por Intolerancias y Seguridad Dinámica (RecipeProvider)
`RecipeProvider.getRecipes()` y `normalizeRecipe()` personalizan los resultados según el perfil del usuario:
1. **Buffer de candidatos**: Consulta un buffer de `requestedLimit × 5` recetas de la DB para compensar el filtrado posterior.
2. **Evaluación de Riesgo Dinámico**:
   - Si el usuario tiene **SIBO** (detectado via `profile.conditions`), se respetan los niveles curados (`sibo_risk_level`) de la base de datos.
   - Si NO tiene SIBO, los riesgos de SIBO se ignoran (la receta se marca como `safe` a menos que contenga un trigger de otra alergia activa).
3. **Motor de Seguridad (SecurityScrubber)**: Cruza los ingredientes con `MEDICAL_TRIGGERS` (de `config/medicalTriggers.js`) para cada intolerancia activa y condición clínica.
   - **Búsqueda Robusta**: Se utiliza RexExp con límites de palabra (`(?:^|\s)trigger(?:s|es)?(?:\s|$|[.,;])`) para evitar falsos positivos (como "tuna" disparando "aceitunas") mientras se soporta pluralidad básica (huevo/huevos, atún/atunes).
4. **Tags Personalizados**: Las etiquetas relacionadas con SIBO (ej: "Bajo en Fructanos", "SIBO: Safe") se filtran y ocultan si el usuario no tiene SIBO en su perfil.
5. **Ingredientes Limitados**: Los ingredientes marcados como `isBorderlineSafe` (que requieren revisión) solo muestran su advertencia si el usuario tiene la intolerancia correspondiente (SIBO).
6. **Límite final**: Se aplica el `requestedLimit` sobre el set filtrado y personalizado.

Las intolerancias se incluyen en el hash de cache de Redis para asegurar que la personalización sea consistente y eficiente.

---

### Frontend

#### Jerarquía de Providers (main.tsx)
```
QueryClientProvider (React Query)
  └── AuthProvider (AuthContext)
        └── App
```
> **Nunca** agregar providers directamente en `main.tsx`. Modificar `Providers.tsx` para nuevos providers (wraps `QueryClientProvider`).

#### React Query — Convenciones
```typescript
// Para lectura de datos: useQuery
const { data, isLoading } = useQuery({
  queryKey: ['mi-feature', userId],  // Clave jerárquica
  queryFn: async () => { /* fetch */ },
  enabled: !!userId,                 // Condicional
});

// Para escritura/mutación: useMutation con optimistic update
const mutation = useMutation({
  mutationFn: async (data) => { /* fetch POST/PUT/DELETE */ },
  onMutate: async (data) => {
    await queryClient.cancelQueries({ queryKey: ['mi-feature'] });
    const previous = queryClient.getQueryData(['mi-feature']);
    queryClient.setQueryData(['mi-feature'], /* optimistic data */);
    return { previous };
  },
  onError: (_err, _data, context) => {
    queryClient.setQueryData(['mi-feature'], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['mi-feature'] });
  },
});
```

#### Carpeta para API Calls
- Las llamadas directas a `/api/*` se hacen desde `hooks/` o `api/`.
- **No hacer `fetch()` directamente dentro de componentes.** Siempre encapsular en un hook o en `api/`.
- El token JWT se lee de `localStorage.getItem('wati_jwt')`.
- Las URLs de API son relativas (`/api/...`) — Vite proxy las redirige al backend.

#### Headers y Credenciales
- **`credentials: 'include'`**: Todas las peticiones `fetch` deben incluir esta opción para enviar/recibir cookies `HttpOnly`.
- **`CONFIG.API_URL`**: Siempre usar `CONFIG.API_URL` de `src/config.ts` para construir URLs de API. Esto permite que la app sea agnóstica al entorno (local vs cloud).

#### Resiliencia y Estados de Error
- **Graceful Failures**: No permitas que un fallo de API rompa la UI. Usa `try/catch` en hooks y provee estados de error amigables.
- **Persistent Error Messages**: Asegúrate de que los errores se limpien cuando el usuario inicia una nueva acción (ej: resetear error al cambiar search query).
- **Loading States**: Siempre implementa skeletons o spinners durante transiciones asíncronas.

#### AuthContext — Interface `UserProfile`
```typescript
interface UserProfile {
  id?: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  diet: string;
  intolerances: string[];
  excluded_ingredients: string;
  daily_calories: number;
  severities: Record<string, 'mild' | 'moderate' | 'severe' | 'anaphylactic'>;
  conditions: string[];
  organizationId: string | null; // null para usuarios Wati (sin organización asignada)
  role: 'user' | 'admin' | 'super_admin'; // super_admin: acceso cross-organización
  onboardingComplete: boolean;
  language?: string;
  savedRecipes?: any[];
  createdAt?: string;
  updatedAt?: string;
}
```
> Acceso via `const { user, login, register, logout, updateUserProfile } = useAuth();`
>
> **Nota sobre roles**: Un usuario puede ser `user` en Wati y `admin` en otra app del ecosistema simultáneamente. El `role` en `UserProfile` refleja el rol global del usuario. `super_admin` es reservado para el panel de administración del ecosistema.

#### Administración de Contenido (more-admin)

El panel de administración utiliza patrones avanzados para la gestión eficiente de grandes catálogos:

1. **Mutaciones en Bloque (Bulk Operations)**:
Para optimizar el tráfico, las acciones sobre múltiples elementos deben usar `Promise.all` con mutaciones individuales o endpoints de bulk si existen en el backend.
```typescript
const bulkDeleteMutation = useMutation({
  mutationFn: (ids: string[]) => 
    Promise.all(ids.map(id => api.delete(`/admin/recipes/${id}`))),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
    setSelectedIds([]);
    toast.success(t('recipes.bulk_delete_success'));
  }
});
```

2. **Regeneración de Imágenes AI**:
Permite corregir fallos en la generación original mediante un feedback loop que envía el problema detectado al backend:
```typescript
const refreshImageMutation = useMutation({
  mutationFn: ({ id, issue }: { id: string; issue: string }) => 
    api.post(`/ingest/${id}/refresh-image`, { issue }),
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
    setFormData(prev => ({ ...prev, imageUrl: data.recipe.image_url }));
    toast.success(t('recipes.regenerate_success'));
  }
});
```

3. **Gestión de Tags Globales**:
Los tags se seleccionan por `key` y se filtran dinámicamente. La UI debe mostrar la traducción según el idioma activo (`t('tags.items.${key}')`) pero persistir el `key` único.

4. **Filtros Persistentes**:
El modo de vista (`grid` vs `table`) y filtros de búsqueda deben persistirse en `localStorage` o `URLSearchParams` para mantener el contexto tras recargas.

#### 🛡️ SPA Auth Hardening (Password Managers)
Para evitar crashes en extensiones como **Bitwarden** o **LastPass** durante la navegación rápida post-auth, sigue este patrón en los formularios de login/register:

1. **Hidden Username**: Incluye siempre un input oculto con `name="username"` y `autoComplete="username"` si el campo principal es `email`. Esto evita que la extensión busque recursivamente y falle.
2. **BW Ignore**: Agrega `data-bwignore="true"` al tag `<form>`.
3. **Navigation Delay**: No uses `navigate()` inmediatamente tras el éxito de la API. Usa un `setTimeout` de al menos **150ms** para dar tiempo a que la extensión procese su evento de "submit" interno.

```tsx
// Ejemplo en LoginPage.tsx
<form data-bwignore="true">
  <input type="text" name="username" autoComplete="username" className="hidden" aria-hidden="true" defaultValue={email} />
  {/* ...otros inputs */}
</form>

// En el handler
await login();
setTimeout(() => navigate('/home'), 150);
```

#### Navegación (sin React Router)
La app usa **navegación manual** con `useState` + `history.pushState/popstate`:
```typescript
// Abrir detalle de receta
sessionStorage.setItem(`recipe_${recipe.id}`, JSON.stringify(recipe));
history.pushState({ recipeId: recipe.id }, '');

// Volver (botón back del browser sincronizado)
history.back();
```
> **Si creas una vista nueva**, debes integrar el flujo en `App.tsx` como un nuevo estado y agregar soporte para `popstate`.

#### Tipos TypeScript

**`Recipe`** (`types/recipe.ts`):
```typescript
interface Recipe {
  id: string;
  title: string;
  titleEn?: string;
  imageUrl: string;
  prepTimeMinutes: number;
  estimatedCost: number;
  ingredients: Ingredient[];
  instructions: string[];
  instructionsEn?: string[];
  summary?: string;
  safetyLevel: 'safe' | 'review' | 'unsafe';
  siboAllergiesTags: (Tag | string)[];
}

interface Ingredient {
  id: string;
  name: string;
  nameEn?: string;
  quantity?: string;
  unit?: string;
  unitEn?: string;
  isBorderlineSafe?: boolean;
}

interface Tag { es: string; en: string; }
```

#### IndexedDB (Dexie)
```typescript
// db/db.ts — WatiDB
// Tablas:
//   cachedRecipes: 'id'          — Recetas cacheadas { id, data, timestamp }
//   searchCache:   'query'       — Resultados de búsqueda { query, results: string[], timestamp }
//   medicalMetadata: 'id'        — Triggers médicos { id, data, version, lastUpdated }
//   cachedImages:  'url'         — Imágenes en base64 { url, base64, timestamp }
```
> Si necesitas una nueva tabla, incrementar la versión en `db.ts` y definirla en el nuevo `.version(N).stores({})`.

#### Internacionalización (i18n)
- Archivos: `locales/en.json`, `locales/es.json`
- Agregar toda cadena visible al usuario en **ambos** archivos.
- **Patrón para Recetas (Dynamic Titles)**:
  En el admin y visualización de contenido, se debe usar el idioma activo para elegir qué campo de la base de datos mostrar:
  ```typescript
  const title = activeLang === 'es' ? recipe.title_es : (recipe.title_en || recipe.title_es);
  ```
- **Traducciones UI**: Usar en componentes:
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
// Uso: t('recipes.ui.minutes_suffix')
```
- El idioma se persiste en `localStorage` bajo la clave `wati_language` (Wati) o se gestiona vía estado en `more-admin`.

#### Componentes Reutilizables (ui/)
| Componente | Props principales | Uso |
|---|---|---|
| `Button` | `variant`, `size`, `onClick`, `disabled`, `children` | Botones de acción |
| `Input` | `value`, `onChange`, `placeholder`, `type` | Campos de texto |
| `Badge` | `variant`, `children` | Etiquetas visuales |
| `AuthGuard` | `children`, `fallback?` | Renderiza children solo si autenticado |

#### Estilos y Design System

El ecosistema de aplicaciones utiliza una base compartida de componentes pero con sistemas de diseño diferenciados por aplicación para reflejar sus identidades únicas.

##### Wati (Harmony Palette)
Diseñado para una experiencia de usuario centrada en la salud y la nutrición, utilizando tonos orgánicos y relajantes.

**CSS Variables** (`wati/src/index.css`):
```css
/* Harmony Palette */
--brand-sage: #82A082;
--brand-forest: #1B4332;
--brand-mint: #74C69D;
--brand-teal: #40916C;
--brand-cream: #FDFCF8;
--brand-peach: #FFD8BE;
--brand-celeste: #74C6E6;
--brand-text: #1B2621;
--brand-text-muted: #57635E;

--surface-light: #FFFFFF;
--surface-organic: #F9FBF9;
--surface-dark: #1A2421;

--success: #2D6A4F;
--warning: #FFB703;
--danger: #D62828;
```

**Tailwind Tokens**: `brand-sage`, `brand-forest`, `brand-mint`, `brand-teal`, `brand-cream`, `brand-peach`, `brand-celeste`.

---

##### MORE (Industrial Precision)
Diseñado para el entorno de administración técnica, con un enfoque en la precisión, densidad de datos y control.

**CSS Variables** (`more-admin/src/index.css`):
```css
/* Industrial Precision Palette - STITCH SYNC */
--brand-primary: #00FFC2;
--brand-secondary: #1C2024;
--brand-tertiary: #101417;
--brand-neutral: #83958C;

--brand-text: #E0E2E8;
--brand-text-muted: #B9CBC1;

--surface-light: #272A2E;
--surface-organic: #1C2024;
--surface-dark: #101417;
--surface-lowest: #0B0F12;

--success: #00FFC2;
--warning: #FFB703;
--danger: #F87171;

--outline: #3A4A43;
--outline-strong: #83958C;
```

**Tailwind Tokens**: `brand-primary`, `brand-secondary`, `brand-tertiary`, `brand-neutral`, `brand-text`, `brand-text-muted`.

---

#### Utilidades Compartidas

**Utility Classes Custom**:
- `.glass-organic` — glassmorphism con blur (usa variables de cada app)
- `.bg-organic-gradient` — gradiente principal de la app
- `.hover-lift` — hover: lift + shadow
- `.animate-fade-in` — fadeIn keyframe
- `.text-glow-sage` — text-shadow suave (enfocado en Wati)
- `.text-glow-mint` — text-shadow neon (enfocado en MORE)

**Iconos**: `lucide-react` — importar iconos individuales: `import { Search, Heart } from 'lucide-react';`

**Animaciones (Framer Motion)**:
Wati y More-Admin utilizan `framer-motion` para una experiencia premium y fluida:
- **Staggered Children**: Usar variantes para animar listas de elementos de forma secuencial.
- **AnimatePresence**: Obligatorio para transiciones de salida (modales, elementos eliminados de listas).
- **Layout Animations**: Usar el prop `layout` en elementos que cambian de tamaño o posición para transiciones suaves y automáticas.

```tsx
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { staggerChildren: 0.05 }
  }
};

<motion.div variants={containerVariants} initial="hidden" animate="visible">
  <AnimatePresence mode="wait">
    {isOpen && (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        {content}
      </motion.div>
    )}
  </AnimatePresence>
</motion.div>
```

---

## 📊 Logging & Telemetry (Frontend)

### Unified Facade Pattern
Para evitar acoplamiento con proveedores específicos y unificar la experiencia de desarrollo, Wati utiliza un **patrón Facade** centralizado en `frontend/src/utils/logger.ts`.

**Nunca llames a `console.log` o APIs de proveedores directamente** (ej: `window.umami.track`). En su lugar, usa el singleton `logger`:

```typescript
import { logger } from '../utils/logger';

// 1. Log informativo (solo consola en dev, filtrado en prod)
logger.info('mensaje');

// 2. Telemetría Automática (Convención UPPER_SNAKE_CASE)
// Cualquier log que use UPPER_SNAKE_CASE se mapea automáticamente a un evento de analytics.
logger.info('AUTH_LOGIN_SUCCESS', { method: 'password' });

// 3. Trackeo Explícito (sin log en consola)
logger.track('UI_HOME_CLICK', { source: 'header' });

// 4. Errores
logger.error('Error al cargar datos', error, { originalQuery: q });
```

### Convenciones
- **Naming**: Los eventos de telemetría DEBEN usar `UPPER_SNAKE_CASE` (ej: `SEARCH_SUCCESS`).
- **Decoupling**: La implementación real de analytics reside en `utils/analytics.ts` y es consumida únicamente por el `logger`.

### Eventos Existentes (Normalizados)
| Evento (Normalizado) | Cuándo | Payload |
|---|---|---|
| `SEARCH_SUCCESS` | Búsqueda ≥3 chars con resultados | `{ query, resultsCount }` |
| `SEARCH_FAILED` | Búsqueda ≥3 chars sin resultados | `{ query, resultsCount: 0 }` |
| `FAVORITE_ADD` | Marcar como favorita | `{ title, id }` |
| `FAVORITE_REMOVE` | Quitar de favoritos | `{ title, id }` |
| `CHEF_SUGGEST_SENT` | Sugerir receta al chef | `{ term }` |
| `SAFETY_GATE_SHOWN` | Se muestra un cerrojo por riesgo médico | `{ allergens }` |
| `SAFETY_GATE_OVERRIDE` | El usuario decide "ver riesgo" | `{ allergens }` |
| `SAFETY_GATE_DISMISS` | El usuario rechaza continuar | `{ allergens }` |
| `AUTH_LOGIN_SUCCESS` | Login exitoso | `{ method: 'password' }` |
| `UI_HOME_CLICK` | Navegación al Home | `{ source: 'logo'|'nav' }` |

> **Regla**: Todo feature nuevo debe incluir al menos un evento de tracking descriptivo en `UPPER_SNAKE_CASE`.

### Eventos Backend (ActivityLogger)
| Evento (action) | Cuándo | Metadata |
|---|---|---|
| `SEARCH` | Búsqueda con intolerancias activas | `{ query, filteredByIntolerances, resultsAfterFilter }` |

### Monitoreo de Logs (Dozzle)
El ecosistema incluye **Dozzle** para visualizar logs de contenedores en tiempo real sin usar la terminal.
- **Acceso**: `http://localhost:8080`
- **Uso**: Útil para debugear la comunicación entre `more-admin`, `backend` y el `telegram-bot` simultáneamente.
- **Seguridad**: Requiere autenticación definida en `users.yml`.

### Analytics (Umami)
Se utiliza Umami para el trackeo de eventos de usuario sin cookies invasivas.
- **Acceso Panel**: `http://localhost:3000` (o `https://analytics.localhost` si está configurado el proxy).
- **Credenciales Default**: `admin` / `umami`.
- **Setup**: El `WEBSITE_ID` debe estar configurado en el `.env` y en el `index.html` del frontend.
- **Base de Datos**: Umami utiliza su propia base de datos `umami_db` dentro del mismo contenedor de PostgreSQL.

### Infraestructura Local (Resumen)
- **Redis**: Se utiliza como caché de segundo nivel para recetas procesadas y resultados de búsqueda. Si Redis falla, el sistema degrada automáticamente a consultas directas a la base de datos (resiliencia pasiva).
- **Dozzle**: Permite monitoreo multi-contenedor. Especialmente útil para depurar el flujo: `Telegram Bot -> Backend -> More Admin`.

---

## 🧪 Testing

### Backend
- **Framework**: Vitest (environment: `node`)
- **Ejecutar**: `cd backend && npm test` / `npm run coverage`
- **Ubicación**: Tests colocados junto al archivo que testean (`*.test.js`) o en `backend/tests/`.
- **Mocks**: Para tests que dependen de DB/Redis, mockear los módulos:
```javascript
vi.mock('../config/database.js', () => ({
  sequelize: { define: vi.fn() }
}));
```

### Frontend
- **Framework**: Vitest + React Testing Library (environment: `happy-dom`)
- **Ejecutar**: `cd frontend && npm test`
- **Setup**: `src/test/setup.ts` importa `@testing-library/jest-dom`
- **Ubicación**: Tests junto al archivo (`*.test.ts`, `*.test.tsx`)
- **Patrón**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('MiComponente', () => {
  it('debería renderizar correctamente', () => {
    render(<MiComponente />);
    expect(screen.getByText('texto')).toBeInTheDocument();
  });
});
```

---

## 🛡️ Checklist de Seguridad y Calidad

- [ ] ¿Los campos de entrada están validados con Zod?
- [ ] ¿Se usa `req.validatedQuery` o `parseResult.data` validado?
- [ ] ¿La ruta tiene el middleware de auth correcto (`authenticateToken` o `requireAdminKey`)?
- [ ] ¿El fetch del frontend incluye `credentials: 'include'`?
- [ ] ¿Se están exponiendo secretos en los logs o respuestas? (Nunca lo hagas)
- [ ] ¿El componente de React es responsivo (mobile-first)?
- [ ] ¿Se agregó el evento de tracking en Umami?
- [ ] ¿Se validaron las URLs externas contra la whitelist de `config/resiliency.js` (SSRF protection)?
- [ ] ¿Se implementaron reintentos con exponencial backoff para peticiones externas críticas?
- [ ] ¿Se creó la migración de base de datos si aplica?
- [ ] ¿Se agregaron las traducciones i18n en ambos archivos (en.json, es.json)?
- [ ] ¿Se escribieron tests unitarios (TDD)?
- [ ] ¿El hook encapsula toda la lógica de fetch/estado?
- [ ] ¿Se implementaron optimistic updates en las mutaciones?
- [ ] ¿Los nuevos valores de ENUM se agregaron tanto en la migración como en el modelo?
- [ ] **Resiliencia**: ¿Se manejaron adecuadamente los estados de carga y error persistente?
- [ ] **Config**: ¿Se usó `CONFIG.API_URL` en lugar de strings hardcodeados?

---

### 🔌 Servicios y Puertos (Localhost)

| Servicio | Puerto | Descripción |
|---|---|---|
| **Nginx** | `80/443` | Reverse Proxy principal (Entry point) |
| **Frontend (Wati)** | `5173` | App B2C (React + Vite) |
| **More Admin** | `5174` | Portal de administración B2B |
| **Backend** | `5001` | API principal (Express 5) |
| **PostgreSQL** | `5432` | Base de datos principal |
| **Redis** | `6379` | Caché de recetas y sesiones |
| **Umami** | `3000` | Panel de Analytics |
| **Dozzle** | `8080` | Visor de logs en tiempo real |

### 🛠️ Comandos de Desarrollo (Docker)

> ⚠️ **Los comandos Docker son cross-platform.** Sin embargo, asegúrate de estar en la raíz del proyecto.

```bash
# 🚀 Levantar todo el entorno (Recomendado)
docker compose up -d --build

# 🔄 Reiniciar un servicio específico (ej: backend)
docker compose restart backend

# 📝 Ver logs en tiempo real (vía terminal)
docker compose logs -f [servicio]

# 🗄️ Database: Correr migraciones
docker compose exec backend npx sequelize-cli db:migrate

# 🗄️ Database: Revertir última migración
docker compose exec backend npx sequelize-cli db:migrate:undo

# 🐳 Limpiar todo (detener + borrar volúmenes)
# ADVERTENCIA: Esto borrará la base de datos si no usas volúmenes externos.
docker compose down -v
```

### ⚡ AI Worker (BullMQ)

El worker AI es un proceso Node.js separado que consume la cola de jobs pesados. **Debe ejecutarse en paralelo al servidor Express.**

```bash
# Desarrollo (auto-restart con --watch)
cd backend
npm run worker:dev

# Producción
npm run worker

# En Docker Compose, agregar como segundo servicio apuntando al mismo image:
#   ai-worker:
#     build: ./backend
#     command: node worker.js
#     depends_on: [redis, postgres]
```

### Bash / zsh (Linux / macOS)
```bash
# Tests
cd frontend && npm test
cd backend && npm run coverage

# Filtrar logs
docker compose logs --tail=50 backend | grep "DEBUG"

# Encadenar comandos
curl -s http://localhost:5001/api/status && echo "OK"
```

### PowerShell (Windows)
```powershell
# Tests
cd frontend; npm test
cd backend; npm run coverage

# Filtrar logs
docker compose logs --tail=50 backend | Select-String "DEBUG"

# Encadenar comandos
curl -s http://localhost:5001/api/status; Write-Host "OK"
```

---

*Esta guía es dinámica. Si encuentras un patrón mejor, actualiza este documento.*
