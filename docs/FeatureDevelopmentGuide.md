# 🛠️ Wati: Guía de Desarrollo de Features

> **Propósito**: Este archivo es la **referencia principal y autocontenida** para desarrollar nuevas funcionalidades en el ecosistema Wati. Contiene toda la estructura del proyecto, esquemas, convenciones y patrones necesarios para que un agente de IA (o un desarrollador) pueda comenzar a trabajar **sin necesidad de explorar el codebase**.

---

## 🤖 Instrucciones para Agentes

Al desarrollar en este repositorio:

0. **🖥️ Detectar el sistema operativo ANTES de ejecutar cualquier comando de terminal.** Verifica si estás en Windows (PowerShell), macOS (zsh/bash) o Linux (bash) consultando los metadatos del usuario o ejecutando un comando de detección. Esto es **obligatorio** para evitar gastar tokens en comandos incompatibles. Referencia rápida:
   | Acción | Bash / zsh (Linux/macOS) | PowerShell (Windows) |
   |---|---|---|
   | Filtrar texto en output | `comando \| grep "texto"` | `comando \| Select-String "texto"` |
   | Encadenar comandos | `cmd1 && cmd2` | `cmd1; cmd2` |
   | Redireccionar a nulo | `> /dev/null` | `> $null` |
   | Variable de entorno inline | `VAR=value command` | `$env:VAR='value'; command` |
   | Listar archivos recursivo | `find . -name "*.js"` | `Get-ChildItem -Recurse -Filter "*.js"` |
   | Ver contenido de archivo | `cat archivo` | `Get-Content archivo` |
   | Eliminar archivo | `rm archivo` | `Remove-Item archivo` |
   | Consultar DB en Docker | `docker compose exec postgres psql -U user -d db -c "SQL"` | Igual (Docker CLI es cross-platform) |

1. Aplica **Test Driven Development (TDD)** de forma estricta — escribe los tests primero.
2. Sigue siempre este flujo: `Database → Backend (Model/Route) → Frontend (API/Hook/UI) → Analytics → Verification`.
3. **No es necesario explorar la estructura de carpetas** — toda la información relevante ya está documentada aquí.
4. Si un feature no requiere persistencia, saltar el paso de Database.
5. Todo texto visible al usuario debe soportar **i18n** (español e inglés).
6. **Mantener esta guía actualizada**: Al finalizar un feature nuevo o la corrección de un bug, **actualizar este archivo** si el cambio afectó la estructura de carpetas, esquemas de DB, endpoints, patrones, convenciones, componentes reutilizables, tipos TypeScript, eventos de analytics, o cualquier otra sección documentada aquí. Esta guía es la fuente de verdad — si no se actualiza, el próximo agente trabajará con información obsoleta.
7. **Scratch scripts**: Los scripts en `backend/scratch/` son efímeros, para verificar funcionalidad durante desarrollo sin desplegar todo el sitio. **Deben eliminarse antes de hacer commit.** La carpeta está en `.gitignore` y no debe entrar al repositorio.

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
│   │   ├── config.cjs            # Sequelize CLI config (CommonJS requerido por CLI)
│   │   ├── database.js           # Sequelize instance + connectDB()
│   │   ├── redis.js              # Redis client + connectRedis()
│   │   ├── medical.js            # INTOLERANCE_CATALOG + MEDICAL_TRIGGERS (fuente de verdad unificada)
│   │   └── vault.js              # HCP Vault OAuth2 client
│   ├── models/
│   │   ├── User.js
│   │   ├── Profile.js            # Asociaciones: User.hasOne(Profile), Profile.belongsTo(User)
│   │   ├── FavoriteRecipe.js     # Asociaciones: User.hasMany(FavoriteRecipe)
│   │   ├── Recipe.js
│   │   ├── SearchLog.js
│   │   ├── ActivityLog.js
│   │   └── validators.js         # Schemas Zod (recipeQuerySchema)
│   ├── middleware/
│   │   ├── auth.js               # authenticateToken, optionalAuthenticateToken
│   │   ├── validate.js           # validateQuery(zodSchema) → req.validatedQuery
│   │   └── recoveryLogger.js     # recoveryLogger (middleware), saveIngestLog (function)
│   ├── routes/
│   │   ├── auth.js               # /api/auth/*
│   │   ├── favorites.js          # /api/favorites/*
│   │   ├── ingest.js             # /api/ingest/* (Telegram Bot ingestion)
│   │   ├── suggestions.js        # /api/suggestions/*
│   │   └── admin.js              # /admin/*
│   ├── services/
│   │   ├── ActivityLogger.js     # Telemetría + alertas Telegram (fire-and-forget)
│   │   ├── RecipeProvider.js     # Búsqueda en DB + caché Redis + filtrado por intolerancias
│   │   ├── NvidiaNIM.js          # OCR (Llama 4), estructurar recetas, generar imágenes (SDXL)
│   │   └── GroqWhisper.js        # Transcripción de audio
│   ├── utils/
│   │   ├── tagTranslations.js    # TAG_TRANSLATIONS map, normalizeTag(), normalizeTags()
│   │   ├── ingestSanitizer.js    # sanitizeStructuredRecipe() — mapea output LLM a ENUMs/tipos DB
│   │   ├── regenerateAllImages.js
│   │   └── regenerateSpecificImages.js
│   ├── migrations/               # Sequelize CLI migrations (.cjs)
│   ├── seeders/
│   ├── tests/
│   ├── scratch/                  # ⚠️ Scripts temporales de debug — NO COMMITEAR (en .gitignore)
│   ├── public/recipes/           # Imágenes estáticas de recetas (servido por Express)
│   └── ingest_logs/              # Recovery logs de ingesta (JSON)
│
├── frontend/
│   ├── index.html                # SPA entry (Umami script tag aquí)
│   ├── package.json              # type: "module" (ESM)
│   ├── vite.config.ts            # Proxy: /api → backend:5001, /public → backend:5001
│   ├── vitest.config.ts          # Test: environment: 'happy-dom', setup: src/test/setup.ts
│   ├── tailwind.config.js        # Colores brand-* mapeados a CSS variables
│   ├── postcss.config.js
│   ├── pre-start.js              # Validación pre-build
│   └── src/
│       ├── main.tsx              # ReactDOM root: Providers → AuthProvider → App
│       ├── App.tsx               # Router manual: RecipePage ↔ RecipeDetailPage + Modals
│       ├── AuthContext.tsx        # AuthProvider, useAuth(), UserProfile interface
│       ├── i18n.ts               # i18next config (es/en, localStorage: wati_language)
│       ├── index.css             # CSS variables + Tailwind utilities (glassmorphism, etc.)
│       ├── api/
│       │   ├── PrivacyProxy.ts   # SecureAPI.fetchSafeRecipes(), InputSanitizer.clean()
│       │   ├── MedicalRegistry.ts# MedicalRegistry.syncTriggers(), .getLatestTriggers()
│       │   └── SecurityScrubber.ts# SecurityScrubber.initialize(), .analyze(recipe, profile)
│       ├── security/
│       │   └── SecureVault.ts    # AES-256 encrypt/decrypt perfil médico en localStorage
│       ├── types/
│       │   └── recipe.ts         # Recipe, Ingredient, Tag interfaces
│       ├── db/
│       │   └── db.ts             # Dexie (IndexedDB): WatiDB — tablas: cachedRecipes, searchCache, medicalMetadata, cachedImages
│       ├── lib/
│       │   └── queryClient.ts    # React Query client (staleTime: 5min, gcTime: 30min)
│       ├── hooks/
│       │   ├── useWatiSearch.ts  # Búsqueda principal con debounce y React Query
│       │   ├── useFavorites.ts   # CRUD favoritos con optimistic updates
│       │   ├── useMergedDisplayRecipes.ts # Merge favoritos + recetas con paginación
│       │   ├── useSearchFeedback.ts      # Sugerir al chef (POST /api/suggestions)
│       │   ├── useDebounce.ts    # Debounce genérico
│       │   └── useCachedImage.ts # Lazy load imágenes desde IndexedDB cache
│       ├── components/
│       │   ├── Providers.tsx     # QueryClientProvider wrapper
│       │   ├── LoginModal.tsx    # Modal de login/register
│       │   ├── OnboardingModal.tsx# Configuración médica post-registro
│       │   ├── RecipeCard.tsx    # Tarjeta de receta individual
│       │   ├── LanguageSelector.tsx
│       │   ├── WatiLogo.tsx      # SVG Logo
│       │   ├── WatiFavicon.tsx   # SVG Favicon
│       │   ├── auth/
│       │   │   └── AuthGuard.tsx # HOC: renderiza children solo si user autenticado
│       │   ├── recipe/
│       │   │   ├── TopNav.tsx    # Navbar superior (hamburguesa mobile)
│       │   │   ├── PageHeader.tsx# Header con búsqueda, refresh, indicadores
│       │   │   ├── PageLayout.tsx# Layout wrapper
│       │   │   ├── RecipeGrid.tsx# Grid de RecipeCards con skeletons
│       │   │   ├── SearchFeedback.tsx # UI cuando búsqueda no tiene resultados
│       │   │   └── Pagination.tsx# Paginación para favoritos
│       │   └── ui/
│       │       ├── Badge.tsx     # Componente Badge reutilizable
│       │       ├── Button.tsx    # Componente Button reutilizable
│       │       └── Input.tsx     # Componente Input reutilizable
│       ├── pages/
│       │   ├── RecipePage.tsx    # Vista principal: grid de recetas
│       │   ├── RecipeDetailPage.tsx # Vista detalle de receta
│       │   ├── LoginPage.tsx     # Página de login (alternativa al modal)
│       │   └── OnboardingPage.tsx# Página de onboarding (alternativa al modal)
│       ├── utils/
│       │   └── imageCache.ts    # cacheImage(), getCachedImage(), cacheRecipeImages()
│       ├── locales/
│       │   ├── en.json          # Traducciones inglés
│       │   └── es.json          # Traducciones español
│       └── test/
│           └── setup.ts         # Import @testing-library/jest-dom
│
├── telegram-bot/                 # Bot de ingesta de recetas
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
| `accepted_terms_at` | DATE | NOT NULL |
| `data_exported_at` | DATE | nullable |
| `created_at` | DATE | auto |
| `updated_at` | DATE | auto |

### `profiles`
| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users(id), ON DELETE CASCADE |
| `diet` | ENUM('None','Vegan','Vegetarian','Keto','Paleo','SIBO') | default: 'None' |
| `intolerances` | JSONB | default: [] |
| `excluded_ingredients` | TEXT | nullable, default: '' |
| `daily_calories` | INTEGER | nullable, default: 2000 |
| `onboarding_completed` | BOOLEAN | default: false |
| `language` | STRING(5) | default: 'en' |

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

### Rutas Registradas en `server.js`

| Prefix | Router File | Auth |
|---|---|---|
| `/api/auth` | `routes/auth.js` | Mixto |
| `/api/favorites` | `routes/favorites.js` | authenticateToken |
| `/api/ingest` | `routes/ingest.js` | Mixto |
| `/admin` | `routes/admin.js` | Mixto |
| `/api/suggestions` | `routes/suggestions.js` | Público |

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

#### Autenticación y Sesión
- **HttpOnly Cookies**: Wati usa JWT persistidos en cookies `HttpOnly` (Lax, Secure en producción). Esto protege contra robo de sesión vía XSS.
- **`authenticateToken`**: Valida el JWT de la cookie. Rechaza con 401/403. Setea `req.user`.
- **`optionalAuthenticateToken`**: Intenta validar si existe cookie. Si no, continúa sin `req.user`.
- **`requireAdminKey`**: Middleware para rutas críticas (ingesta, admin). Verifica el header `X-Admin-Key` contra `config.ADMIN_API_KEY`.

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
   - Si el usuario tiene **SIBO**, se respetan los niveles curados (`sibo_risk_level`) de la base de datos.
   - Si NO tiene SIBO, los riesgos de SIBO se ignoran (la receta se marca como `safe` a menos que contenga un trigger de otra alergia activa).
3. **Activadores Médicos (Triggers)**: Cruza los ingredientes con `MEDICAL_TRIGGERS` (de `config/medicalTriggers.js`) para cada intolerancia activa.
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
- **Tokens**: No es necesario leer el token de `localStorage` para las peticiones API; el navegador lo incluye automáticamente en las cookies.

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
  onboardingComplete: boolean;
  language?: string;
  savedRecipes?: any[];
  createdAt?: string;
  updatedAt?: string;
}
```
> Acceso via `const { user, login, register, logout, updateUserProfile } = useAuth();`

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
- Usar en componentes:
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
// Uso: t('seccion.clave')
```
- El idioma se persiste en `localStorage` bajo la clave `wati_language`.

#### Componentes Reutilizables (ui/)
| Componente | Props principales | Uso |
|---|---|---|
| `Button` | `variant`, `size`, `onClick`, `disabled`, `children` | Botones de acción |
| `Input` | `value`, `onChange`, `placeholder`, `type` | Campos de texto |
| `Badge` | `variant`, `children` | Etiquetas visuales |
| `AuthGuard` | `children`, `fallback?` | Renderiza children solo si autenticado |

#### Estilos y Design System

**CSS Variables** (definidas en `index.css`):
```css
--brand-sage: #82A082;
--brand-forest: #1B4332;
--brand-mint: #74C69D;
--brand-teal: #40916C;
--brand-cream: #FDFCF8;
--brand-peach: #FFD8BE;
--brand-celeste: #74C6E6;
--brand-text: #1B2621;
--brand-text-muted: #57635E;

--success: #2D6A4F;
--warning: #FFB703;
--danger: #D62828;

--glass-bg: rgba(26, 36, 33, 0.85);
--glass-border: rgba(255, 255, 255, 0.1);
```

**Tailwind Custom Tokens** (`tailwind.config.js`):
Todas las brand colors están como `brand-sage`, `brand-forest`, `brand-mint`, `brand-teal`, `brand-cream`, `brand-peach`, `brand-celeste`, `brand-text`, `brand-text-muted`.

**Utility Classes Custom**:
- `.glass-organic` — glassmorphism con blur
- `.bg-organic-gradient` — gradiente sage → teal
- `.hover-lift` — hover: lift + shadow
- `.animate-fade-in` — fadeIn keyframe
- `.text-glow-sage` — text-shadow verde suave

**Iconos**: `lucide-react` — importar iconos individuales: `import { Search, Heart } from 'lucide-react';`

---

## 📊 Analytics

### Frontend (Browser) - Abstracción Agnóstica
Para evitar un acoplamiento fuerte con proveedores de analytics específicos (como Umami, PostHog, o Google Analytics), Wati utiliza un **patrón Facade**.
**Nunca llames a la API del proveedor directamente** en los componentes (por ejemplo, nunca uses `window.umami.track`). En su lugar, siempre importa y utiliza la abstracción global `trackEvent`:

```typescript
import { trackEvent } from '../utils/analytics';

// Uso
trackEvent('event_name', { key: 'value' });
```
> Si deseas agregar o cambiar el proveedor de analytics, sólo debes modificar la función en `frontend/src/utils/analytics.ts`.

### Eventos Existentes
| Evento | Cuándo | Payload |
|---|---|---|
| `search_success` | Búsqueda ≥3 chars con resultados | `{ query, resultsCount }` |
| `search_failed` | Búsqueda ≥3 chars sin resultados | `{ query, resultsCount: 0 }` |
| `recipe_favorited` | Marcar como favorita | `{ title, id }` |
| `recipe_unfavorited` | Quitar de favoritos | `{ title, id }` |
| `suggest_to_chef` | Sugerir receta al chef | `{ term }` |
| `safety_gate_shown` | Se muestra un cerrojo por severidad | `{ query, filteredCount, allergens }` |
| `safety_gate_override` | El usuario decide "ver riesgo" | `{ query, filteredCount, allergens }` |
| `safety_gate_dismissed` | El usuario rechaza continuar | `{ query, filteredCount, allergens }` |

> **Regla**: Todo feature nuevo debe incluir al menos un evento de tracking.

### Eventos Backend (ActivityLogger)
| Evento (action) | Cuándo | Metadata |
|---|---|---|
| `SEARCH` | Búsqueda con intolerancias activas | `{ query, filteredByIntolerances, resultsAfterFilter }` |

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
- [ ] ¿Se creó la migración de base de datos si aplica?
- [ ] ¿Se agregaron las traducciones i18n en ambos archivos (en.json, es.json)?
- [ ] ¿Se escribieron tests unitarios (TDD)?
- [ ] ¿El hook encapsula toda la lógica de fetch/estado?
- [ ] ¿Se implementaron optimistic updates en las mutaciones?
- [ ] ¿Los nuevos valores de ENUM se agregaron tanto en la migración como en el modelo?

---

## 🐳 Comandos de Desarrollo

> ⚠️ **Los comandos Docker (`docker compose ...`) son cross-platform.** Los comandos de shell (filtrado, encadenamiento) varían según el OS. Ver tabla en la sección de instrucciones para agentes.

### Docker (cross-platform)
```bash
# Levantar todo el entorno
docker compose up -d --build

# Ejecutar migraciones
docker compose exec backend npx sequelize-cli db:migrate

# Revertir última migración
docker compose exec backend npx sequelize-cli db:migrate:undo

# Generar nueva migración
docker compose exec backend npx sequelize-cli migration:generate --name descripcion-del-cambio

# Ver logs (filtrar por servicio)
docker compose logs -f backend
docker compose logs -f frontend

# Consultar DB
docker compose exec postgres psql -U wati_user -d wati_db -c "SELECT ..."
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
