# FDD_v2.md

## CONTRACT_VERSION
- Version: 2.0.0
- Scope: Entire repository
- Audience: AI coding agents
- Priority: This document overrides stylistic preferences when conflicts exist, except explicit user instructions.

## PRIMARY_OBJECTIVE
Deliver correct, secure, minimal, production-ready changes with predictable execution cost.

## EXECUTION_PROTOCOL
Follow this exact order.

1. Detect OS before terminal usage.
2. Classify task risk: T1, T2, or T3.
3. Run TDD-first when behavior changes.
4. Implement in this sequence:
   - Database
   - Backend (Model/Service/Route)
   - Frontend (API/Hook/UI)
   - Analytics/Telemetry
   - Verification
5. Run required checks for the risk tier.
6. Update this guide if architecture/contracts/rules changed.

## TASK_CLASSIFICATION
- T1: Small isolated change, no schema/API contract change.
- T2: Feature or behavior change, API or UI flow updates.
- T3: Structural/security-critical change (auth, tenancy, migration, queue, shared package contracts).

## NON_NEGOTIABLE_RULES

### Security
- MUST use HttpOnly cookie session model already established.
- MUST include `credentials: 'include'` in authenticated frontend requests.
- MUST route all external integrations through backend SSRF-protected clients.
- MUST validate external URLs using backend allowlist mechanisms.
- MUST sanitize external HTML with DOMPurify before rendering.
- MUST NOT expose secrets/tokens/passwords/PII in logs.
- MUST use `X-Admin-Key` for sensitive admin operations.

### Backend
- MUST use ESM (`import/export`) in backend runtime files.
- MUST keep Sequelize migrations in `.cjs`.
- MUST validate external inputs with Zod before business logic.
- MUST use centralized validators in `backend/models/validators.js` when possible.
- MUST use proper auth middleware (`authenticateToken`, `optionalAuthenticateToken`, `requireAdminKey`).
- MUST use structured logging through `ActivityLogger`, not `console.*`.
- MUST add/maintain telemetry for significant feature flows.

### Multi-tenancy
- MUST filter tenant data by `organization_id` when data is tenant-owned.
- MUST preserve global catalog visibility where applicable (`organization_id = NULL` for global recipes).
- MUST NOT introduce tenant data leaks across organizations.

### Frontend
- MUST NOT call third-party APIs directly from frontend.
- MUST use API client layers, not ad-hoc fetch in components.
- MUST implement resilient loading and error states for async flows.
- MUST support i18n for all user-facing text (ES and EN).
- MUST use logger facade, not direct provider calls or `console.*`.

### Dependencies
- MUST use `bcryptjs`.
- MUST NOT use native `bcrypt`.

### Temporary scripts
- MUST place disposable scripts only in `backend/scratch/`.
- MUST remove disposable scripts before commit.

## TOKEN_EFFICIENCY_RULES
- MUST read only the sections needed for the current task.
- MUST prefer targeted file/symbol lookup over broad scans.
- MUST avoid re-reading full documents unless contract-level changes are required.
- MUST keep code changes minimal and localized.

## REQUIRED_OUTPUTS_PER_TASK
At completion, output a compact compliance block:

- TASK_TIER: T1|T2|T3
- TESTS: pass|fail (scope listed)
- LINT/TYPECHECK: pass|fail (scope listed)
- SECURITY_RULES: pass|fail
- I18N_ES_EN: pass|fail|not_applicable
- ANALYTICS: added|updated|not_applicable
- DOCS_UPDATED: yes|no|not_applicable
- TENANCY_REVIEW: pass|not_applicable

## STOP_CONDITIONS
Stop and escalate only if:
- Required secrets/config are unavailable and block validation.
- Ambiguous product behavior requires user decision.
- A required migration or contract change is risky without approval.

Otherwise continue autonomously.

## OS_COMMAND_MATRIX

### Bash/zsh
- Filter output: `command | grep "text"`
- Chain commands: `cmd1 && cmd2`
- Null output: `> /dev/null`
- Inline env: `VAR=value command`

### PowerShell
- Filter output: `command | Select-String "text"`
- Chain commands: `cmd1; cmd2`
- Null output: `> $null`
- Inline env: `$env:VAR='value'; command`

## ARCHITECTURE_MAP

### Top-level components
- `backend/`: Express API, Sequelize, Redis, BullMQ, services
- `frontend/`: Monorepo with `apps/wati`, `apps/more-admin`, shared `packages/`
- `telegram-bot/`: Ingestion bot with API key secured backend communication
- `docs/`: architecture and operations references

### Backend critical paths
- Entry: `backend/server.js`
- Worker: `backend/worker.js`
- Routes: `backend/routes/*.js`
- Models: `backend/models/*.js`
- Services: `backend/services/*.js`
- Validation: `backend/models/validators.js`
- Auth middleware: `backend/middleware/auth.js`
- Input validation middleware: `backend/middleware/validate.js`
- SSRF/resiliency config: `backend/config/resiliency.js`
- Queue config: `backend/config/bullmq.js`
- Queue singleton: `backend/queues/aiQueue.js`

### Frontend critical paths
- API client and config:
  - `frontend/src/lib/api.ts`
  - `frontend/src/config.ts`
- Auth context: `frontend/apps/wati/src/AuthContext.tsx`
- Logger facade: `frontend/src/utils/logger.ts`
- i18n locales:
  - `frontend/apps/wati/src/locales/en.json`
  - `frontend/apps/wati/src/locales/es.json`
  - `frontend/apps/more-admin/src/locales/*`

## DATABASE_CONTRACT
- Sequelize models use `underscored: true` and timestamps unless explicitly excluded.
- Primary keys use UUID v4 unless existing schema requires otherwise.
- Any enum expansion requires both migration and model update.
- Migration files must include reversible `up` and `down`.

## API_CONTRACT
- OpenAPI source of truth: `backend/swagger.yaml`.
- New/changed endpoints MUST update OpenAPI docs.
- Validate body/query/path via Zod.
- Return appropriate 4xx for client errors and mask 5xx details.

## AI_QUEUE_CONTRACT
- Heavy AI operations must run via BullMQ worker.
- If adding a new job type, MUST update all:
  - `backend/config/bullmq.js` constants
  - `backend/worker.js` handler
  - this document references
- Keep short operations synchronous only when user experience requires immediate response.

## LOGGING_AND_TELEMETRY_CONTRACT

### Backend
- Use `ActivityLogger` for structured logs and alerts.
- Do not block request lifecycle for logging side effects.

### Frontend
- Use `logger` facade for info/warn/error and analytics bridging.
- Add at least one meaningful analytics event per new feature flow.
- Event naming convention: `UPPER_SNAKE_CASE`.

## FRONTEND_IMPLEMENTATION_CONTRACT
- Use hooks/API layer for data fetching and mutations.
- Prefer React Query patterns for caching and invalidation.
- Implement optimistic updates for user-driven mutations when safe.
- Ensure loading/error/empty states are explicit.
- Avoid hardcoded API URLs; use centralized config.

## AUTH_AND_ACCESS_CONTRACT
- Respect role boundaries: `user`, `admin`, `super_admin`.
- Use optional auth only where public+personalized behavior is intended.
- Ensure admin endpoints enforce admin middleware and/or admin key.

## TESTING_CONTRACT

### General
- Behavior changes require tests first (TDD).
- Keep tests close to touched logic when possible.

### Backend
- Framework: Vitest (`node` env)
- Typical commands:
  - `npm test`
  - `npm run coverage`

### Frontend
- Framework: Vitest + React Testing Library (`happy-dom`)
- Typical command:
  - `npm test`

## VERIFICATION_MATRIX

### T1 required
- Targeted tests for changed behavior
- Lint + typecheck for touched workspace

### T2 required
- T1 requirements
- Integration-level validation for changed flow
- Analytics event verification
- i18n ES/EN verification
- OpenAPI update if API changed

### T3 required
- T2 requirements
- Full relevant test suites
- Migration up/down verification (if schema changed)
- Tenancy isolation review
- Security checklist review

## SECURITY_CHECKLIST
- Input validated with Zod
- Correct auth middleware present
- `credentials: 'include'` preserved where required
- No secret leakage in logs/responses
- SSRF whitelist validation applied for external URLs
- External HTML sanitized before rendering
- No direct third-party frontend calls
- No native `bcrypt`

## FEATURE_DELIVERY_PLAYBOOK

1. Define acceptance criteria.
2. Add failing tests.
3. Implement minimal backend changes.
4. Implement minimal frontend changes.
5. Add/update telemetry.
6. Run required verification by tier.
7. Update docs/contracts if changed.
8. Deliver compliance block.

## DOCUMENT_MAINTENANCE_RULE
Update `docs/FDD_v2.md` whenever any of the following changes:
- Folder structure used by agents
- DB schemas/enums/migration conventions
- Endpoint contracts/auth requirements
- Shared patterns for API/hooks/logging/telemetry
- Queue job types and processing model
- i18n conventions
- Security constraints

## ANNEX_INDEX
Use these references only when needed.
- Security policy: `SECURITY.md`
- Multi-tenant migration: `docs/MigrationGuideToMultitenant.md`
- Queue architecture: `docs/BullMQ_Architecture.md`
- Additional architecture notes: `docs/ArchitectureNotes.md`
- Production operations: `docs/ProductionChecklist.md`
- Vault setup: `docs/HCP_VAULT_SETUP.md`

## QUICK_START_FOR_AGENT
1. Read this file first.
2. Identify tier and impacted layers.
3. Read only matching annex files.
4. Execute protocol in order.
5. Output compliance block.
