import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { EmailVerificationService } from './email-verification.service.js';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let values: ReturnType<typeof vi.fn>;
  let requestBody: { to: string[]; text: string };

  beforeEach(async () => {
    const config: Record<string, string> = {
      RESEND_API_KEY: 'test-key',
      EMAIL_FROM: 'nao-responda@example.test',
      PUBLIC_APP_URL: 'https://example.test',
    };
    values = vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockResolvedValue(undefined) });
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: ConfigService, useValue: { get: (name: string) => config[name] } },
        { provide: DatabaseService, useValue: { db: { insert: () => ({ values }) } } },
      ],
    }).compile();
    service = moduleRef.get(EmailVerificationService);
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      requestBody = JSON.parse(String(init.body));
      return new Response(null, { status: 200 });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a confirmation link while storing only a hash of the token', async () => {
    await service.sendForUser('user-id', 'user@example.test');

    expect(requestBody.to).toEqual(['user@example.test']);
    const link = requestBody.text.match(/https:\/\/\S+/)?.[0];
    expect(link).toBeDefined();
    const token = new URLSearchParams(new URL(link!).hash.slice(1)).get('token');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-id',
      tokenHash: createHash('sha256').update(token!).digest('hex'),
      expiresAt: expect.any(Date),
    }));
  });

  it('reports provider failures instead of claiming success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    await expect(service.sendForUser('user-id', 'user@example.test'))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
