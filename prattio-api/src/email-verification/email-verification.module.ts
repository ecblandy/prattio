import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { EmailVerificationService } from './email-verification.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [EmailVerificationService],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}
