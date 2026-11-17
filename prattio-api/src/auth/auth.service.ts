import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { LoginDto } from './dto/login.dto.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(credentials: LoginDto) {
    const email = credentials.email.trim().toLowerCase();
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      await argon2.hash(credentials.password);
      throw new UnauthorizedException('Email ou senha inválidos.');
    }

    if (!(await argon2.verify(user.passwordHash, credentials.password))) {
      throw new UnauthorizedException('Email ou senha inválidos.');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Confirme seu e-mail antes de entrar.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: Boolean(user.onboardingCompletedAt),
      },
    };
  }

  async completeOnboarding(userId: string): Promise<{ message: string }> {
    if (!(await this.usersRepository.completeRestaurantOnboarding(userId))) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    return { message: 'Guia inicial concluído.' };
  }
}
