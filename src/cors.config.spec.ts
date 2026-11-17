import { describe, expect, it } from 'vitest';
import { allowedFrontendOrigins } from './cors.config.js';

describe('allowedFrontendOrigins', () => {
  it('accepts explicit origins in addition to the local frontend', () => {
    const origins = allowedFrontendOrigins('https://frontend.example.test, http://localhost:3001');
    expect(origins).toContain('http://127.0.0.1:4200');
    expect(origins).toContain('https://frontend.example.test');
    expect(origins).toContain('http://localhost:3001');
  });

  it('rejects wildcard, paths and credentials', () => {
    for (const value of ['*', 'https://example.test/path', 'https://user:password@example.test']) {
      expect(() => allowedFrontendOrigins(value)).toThrow('FRONTEND_ORIGINS');
    }
  });
});
