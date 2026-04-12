# Security Architecture & Policies

## Authentication & CSRF
- **Authentication**: We use stateless JSON Web Tokens (JWT) for authentication.
- **CSRF (Cross-Site Request Forgery)**: The application is explicitly NOT vulnerable to CSRF. 
  Tokens are stored securely and sent exclusively via the `Authorization: Bearer <token>` header. 
  We do NOT rely on implicit browser cookie transmission for session state. Therefore, explicit CSRF tokens or libraries like `csurf` are intentionally omitted.

## Vulnerability Reporting
If you believe you have found a security vulnerability in this project, please report it to the maintainer rather than opening a public issue. Our team is committed to addressing security concerns promptly.
