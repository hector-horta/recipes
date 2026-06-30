# 🤖 Wati: Reglas de Comportamiento e Instrucciones para Agentes (AI Rules)

> **Propósito**: Este archivo contiene las reglas duras, restricciones de estilo, y rigor de desarrollo que todos los agentes de IA deben seguir estrictamente en este codebase.

---

## 🖥️ Detección de Sistema Operativo (OBLIGATORIO)

Antes de ejecutar cualquier comando en la terminal, debes verificar el sistema operativo del usuario. El uso de comandos incompatibles consume tokens y causa fallos. Utiliza esta tabla de equivalencias para adaptarte al shell del usuario:

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

---

## 🧪 Rigor Metodológico y Calidad de Código

1. **Test Driven Development (TDD)**:
   Aplica TDD de forma estricta. Escribe los tests primero antes de codificar la solución.
2. **Flujo de Desarrollo Estructurado**:
   Debes seguir estrictamente esta secuencia al agregar un feature:
   `Database (Migrations/Models) ──► Backend (Routes/Services) ──► Frontend (API/Hooks/UI) ──► Analytics ──► Verification`
3. **Scratch Scripts (MUST ABSOLUTO)**:
   Cualquier script efímero o archivo temporal creado para diagnosticar, seedear o realizar pruebas manuales **DEBE** ubicarse exclusivamente dentro de la carpeta `backend/scratch/`.
   * Está estrictamente prohibido dejar estos archivos en la raíz o en carpetas públicas.
   * Estos scripts **deben ser eliminados obligatoriamente** de tu entorno local antes de proponer o realizar commits.
4. **i18n Obligatorio**:
   Cualquier texto visible por el usuario en el frontend debe implementarse con internacionalización (`i18n`) soportando español e inglés (`en.json` y `es.json`).
5. **No Placeholders**:
   No uses placeholders de diseño o texto. Genera assets, mocks o datos descriptivos completos.
6. **Pure JS Dependencies (Bcrypt)**:
   Se prohíbe el uso de la librería nativa `bcrypt` (C++). Para evitar crashes de compilación nativa en Docker/Nube, usa **`bcryptjs`** de forma estricta en toda lógica de autenticación o cifrado.
7. **Aislamiento de Aplicaciones Frontend (Frontend Isolation)**:
   Si el contexto de tu tarea está delimitado a una aplicación frontend específica (ej: `more-admin`), tienes prohibido realizar modificaciones en el código de otras aplicaciones (ej: `wati`). La única excepción permitida es cuando se deba promover un componente a la biblioteca compartida (`packages/ui-kit`) por necesidad de reutilización limpia.

---

## 🛡️ Reglas de Seguridad y Resiliencia

1. **SSRF Protection**:
   Toda integración o llamada a APIs externas (Spoonacular, Groq, NVIDIA, etc.) debe pasar por el Proxy del Backend (`ingest.js` o `NvidiaNIM.js`). Nunca llames APIs de terceros directamente desde el cliente.
2. **Frontend API Client**:
   Prohibido usar `fetch` directo. Utiliza el cliente centralizado `frontend/src/lib/api.ts` o el wrapper de API del frontend.
3. **Manejo de Errores y Logs**:
   * **Nunca utilices `console.log` o `console.error` directamente.**
   * **Backend**: Utiliza exclusivamente los métodos estáticos de `ActivityLogger` (`info`, `warn`, `error`) para telemetría estructurada.
   * **Frontend**: Utiliza el singleton `logger` (`frontend/src/utils/logger.ts`) para unificar la salida y telemetría.
4. **Validación Zod**:
   Toda entrada de datos externa (cuerpo de la petición, query, variables de entorno) debe validarse estrictamente con Zod en la entrada de las rutas. Usa `backend/models/validators.js` como repositorio unificado de esquemas.
5. **No Static URLs**:
   No hardcodees URLs de API en el frontend. Utiliza las rutas relativas o variables del wrapper `api`.
6. **Multi-tenancy Isolation**:
   Toda nueva funcionalidad que guarde o lea datos de usuario (recetas, planes, logs) debe filtrar obligatoriamente por `organization_id` extraído del JWT en `req.user.organization_id`. Las recetas globales de Wati (`organization_id = NULL`) deben incluirse siempre utilizando un filtro `Op.or` para evitar que queden ocultas.
7. **XSS Sanitization**:
   Todo contenido HTML que provenga de fuentes externas (como outputs de LLM, OCR, o webs) debe ser sanitizado en el frontend usando `DOMPurify` antes de ser renderizado.

---

## 📏 Límites de Tamaño y Modularidad (Single Responsibility Principle)

Para combatir el antipatrón de archivos gigantescos (*God Files*) y garantizar la mantenibilidad del codebase, se establecen los siguientes límites de líneas de código (LOC) máximos por archivo:

1. **Componentes React (`.tsx`)**: Máximo **200 líneas**. Si un componente supera este límite, debes dividirlo en subcomponentes más pequeños o extraer su lógica a Hooks personalizados.
2. **Hooks personalizados y Utilidades (`.ts` / `.js`)**: Máximo **150 líneas**. Deben tener una única responsabilidad clara.
3. **Rutas y Controladores del Backend (`.js`)**: Máximo **150 líneas**. Las rutas deben limitarse a validar la entrada con Zod, delegar la lógica al servicio correspondiente y retornar la respuesta. No agregues lógica de negocio extensa directamente en las rutas.
4. **Servicios y Modelos del Backend (`.js`)**: Máximo **300 líneas**. Si la lógica de un servicio se vuelve muy compleja, divídelo en sub-servicios especializados.
5. **Refactorización Obligatoria**: Si vas a modificar un archivo existente y tus cambios provocarán que supere los límites definidos, **tienes la obligación de refactorizar y modularizar el archivo primero** antes de implementar la funcionalidad requerida.

---

## 📝 Checklist de Verificación para Commits

Antes de dar por terminado tu trabajo en un feature, debes pasar esta checklist:

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

## 🔄 Mantener la documentación actualizada

Al finalizar el desarrollo de un feature o corregir un bug:
* Si el cambio afectó la estructura de carpetas, esquemas de DB, endpoints, APIs o variables de entorno, es **obligatorio** actualizar la guía principal del proyecto (`docs/FeatureDevelopmentGuide.md`) para asegurar que el siguiente agente o desarrollador tenga el manual al día.
