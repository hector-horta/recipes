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
- **Proxy Inteligente con Spoonacular**: El backend protege las llaves de terceros e inyecta dinámicamente las restricciones médicas del usuario antes de lanzar la búsqueda (p. ej. Mapeo transparente de SIBO a dietas permitidas).
- **Sistema de Caché Optimizada (Redis)**: Un TTL inteligente de 15 minutos en el backend cachea peticiones repetidas a Spoonacular, salvaguardando presupuestos y reduciendo la latencia espectacularmente.

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (Glassmorphism & Componentes Nativos)
- **Vitest** (Test Unitarios)
- Autenticación asíncrona mediante Context API & LocalStorage JWT.

### Backend e Infraestructura
- **Node.js** + **Express**
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

# Claves Secretas
SPOONACULAR_KEY=tu_api_key_aqui
JWT_SECRET=tu_secreto_impenetrable_aqui

# Conexiones de Base de Datos
DATABASE_URL=postgres://wati_user:wati_password@postgres:5432/wati_db
REDIS_URL=redis://redis:6379
```

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
npm test

# Backend (Requiere tener servicios corriendo si hay tests de integración)
cd backend
npm install
npm run coverage
```

---
**Wati** — *Seguridad alimentaria impulsada por IA, ahora multicapa.*
