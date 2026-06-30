# Refactorización de Código — Fase 2: Servicios del Backend

> **Objetivo**: Reducir el tamaño de los servicios del backend que superan el límite estricto de **300 líneas de código (LOC)**, aplicando el Principio de Responsabilidad Única (SRP).

---

## Archivos a Refactorizar

| Archivo | LOC Actual | LOC Objetivo | Estado |
|---|---|---|---|
| `backend/services/RecipeProvider.js` | **406** | < 300 | Pendiente |
| `backend/services/OrganizationService.js` | **335** | < 300 | Pendiente |

---

## Plan de Acción Detallado

### 1. `backend/services/RecipeProvider.js` (406 LOC) 🟡 *Alto*
Este servicio gestiona la recuperación de recetas, validación de alergias, búsqueda difusa e interactúa con la caché de Redis. Es muy denso.

*   **Acciones**:
    1.  Extraer la lógica del motor de validación de alergias (SecurityScrubber) a su propio módulo helper: `backend/utils/SecurityScrubber.js`.
    2.  Mover las consultas complejas de Sequelize y manipulación de tags de traducción a utilidades dedicadas (ej: `backend/utils/recipeHelpers.js`).
    3.  Mantener en `RecipeProvider` únicamente la orquestación de la caché de Redis y el flujo principal de carga del buffer.

### 2. `backend/services/OrganizationService.js` (335 LOC) 🟢 *Medio*
Supera ligeramente el límite de 300 LOC debido a la lógica de gestión de membresías y relaciones de inquilinos.

*   **Acciones**:
    1.  Separar la gestión de la membresía de usuarios de la gestión de la organización física.
    2.  Crear `backend/services/UserOrganizationService.js` para contener métodos como `addUserToOrganization`, `removeUserFromOrganization` y validaciones de roles de inquilino.
    3.  Dejar en `OrganizationService` únicamente el ciclo de vida (CRUD, settings, activación/suspensión) de las organizaciones.

---

## Verificación
- [ ] Ejecutar todos los tests unitarios de servicios: `npm run test` en `backend/`.
- [ ] Verificar compatibilidad en rutas de administración.
