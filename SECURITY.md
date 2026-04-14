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

## Vulnerability Reporting
If you believe you have found a security vulnerability in this project, please report it to the maintainer rather than opening a public issue. Our team is committed to addressing security concerns promptly.
