import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHash } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { EmailVerificationService } from './email-verification.service.js';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let values: ReturnType<typeof vi.fn>;
  let findUser: ReturnType<typeof vi.fn>;
  let requestBody: { to: string[]; text: string; html: string; subject: string };

  beforeEach(async () => {
    const config: Record<string, string> = {
      RESEND_API_KEY: 'test-key',
      EMAIL_FROM: 'nao-responda@example.test',
      PUBLIC_APP_URL: 'https://example.test',
    };
    values = vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn().mockResolvedValue(undefined) });
    findUser = vi.fn().mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: ConfigService, useValue: { get: (name: string) => config[name] } },
        { provide: DatabaseService, useValue: { db: {
          insert: () => ({ values }),
          select: () => ({ from: () => ({ where: () => ({ limit: findUser }) }) }),
        } } },
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
    await service.sendForUser('user-id', 'user@example.test', 'restaurant');

    expect(requestBody.to).toEqual(['user@example.test']);
    const link = requestBody.text.match(/https:\/\/\S+/)?.[0];
    expect(link).toBeDefined();
    const token = new URLSearchParams(new URL(link!).hash.slice(1)).get('token');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(requestBody.html).toContain(link);
    expect(requestBody.html).toContain('/assets/images/prattio-images/light/logo-horizontal.png');
    expect(requestBody.html).toContain('cadastro de restaurante');
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-id',
      tokenHash: createHash('sha256').update(token!).digest('hex'),
      expiresAt: expect.any(Date),
    }));
  });

  it('uses the motoboy brand on confirmation and email-change messages', async () => {
    await service.sendForUser('user-id', 'user@example.test', 'motoboy');
    expect(requestBody.html).toContain('prattio-motoboy-imagens-v2/claro/logo-horizontal.png');
    expect(requestBody.html).toContain('cadastro de motoboy');

    await service.sendEmailChange('new@example.test', '01234567', 'motoboy');
    expect(requestBody.to).toEqual(['new@example.test']);
    expect(requestBody.subject).toContain('alteração de e-mail');
    expect(requestBody.text).toContain('01234567');
    expect(requestBody.html).toContain('01234567');
    expect(requestBody.html).toContain('prattio-motoboy-imagens-v2/claro/logo-horizontal.png');
    expect(requestBody.html).toContain('15 minutos');
  });

  it.each([
    ['client', 'cliente', 'prattio-images/light/logo-horizontal.png'],
    ['restaurant', 'restaurante', 'prattio-images/light/logo-horizontal.png'],
    ['motoboy', 'motoboy', 'prattio-motoboy-imagens-v2/claro/logo-horizontal.png'],
  ] as const)('personalizes the email-change message for %s', async (role, label, logo) => {
    await service.sendEmailChange('new@example.test', '01234567', role);
    expect(requestBody.html).toContain(`conta de ${label}`);
    expect(requestBody.html).toContain(logo);
    expect(requestBody.text).toContain('01234567');
  });

  it('uses the stored role when resending a confirmation', async () => {
    findUser.mockResolvedValue([{ id: 'user-id', email: 'user@example.test', role: 'client' }]);
    await service.resend('user@example.test');
    expect(requestBody.html).toContain('cadastro de cliente');
    expect(requestBody.html).toContain('prattio-images/light/logo-horizontal.png');
  });

  it('reports provider failures instead of claiming success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    await expect(service.sendForUser('user-id', 'user@example.test', 'restaurant'))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
