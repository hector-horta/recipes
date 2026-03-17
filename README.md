# Wati: Nutrición Consciente y Seguridad Médica

Wati es una aplicación web progresiva (PWA) de recetas diseñada para usuarios con necesidades dietéticas específicas (FODMAPs, alergias, sensibilidades). A diferencia de otras aplicaciones de cocina, Wati prioriza la **seguridad médica** y la **privacidad extrema** mediante protocolos de cifrado y análisis de riesgo en tiempo real.

## 🌟 Características Principales

- **Dual-Mode API**: Funciona en modo `MOCK` (desarrollo rápido, sin costo) o `LIVE` (datos reales de Spoonacular).
- **Security Scrubber**: Motor de análisis que escanea ingredientes y pasos de preparación contra tu perfil personal.
- **Local-First & Offline**: Navegación completa sin internet gracias a Service Workers y almacenamiento local en IndexedDB (Dexie).
- **Privacidad Grado Médico**: Perfiles de salud cifrados localmente con AES-256 (CryptoJS) para que tus datos nunca salgan de tu dispositivo.
- **Sincronización Dinámica**: Actualización automática de la base de datos de alérgenos y FODMAPs en cada inicio.

## 🛠️ Tecnologías y Dependencias

La aplicación está construida con el stack más moderno de desarrollo web:

- **Core**: [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Diseño premium con Glassmorphism)
- **Base de Datos**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Seguridad**:
  - [CryptoJS](https://cryptojs.gitbook.io/docs/): Cifrado de perfiles.
  - [DOMPurify](https://github.com/cure53/dompurify): Sanitización de entradas.
- **Iconografía**: [Lucide React](https://lucide.dev/)

## 🚀 Instalación y Uso

### 1. Clonar el repositorio e instalar dependencias
```bash
npm install
```

### 2. Configuración del Entorno
Crea un archivo `.env` en la raíz del proyecto (o edita el existente):
```env
# Tu llave de Spoonacular API
VITE_SPOONACULAR_KEY=tu_api_key_aqui

# Modo de funcionamiento: MOCK o LIVE
VITE_API_MODE=MOCK
```

### 3. Ejecutar en Desarrollo
```bash
npm run dev
```

## 🏗️ Estructura del Proyecto

- `/src/api`: Lógica de comunicación con Spoonacular, Privacy Proxy y Medical Registry.
- `/src/security`: Motor de cifrado y Security Scrubber.
- `/src/db`: Esquemas de base de datos local (Dexie).
- `/src/pages`: Vistas principales (Lista de recetas, detalles, onboarding).
- `/public`: Service Worker (`sw.js`) para soporte offline.

---
**Wati** — *Cuidando tu salud, ingrediente por ingrediente.*
