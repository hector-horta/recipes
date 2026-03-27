# Wati: Nutrición Consciente (Monorepo)

Wati es una plataforma de recetas diseñada para usuarios con necesidades dietéticas específicas (FODMAPs, alergias, sensibilidades). Esta versión ha evolucionado a una **Arquitectura Multi-Usuario Cloud-Ready** gestionada en un **Monorepo**, con altos estándares de seguridad y cumplimiento **GDPR**.

## 🏗️ Estructura del Proyecto

El proyecto se divide en diferentes servicios orquestados:

- **`/frontend`**: Aplicación Single Page Application (SPA) construida con **Vite + React + TypeScript**. Gestiona la interfaz de usuario, perfiles de salud y consumo seguro por JWT.
- **`/backend`**: Microservicio central en **Node.js + Express**. Actúa como motor de reglas de negocio, proxy inteligente (con inyección de dietas), gestión de usuarios y caché.
- **Almacenamiento (PostgreSQL & Redis)**: Persistencia relacional segura e In-Memory Database para performance y protección de cotas de APIs externas.

## 🌟 Características Principales

- **Privacidad y Cumplimiento GDPR**: Perfiles de salud encriptados en base de datos. Completo flujo legal de aceptación de términos y endpoint `DELETE /api/auth/me` con borrado en Cascada garantizando el Derecho al Olvido.
- **Autenticación Segura (JWT & Bcrypt)**: Cuentas individuales únicas identificadas mediante **UUID v4** en PostgreSQL. Contraseñas protegidas mediante algoritmos de encriptado salt.
- **Proxy Inteligente con Spoonacular**: El backend protege las llaves de terceros e inyecta dinámicamente las restricciones médicas del usuario antes de lanzar la búsqueda. El filtro `Low FODMAP` **solo se aplica si el usuario tiene SIBO activo en su perfil** — nunca se impone por defecto.
- **Sistema de Caché Optimizada (Redis & IndexedDB)**: Un TTL inteligente de 15 minutos en el backend protege Spoonacular. En el frontend, un motor de búsqueda indexado mediante **Dexie (IndexedDB)** persistente (`searchCache`) garantiza resultados instantáneos y consistentes, incluso con términos de búsqueda que se solapan.
- **Persistencia de Navegación**: El estado de búsqueda y los resultados se mantienen vivos al navegar entre el listado y el detalle de las recetas, mejorando drásticamente la experiencia de usuario (UX).
- **Deduplicación de Contenido**: Motor inteligente que asegura que las recetas favoritas no aparezcan repetidas en las recomendaciones del día.

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (Glassmorphism & Componentes Nativos)
- **Vitest** (Test Unitarios)
- Autenticación asíncrona mediante Context API & LocalStorage JWT.

### Backend e Infraestructura
- **Node.js** + **Express 5** (compatible con `req.validatedQuery` — `req.query` es inmutable en Express 5)
- **Zod** (validación de parámetros de entrada en middleware)
- **PostgreSQL 15** + **Sequelize CLI** (Gestión de Modelos & Migraciones)
- **Redis 7** (In-Memory Data Store)
- **JSON Web Tokens (JWT)** & **Bcryptjs** (Seguridad)
- **Cors** & **Dotenv**
- Despliegue empaquetado 100% sobre **Docker Desktop** / **Docker Compose**.

## 🚀 Instalación y Uso (Docker Compose)

La plataforma corre sobre múltiples contenedores aislados. Sólo necesitas Docker.

### 1. Requisitos
- [Docker](https://www.docker.com/) y Docker Compose instalados.

### 2. Variables de Entorno
Asegúrate de tener configurado tu archivo `.env` en la raíz (o que los valores del `.env.example` estén definidos). 

```env
# Puertos y Comunicación
PORT=5001
VITE_API_URL=http://localhost:5001

# Modo de Operación del Frontend
# MOCK = datos locales (sin clave Spoonacular), LIVE = API real
VITE_API_MODE=LIVE

# Claves Secretas
SPOONACULAR_KEY=tu_api_key_aqui
JWT_SECRET=tu_secreto_impenetrable_aqui

# Conexiones de Base de Datos
DATABASE_URL=postgres://wati_user:wati_password@postgres:5432/wati_db
REDIS_URL=redis://redis:6379
```

> **Importante:** Tras cambiar `VITE_API_MODE` en `.env`, debes recrear los contenedores con `docker compose up -d` (no solo reiniciarlos) para que la variable se propague correctamente.

### 3. Levantar la Plataforma
En la carpeta raíz del proyecto, construye las imágenes y lanza la flota de contenedores en "detached mode":
```bash
docker compose up -d --build
```

### 4. Inicializar la Base de Datos (Migraciones)
Una vez que el backend esté corriendo, **es obligatorio crear las tablas de PostgreSQL**. Ejecuta el Sequelize CLI directo en el contenedor para propagar las 3 migraciones (`users`, `profiles`, `favorite_recipes`):
```bash
docker compose exec backend npx sequelize-cli db:migrate
```

*Nota: Ante cualquier error extraño en `node_modules` tras actualizar pull requests, puedes usar el comando destructivo temporal `docker compose rm -f -s -v backend` y volver a levantar.*

## 🧪 Desarrollo y Pruebas

### Pruebas Automatizadas (Frontend & Backend)
El frontend cuenta con suites exhaustivas de inyección Médica (SecurityScrubber) testeados bajo Vitest, y el Backend igualmente configurado:

```bash
# Frontend
cd frontend
npm install
npm test           # Ejecutar tests unitarios
npm run coverage   # Generar informe de cobertura (Capa Médica & PrivacyProxy)

# Backend (Requiere tener servicios corriendo si hay tests de integración)
cd backend
npm install
npm run coverage
```

---
**Wati** — *Seguridad alimentaria impulsada por IA, ahora multicapa.*

## 📝 Notas de Arquitectura

- **Filtro de recetas**: En modo LIVE, el frontend solicita **15 recetas** cuando el usuario está autenticado (10 para anónimos) y aplica filtros de seguridad local, garantizando exactamente 10 resultados visibles.
- **Filtro SIBO/Low FODMAP**: El parámetro `diet=Low FODMAP` solo se envía a Spoonacular si el perfil del usuario incluye `SIBO` en `conditions`. Nunca se aplica por defecto.
- **Compatibilidad Express 5**: El middleware de validación usa `req.validatedQuery` en lugar de mutar `req.query`, que es de solo lectura en Express 5.
- **Modo MOCK vs LIVE**: Controlado exclusivamente por `VITE_API_MODE` en `.env`. Los cambios requieren recrear los contenedores Docker.
