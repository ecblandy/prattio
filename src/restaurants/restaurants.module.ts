import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { EmailVerificationModule } from '../email-verification/email-verification.module.js';
import { RestaurantsController } from './restaurants.controller.js';
import { RestaurantsService } from './restaurants.service.js';

@Module({
  imports: [DatabaseModule, EmailVerificationModule],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
})
export class RestaurantsModule {}
