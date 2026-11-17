import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { DatabaseService } from '../database/database.service.js';
import { personalProfiles, users } from '../database/schema.js';
import { EmailVerificationService } from '../email-verification/email-verification.service.js';
import { PersonalRegistrationService } from './personal-registration.service.js';

describe('PersonalRegistrationService', () => {
  const data = {
    name: 'Pessoa Teste', email: 'teste@example.test', cpf: '52998224725',
    phone: '71912345678', password: 'secure-password', acceptedTerms: true,
    role: 'client' as const,
  };
  let service: PersonalRegistrationService;
  let insertUser: ReturnType<typeof vi.fn>;
  let insertProfile: ReturnType<typeof vi.fn>;
  let sendForUser: ReturnType<typeof vi.fn>;
  let ensureConfigured: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    insertUser = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: 'user-id' }]) });
    insertProfile = vi.fn().mockResolvedValue(undefined);
    const tx = {
      insert: vi.fn((table) => ({
        values: table === users ? insertUser : table === personalProfiles ? insertProfile : vi.fn(),
      })),
    };
    sendForUser = vi.fn().mockResolvedValue(undefined);
    ensureConfigured = vi.fn();
    const module = await Test.createTestingModule({
      providers: [
        PersonalRegistrationService,
        { provide: DatabaseService, useValue: { db: { transaction: (callback: (value: typeof tx) => unknown) => callback(tx) } } },
        { provide: EmailVerificationService, useValue: { ensureConfigured, sendForUser } },
      ],
    }).compile();
    service = module.get(PersonalRegistrationService);
  });

  it.each(['client', 'motoboy'] as const)('stores and confirms a %s account', async (role) => {
    await service.register({ ...data, role });
    const user = insertUser.mock.calls[0][0];
    expect(user).toMatchObject({ name: data.name, email: data.email, role });
    expect(user.passwordHash).not.toBe(data.password);
    expect(await argon2.verify(user.passwordHash, data.password)).toBe(true);
    expect(insertProfile).toHaveBeenCalledWith({ userId: 'user-id', cpf: data.cpf, phone: data.phone });
    expect(sendForUser).toHaveBeenCalledWith('user-id', data.email, role);
  });

  it('reports when the account was created but confirmation could not be sent', async () => {
    sendForUser.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.register(data)).rejects.toThrow('Cadastro criado, mas não foi possível enviar a confirmação.');
  });

  it('does not create an account when email confirmation is not configured', async () => {
    ensureConfigured.mockImplementation(() => { throw new ServiceUnavailableException(); });
    await expect(service.register(data)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(insertUser).not.toHaveBeenCalled();
  });
});
