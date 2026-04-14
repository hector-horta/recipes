# Security Architecture & Policies

## Authentication & Session Management
- **Stateless Sessions (JWT)**: We use JSON Web Tokens (JWT) for authentication.
- **Secure Persistence**: Tokens are stored in **HttpOnly, Secure, and Lax** cookies. This prevents JavaScript-based session hijacking (XSS protection).
- **Credentials**: The frontend uses `credentials: 'include'` for all cross-origin or same-origin authenticated requests.

## CSRF (Cross-Site Request Forgery)
The application implements defenses against CSRF by:
- Using `SameSite: Lax` cookies to restrict cross-site transmission.
- Enforcing strict **CORS** policies that only allow trusted origins to make state-changing requests.
- Requiring custom headers for sensitive administrative actions (`X-Admin-Key`).

## SSRF (Server-Side Request Forgery) Protection
- **Restricted Fetching**: All external requests (OCR, Audio, Image generation) pass through a dedicated proxy or a restricted direct fetch with a whitelist.
- **Whitelist Enforcement**: Only trusted domains (e.g., Google APIs, NVIDIA/Groq endpoints, Telegram file servers) are reachable from the backend.
- **URL Validation**: All external URLs provided by users or sub-services are validated against specific schemas before execution.

### Frontend XSS & Sanitization
- **Strict Content Sanitization (DOMPurify)**: All HTML content from external sources (e.g., recipe summaries) is sanitized using `DOMPurify` with a strict whitelist of allowed tags (`b`, `i`, `strong`, `p`, etc.) and no allowed attributes.
- **Input Validation**: Search queries and user-controllable strings are sanitized at the hook level (`useWatiSearch`) to remove potentially dangerous characters and enforce length limits.
- **Image Proxy & Validation**: External images are validated against a whitelist of trusted domains (`ALLOWED_IMAGE_DOMAINS`) before being cached or displayed.
- **Content Security Policy (CSP)**: The application is designed to be compatible with strict CSP headers (though enforcement depends on the hosting environment).

## Inter-Service Communication
- **Shared Secrets**: Communication between the Telegram Bot and the Backend is secured using a shared API Key (`x-api-key`) to prevent unauthorized recipe ingestion.
- **Authorized User IDs**: The Telegram Bot strictly filters messages by `TELEGRAM_USER_ID` at the polling level.

## Information Leakage & Error Handling
To prevent the leakage of internal system details (paths, database structure, library versions):
- **Stack Traces**: Full stack traces are restricted to Development environments and are NEVER sent to the client in Production.
- **Generic Errors**: Internal server errors (5xx) are masked with user-friendly, generic messages.
- **Structured Logging**: All errors are logged internally with full context for debugging, but this data is kept secure on the server.

## Vulnerability Reporting
If you believe you have found a security vulnerability in this project, please report it to the maintainer rather than opening a public issue. Our team is committed to addressing security concerns promptly.
