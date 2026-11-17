import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { DatabaseService } from '../database/database.service.js';
import { EmailVerificationService } from '../email-verification/email-verification.service.js';
import { EmailChangeService } from './email-change.service.js';

describe('EmailChangeService', () => {
  it('uses the account role when sending the change code', async () => {
    const find = vi.fn()
      .mockResolvedValueOnce([{
        email: 'old@example.test',
        passwordHash: await argon2.hash('secure-password'),
        verifiedAt: new Date(),
        role: 'motoboy',
      }])
      .mockResolvedValueOnce([]);
    const sendEmailChange = vi.fn().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [
        EmailChangeService,
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-secret-at-least-32-characters-long' } },
        { provide: EmailVerificationService, useValue: { ensureConfigured: vi.fn(), sendEmailChange } },
        { provide: DatabaseService, useValue: { db: {
          select: () => ({ from: () => ({ where: () => ({ limit: find }) }) }),
          insert: () => ({ values: () => ({ onConflictDoUpdate: vi.fn().mockResolvedValue(undefined) }) }),
        } } },
      ],
    }).compile();
    const service = module.get(EmailChangeService);

    await service.request('user-id', { email: 'new@example.test', password: 'secure-password' });
    expect(sendEmailChange).toHaveBeenCalledWith('new@example.test', expect.stringMatching(/^\d{8}$/), 'motoboy');
  });
});
