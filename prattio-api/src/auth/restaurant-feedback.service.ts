import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { restaurantFeedback } from '../database/schema.js';
import { RestaurantFeedbackDto } from './dto/restaurant-feedback.dto.js';

@Injectable()
export class RestaurantFeedbackService {
  constructor(private readonly database: DatabaseService) {}

  async submit(userId: string, data: RestaurantFeedbackDto): Promise<{ message: string }> {
    await this.database.db.insert(restaurantFeedback).values({ userId, ...data });
    return { message: 'Relato registrado.' };
  }
}
