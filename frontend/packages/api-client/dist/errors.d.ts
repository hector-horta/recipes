/**
 * Structured API error with HTTP status and optional error code.
 * Shared across all Wati ecosystem apps.
 */
export declare class ApiError extends Error {
    status: number;
    code?: string | undefined;
    constructor(status: number, message: string, code?: string | undefined);
}
//# sourceMappingURL=errors.d.ts.map