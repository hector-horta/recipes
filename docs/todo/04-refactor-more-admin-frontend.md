# Refactorización de Código — Fase 4: Frontend de MORE Admin

> **Objetivo**: Reducir el tamaño de las páginas y modales de MORE Admin que superan críticamente el límite estricto de **200 líneas de código (LOC)**, descomponiendo los formularios masivos y layouts densos en subcomponentes especializados.

---

## Archivos a Refactorizar

| Archivo | LOC Actual | LOC Objetivo | Estado |
|---|---|---|---|
| `frontend/apps/more-admin/src/.../RecipeFormModal.tsx` | **1083** | < 200 | Pendiente |
| `frontend/apps/more-admin/src/pages/Tenants.tsx` | **921** | < 200 | Pendiente |
| `frontend/apps/more-admin/src/pages/Dashboard.tsx` | **551** | < 200 | Pendiente |
| `frontend/apps/more-admin/src/pages/Tags.tsx` | **371** | < 200 | Pendiente |
| `frontend/apps/more-admin/src/pages/Login.tsx` | **316** | < 200 | Pendiente |
| `frontend/apps/more-admin/src/pages/GlobalRecipes/GlobalRecipes.tsx` | **242** | < 200 | Pendiente |
| `frontend/apps/more-admin/src/.../RecipeTable.tsx` | **224** | < 200 | Pendiente |

---

## Plan de Acción Detallado

### 1. `RecipeFormModal.tsx` (1083 LOC) 🔴 *Crítico Extremo*
Es un modal gigante con múltiples secciones: detalles básicos de la receta, ingredientes con cantidades y unidades en español/inglés, pasos ordenados, etiquetas SIBO, y controles de regeneración de imágenes AI.

*   **Acciones**:
    1.  Crear una subcarpeta en `frontend/apps/more-admin/src/pages/GlobalRecipes/components/RecipeForm/` y mover allí los subcomponentes del formulario:
        -   `BasicDetailsSection.tsx` (título, tiempos, porciones, dificultad)
        -   `IngredientsSection.tsx` (listado dinámico de ingredientes, inputs de unidades/cantidades)
        -   `StepsSection.tsx` (pasos de la receta, instrucciones)
        -   `ImageSection.tsx` (uploader, preview, control de regeneración por AI)
    2.  Extraer toda la lógica del estado del formulario, validaciones, mapeos de datos para el API y hooks de mutación a un custom hook unificado: `useRecipeFormState.ts` (límite 150 LOC).
    3.  `RecipeFormModal.tsx` quedará reducido a un cascarón de menos de 100 líneas que renderiza el modal y acomoda las secciones y el hook de estado.

### 2. `Tenants.tsx` (921 LOC) 🔴 *Crítico*
Controla el listado de organizaciones, sus detalles, la adición de usuarios en bloque (bulk) e individuales.

*   **Acciones**:
    1.  Extraer el formulario y modal de creación/edición de organizaciones a `OrganizationModal.tsx`.
    2.  Extraer el formulario de bulk import de usuarios a `BulkUserImportModal.tsx`.
    3.  Mover la tabla de inquilinos a `TenantTable.tsx`.
    4.  Mover los hooks de llamadas a API a `useTenantOperations.ts`.
    5.  Reducir `Tenants.tsx` a la estructura de layout de la página.

### 3. `Dashboard.tsx` (551 LOC) & `Tags.tsx` (371 LOC) 🟡 *Alto*
Muestran paneles densos de información o tablas editables en línea.

*   **Acciones**:
    1.  Dashboard: Separar los paneles de rendimiento (Nvidia NIM, API uptime) a `PerformancePanels.tsx` y el listado de logs recientes a `RecentLogsTable.tsx`.
    2.  Tags: Separar el formulario de creación/edición de tags del listado principal.

---

## Verificación
- [ ] Ejecutar compilación del frontend: `pnpm --filter more-admin build` para asegurar que las referencias tipadas y dependencias de componentes sigan resolviendo correctamente sin errores de TypeScript.
