# Refactorización de Código — Fase 3: Frontend de Wati

> **Objetivo**: Reducir el tamaño de los componentes y páginas de la aplicación Wati que superan el límite estricto de **200 líneas de código (LOC)**, modularizando la UI y abstrayendo estados complejos a Custom Hooks.

---

## Archivos a Refactorizar

| Archivo | LOC Actual | LOC Objetivo | Estado |
|---|---|---|---|
| `frontend/apps/wati/src/components/LoginModal.tsx` | **290** | < 200 | Pendiente |
| `frontend/apps/wati/src/components/OnboardingModal.tsx` | **250** | < 200 | Pendiente |
| `frontend/apps/wati/src/pages/OnboardingPage.tsx` | **242** | < 200 | Pendiente |
| `frontend/apps/wati/src/pages/LoginPage.tsx` | **216** | < 200 | Pendiente |

---

## Plan de Acción Detallado

### 1. `LoginModal.tsx` (290 LOC) & `LoginPage.tsx` (216 LOC) 🟡 *Alto*
Tienen lógica duplicada de login, validación de contraseñas y mitigación de extensiones gestoras de contraseñas.

*   **Acciones**:
    1.  Crear un custom hook `useLoginForm.ts` en `frontend/apps/wati/src/hooks/` para encapsular la validación de campos, el estado de carga/error y la llamada al `AuthContext`.
    2.  Extraer el contenedor visual del formulario de login a un subcomponente reutilizable en `frontend/apps/wati/src/components/auth/LoginForm.tsx`.
    3.  Tanto `LoginModal` como `LoginPage` pasarán a tener menos de 80 líneas, sirviendo únicamente como cascarones o layouts de envoltura que importan y renderizan `LoginForm`.

### 2. `OnboardingModal.tsx` (250 LOC) & `OnboardingPage.tsx` (242 LOC) 🟡 *Alto*
Controlan los pasos del onboarding (dietas, intolerancias, severidades).

*   **Acciones**:
    1.  Desglosar cada paso del onboarding (ej: selección de intolerancias, nivel de severidad, datos calóricos) en subcomponentes independientes dentro de una carpeta `frontend/apps/wati/src/components/onboarding/steps/`:
        -   `DietSelectionStep.tsx`
        -   `IntoleranceSelectionStep.tsx`
        -   `CaloriesStep.tsx`
    2.  Extraer la gestión del estado multietapa y mutaciones de guardado a un custom hook `useOnboardingState.ts`.
    3.  `OnboardingModal` y `OnboardingPage` solo actuarán como contenedores de navegación de pasos, importando los subcomponentes independientes.

---

## Verificación
- [ ] Correr tests del frontend: `pnpm --filter wati test` para asegurar que el login y onboarding siguen operando correctamente sin errores de renderizado.
