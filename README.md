# Wati: Nutrición Consciente (Monorepo)

Wati es una plataforma de recetas diseñada para usuarios con necesidades dietéticas específicas (FODMAPs, alergias, sensibilidades). Esta versión ha evolucionado a una **arquitectura de microservicios** gestionada en un **Monorepo**.

## 🏗️ Estructura del Proyecto

El proyecto se divide en dos grandes bloques:

- **`/frontend`**: Aplicación Single Page Application (SPA) construida con **Vite + React + TypeScript**. Gestiona la interfaz de usuario, el cifrado local (AES-256) y la persistencia en IndexedDB.
- **`/backend`**: Microservicio en **Node.js + Express**. Actúa como un proxy seguro para APIs externas (Spoonacular) y maneja la lógica de servidor centralizada.
- **Raíz**: Contenedores globales, configuración de orquestación y documentación.

## 🌟 Características Principales

- **Arquitectura de Microservicios**: Frontend y Backend desacoplados.
- **Secure Proxy**: El backend mitiga riesgos de exposición de llaves de API filtrando peticiones desde el cliente.
- **Dual-Mode API**: Funciona en modo `MOCK` o `LIVE` (Spoonacular) dinámicamente.
- **Privacidad Extrema**: Perfiles de salud cifrados localmente; el backend nunca almacena datos sensibles del usuario.
- **Local-First**: Persistencia con Dexie.js para funcionamiento offline.

## 🛠️ Tecnologías

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (Glassmorphism UI)
- **Dexie.js** (IndexedDB)
- **CryptoJS** & **DOMPurify**

### Backend
- **Node.js** + **Express**
- **CORS** (Configurado para el origen del frontend)
- **Dotenv**

## 🚀 Instalación y Uso (Docker Compose)

La forma recomendada de ejecutar el proyecto es mediante **Docker Compose**, que levanta ambos servicios y configura la red interna automáticamente.

### 1. Requisitos
- Docker y Docker Compose instalados.

### 2. Configuración
Crea un archivo `.env` en la raíz (opcional, el `docker-compose.yml` tiene valores por defecto):
```env
VITE_SPOONACULAR_KEY=tu_api_key
VITE_API_MODE=MOCK
```

### 3. Levantar la plataforma
```bash
docker compose up --build
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api/status](http://localhost:5000/api/status)

## 🧪 Desarrollo y Pruebas

### Frontend
Para ejecutar o probar solo el frontend localmente:
```bash
cd frontend
npm install
npm run dev
npm run test      # Suite de pruebas unitarias (Vitest)
npm run coverage  # Reporte de cobertura
```

### Backend
Para el servidor de desarrollo:
```bash
cd backend
npm install
npm run dev
```

---
**Wati** — *Cuidando tu salud, ingrediente por ingrediente.*

