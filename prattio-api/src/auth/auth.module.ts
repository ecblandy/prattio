import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module.js';
import { EmailVerificationModule } from '../email-verification/email-verification.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { UsersRepository } from './users.repository.js';
import { RestaurantAuthGuard } from './restaurant-auth.guard.js';
import { RestaurantFeedbackService } from './restaurant-feedback.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';
import { AnnouncementsService } from './announcements.service.js';
import { EmailChangeService } from './email-change.service.js';
import { AnnouncementsGateway } from './announcements.gateway.js';

@Module({
  imports: [
    DatabaseModule,
    EmailVerificationModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_SECRET');
        if (secret.length < 32) {
          throw new Error('JWT_SECRET must contain at least 32 characters.');
        }

        return { secret, signOptions: { expiresIn: '15m' } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersRepository, RestaurantAuthGuard, RestaurantFeedbackService, SessionAuthGuard, AnnouncementsService, EmailChangeService, AnnouncementsGateway],
})
export class AuthModule {}
