# Refactorización de Código — Fase 1: Rutas y Controladores del Backend

> **Objetivo**: Reducir el tamaño de las rutas del backend que superan el límite estricto de **150 líneas de código (LOC)**, modularizando la lógica y abstrayéndola a servicios o helpers.

---

## Archivos a Refactorizar

| Archivo | LOC Actual | LOC Objetivo | Estado |
|---|---|---|---|
| `backend/routes/ingest.js` | **689** | < 150 | Pendiente |
| `backend/routes/auth.js` | **361** | < 150 | Pendiente |
| `backend/routes/admin.js` | **186** | < 150 | Pendiente |
| `backend/routes/nutri.js` | **159** | < 150 | Pendiente |

---

## Plan de Acción Detallado

### 1. `backend/routes/ingest.js` (689 LOC) 🔴 *Crítico*
El archivo de ingesta de recetas (OCR, audio, bots de Telegram) es un *God File* que tiene demasiada lógica de negocio directamente en los controladores de Express.

*   **Acciones**:
    1.  Crear `backend/services/IngestionService.js` (límite 300 LOC).
    2.  Mover la lógica pesada de procesamiento de archivos, OCR de Nvidia, transcripciones y orquestación de BullMQ a métodos especializados en `IngestionService`.
    3.  Las rutas en `ingest.js` deben limitarse únicamente a:
        -   Validar la entrada de la request con Zod.
        -   Llamar a `IngestionService.processIngest(...)`.
        -   Retornar la respuesta al cliente.
    4.  Extraer el router de callbacks de Telegram a su propio controlador o middleware.

### 2. `backend/routes/auth.js` (361 LOC) 🟡 *Alto*
Tiene lógica de login, registro, cookies y manejo de JWT.

*   **Acciones**:
    1.  Mover la lógica de validación e inserción de registro a `backend/services/AuthService.js`.
    2.  Extraer la lógica de creación de cookies HttpOnly y firmado de JWT a utilidades en `backend/utils/authHelpers.js`.
    3.  Limpiar el archivo de rutas para que solo contenga los endpoints que llaman a `AuthService`.

### 3. `backend/routes/admin.js` (186 LOC) & `backend/routes/nutri.js` (159 LOC) 🟢 *Medio*
Superan ligeramente el límite por lógica repetitiva de CRUDs.

*   **Acciones**:
    1.  Extraer los manejadores de ruta (controllers) a una carpeta `backend/controllers/adminController.js` y `backend/controllers/nutriController.js` para desacoplar las definiciones de rutas de sus implementaciones.

---

## Verificación
- [ ] Ejecutar tests de backend: `npm test` en `backend/` para asegurar que ningún endpoint cambió de comportamiento ni rompió el contrato.
- [ ] Verificar que Swagger (`backend/swagger.yaml`) sigue alineado al comportamiento.
