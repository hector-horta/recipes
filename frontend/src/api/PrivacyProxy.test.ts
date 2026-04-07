import { describe, it, expect, vi } from 'vitest';
import { InputSanitizer } from './PrivacyProxy.js';

describe('InputSanitizer', () => {
  describe('clean', () => {
    it('should remove dangerous characters', () => {
      expect(InputSanitizer.clean("test'value")).toBe('testvalue');
      expect(InputSanitizer.clean('test"quote')).toBe('testquote');
      expect(InputSanitizer.clean('test;injection')).toBe('testinjection');
    });

    it('should remove SQL injection patterns', () => {
      expect(InputSanitizer.clean("'; DROP TABLE users;--")).toBe('DROP TABLE users--');
      expect(InputSanitizer.clean("1' OR '1'='1")).toBe('1 OR 11');
    });

    it('should remove XSS script tags', () => {
      expect(InputSanitizer.clean('<script>alert(1)</script>')).toBe('');
      expect(InputSanitizer.clean('<img src=x onerror=alert(1)>')).toBe('img srcx onerroralert(1)');
    });

    it('should trim whitespace', () => {
      expect(InputSanitizer.clean('  test  ')).toBe('test');
    });

    it('should handle empty strings', () => {
      expect(InputSanitizer.clean('')).toBe('');
      expect(InputSanitizer.clean('   ')).toBe('');
    });

    it('should preserve safe characters', () => {
      expect(InputSanitizer.clean('hello-world')).toBe('hello-world');
      expect(InputSanitizer.clean('test_underscore')).toBe('test_underscore');
      expect(InputSanitizer.clean('normal text')).toBe('normal text');
    });

    it('should remove curly braces', () => {
      expect(InputSanitizer.clean('test{}')).toBe('test');
    });

    it('should remove dollar signs', () => {
      expect(InputSanitizer.clean('$100')).toBe('100');
    });

    it('should handle multiple dangerous patterns', () => {
      const malicious = "<script>' OR 1=1; DROP TABLE--</script>";
      expect(InputSanitizer.clean(malicious)).toBe(' OR 11 DROP TABLE--');
    });

    it('should handle unicode characters', () => {
      expect(InputSanitizer.clean('tëst')).toBe('tëst');
      expect(InputSanitizer.clean('日本語')).toBe('日本語');
    });

    it('should handle very long strings', () => {
      const long = 'a'.repeat(10000);
      const result = InputSanitizer.clean(long);
      expect(result).toBe(long);
    });
  });
});
