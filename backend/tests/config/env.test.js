import { describe, it, expect } from 'vitest';
import { envSchema } from '../../config/env.js';

describe('envSchema', () => {
  const baseValidData = {
    JWT_SECRET: 'auth-secret-key-12345678901234567890',
  };

  describe('Non-Production Environments (development / test)', () => {
    it('should pass if verification and reset secrets are omitted', () => {
      const result = envSchema.safeParse({
        ...baseValidData,
        NODE_ENV: 'development',
      });
      expect(result.success).toBe(true);
      expect(result.data.JWT_VERIFY_SECRET).toBeUndefined();
      expect(result.data.JWT_RESET_SECRET).toBeUndefined();
    });

    it('should pass even if secrets are identical in development', () => {
      const result = envSchema.safeParse({
        ...baseValidData,
        NODE_ENV: 'development',
        JWT_VERIFY_SECRET: 'auth-secret-key-12345678901234567890',
        JWT_RESET_SECRET: 'auth-secret-key-12345678901234567890',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Production Environment', () => {
    it('should fail if JWT_VERIFY_SECRET is missing', () => {
      const result = envSchema.safeParse({
        ...baseValidData,
        NODE_ENV: 'production',
        JWT_RESET_SECRET: 'reset-secret-key',
      });
      expect(result.success).toBe(false);
      const errors = result.error.format();
      expect(errors.JWT_VERIFY_SECRET?._errors[0]).toBe('JWT_VERIFY_SECRET is required in production');
    });

    it('should fail if JWT_RESET_SECRET is missing', () => {
      const result = envSchema.safeParse({
        ...baseValidData,
        NODE_ENV: 'production',
        JWT_VERIFY_SECRET: 'verify-secret-key',
      });
      expect(result.success).toBe(false);
      const errors = result.error.format();
      expect(errors.JWT_RESET_SECRET?._errors[0]).toBe('JWT_RESET_SECRET is required in production');
    });

    it('should fail if JWT_VERIFY_SECRET equals JWT_SECRET', () => {
      const result = envSchema.safeParse({
        ...baseValidData,
        NODE_ENV: 'production',
        JWT_VERIFY_SECRET: baseValidData.JWT_SECRET,
        JWT_RESET_SECRET: 'reset-secret-key',
      });
      expect(result.success).toBe(false);
      const errors = result.error.format();
      expect(errors.JWT_VERIFY_SECRET?._errors[0]).toBe('JWT_VERIFY_SECRET must differ from JWT_SECRET in production');
    });

    it('should fail if JWT_RESET_SECRET equals JWT_SECRET', () => {
      const result = envSchema.safeParse({
        ...baseValidData,
        NODE_ENV: 'production',
        JWT_VERIFY_SECRET: 'verify-secret-key',
        JWT_RESET_SECRET: baseValidData.JWT_SECRET,
      });
      expect(result.success).toBe(false);
      const errors = result.error.format();
      expect(errors.JWT_RESET_SECRET?._errors[0]).toBe('JWT_RESET_SECRET must differ from JWT_SECRET in production');
    });

    it('should fail if JWT_RESET_SECRET equals JWT_VERIFY_SECRET', () => {
      const result = envSchema.safeParse({
        ...baseValidData,
        NODE_ENV: 'production',
        JWT_VERIFY_SECRET: 'same-secret-key',
        JWT_RESET_SECRET: 'same-secret-key',
      });
      expect(result.success).toBe(false);
      const errors = result.error.format();
      expect(errors.JWT_RESET_SECRET?._errors[0]).toBe('JWT_RESET_SECRET must differ from JWT_VERIFY_SECRET in production');
    });

    it('should pass if all secrets are defined and mutually distinct', () => {
      const result = envSchema.safeParse({
        ...baseValidData,
        NODE_ENV: 'production',
        JWT_VERIFY_SECRET: 'distinct-verify-secret-key',
        JWT_RESET_SECRET: 'distinct-reset-secret-key',
      });
      expect(result.success).toBe(true);
      expect(result.data.JWT_SECRET).toBe(baseValidData.JWT_SECRET);
      expect(result.data.JWT_VERIFY_SECRET).toBe('distinct-verify-secret-key');
      expect(result.data.JWT_RESET_SECRET).toBe('distinct-reset-secret-key');
    });
  });
});
