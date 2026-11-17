import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service.js';
import { UsersRepository } from './users.repository.js';

describe('AuthService', () => {
  const credentials = { email: '  USER@example.com ', password: 'secure-pass-123' };
  const storedUser = {
    id: '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9a',
    name: 'Test User',
    email: 'user@example.com',
    passwordHash: '',
    role: 'client' as const,
    emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
  };
  let findByEmail: ReturnType<typeof vi.fn>;
  let signAsync: ReturnType<typeof vi.fn>;
  let authService: AuthService;

  beforeEach(async () => {
    storedUser.passwordHash = await argon2.hash(credentials.password);
    findByEmail = vi.fn().mockResolvedValue(storedUser);
    signAsync = vi.fn().mockResolvedValue('signed-token');
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: { findByEmail } },
        { provide: JwtService, useValue: { signAsync } },
      ],
    }).compile();
    authService = moduleRef.get(AuthService);
  });

  it('authenticates with normalized email and returns a sanitized user and JWT', async () => {
    const result = await authService.login(credentials);

    expect(findByEmail).toHaveBeenCalledWith('user@example.com');
    expect(signAsync).toHaveBeenCalledWith({
      sub: storedUser.id,
      email: storedUser.email,
      role: storedUser.role,
    });
    expect(result).toEqual({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: storedUser.id,
        name: storedUser.name,
        email: storedUser.email,
        role: storedUser.role,
        onboardingCompleted: false,
      },
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('returns the saved onboarding state when signing in', async () => {
    findByEmail.mockResolvedValue({ ...storedUser, role: 'restaurant', onboardingCompletedAt: new Date() });
    const result = await authService.login(credentials);
    expect(result.user.onboardingCompleted).toBe(true);
  });

  it('rejects unknown emails with a generic unauthorized error', async () => {
    findByEmail.mockResolvedValue(undefined);

    await expect(authService.login(credentials)).rejects.toThrow(
      new UnauthorizedException('Email ou senha inválidos.'),
    );
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password with the same generic unauthorized error', async () => {
    await expect(
      authService.login({ ...credentials, password: 'another-pass-123' }),
    ).rejects.toThrow(new UnauthorizedException('Email ou senha inválidos.'));
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('does not issue a token before email verification', async () => {
    findByEmail.mockResolvedValue({ ...storedUser, emailVerifiedAt: null });
    await expect(authService.login(credentials)).rejects.toThrow('Confirme seu e-mail antes de entrar.');
    expect(signAsync).not.toHaveBeenCalled();
  });
});
