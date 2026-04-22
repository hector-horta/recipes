import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';

describe('setup', () => {
  it('should load jest-dom matchers', () => {
    expect(true).toBeTruthy();
  });
});
