/**
 * Structured API error with HTTP status and optional error code.
 * Shared across all Wati ecosystem apps.
 */
export class ApiError extends Error {
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'ApiError';
    }
}
//# sourceMappingURL=errors.js.map