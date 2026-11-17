import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { EmailVerificationService } from '../email-verification/email-verification.service.js';
import { ConfirmEmailDto } from './dto/confirm-email.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ResendConfirmationDto } from './dto/resend-confirmation.dto.js';
import { AuthService } from './auth.service.js';
import { RestaurantAuthGuard } from './restaurant-auth.guard.js';
import type { RestaurantRequest } from './restaurant-auth.guard.js';
import { RestaurantFeedbackDto } from './dto/restaurant-feedback.dto.js';
import { RestaurantFeedbackService } from './restaurant-feedback.service.js';
import { SessionAuthGuard } from './session-auth.guard.js';
import type { SessionRequest } from './session-auth.guard.js';
import { AnnouncementsService } from './announcements.service.js';
import { EmailChangeService } from './email-change.service.js';
import { RequestEmailChangeDto } from './dto/request-email-change.dto.js';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto.js';
import { AnnouncementsGateway } from './announcements.gateway.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerification: EmailVerificationService,
    private readonly restaurantFeedback: RestaurantFeedbackService,
    private readonly announcements: AnnouncementsService,
    private readonly emailChange: EmailChangeService,
    private readonly announcementsGateway: AnnouncementsGateway,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body() credentials: LoginDto) {
    return this.authService.login(credentials);
  }

  @Post('onboarding/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RestaurantAuthGuard)
  completeOnboarding(@Req() request: RestaurantRequest) {
    return this.authService.completeOnboarding(request.restaurantUserId);
  }

  @Post('restaurant-feedback')
  @UseGuards(ThrottlerGuard, RestaurantAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  submitFeedback(@Req() request: RestaurantRequest, @Body() data: RestaurantFeedbackDto) {
    return this.restaurantFeedback.submit(request.restaurantUserId, data);
  }

  @Get('announcements')
  @UseGuards(SessionAuthGuard)
  listAnnouncements(@Req() request: SessionRequest) {
    return this.announcements.list(request.sessionUser);
  }

  @Post('announcements/:id/read')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionAuthGuard)
  async markAnnouncementRead(@Req() request: SessionRequest, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.announcements.markRead(request.sessionUser, id);
    this.announcementsGateway.announceRead(request.sessionUser.id, id);
    return result;
  }

  @Post('email-change')
  @UseGuards(ThrottlerGuard, SessionAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  requestEmailChange(@Req() request: SessionRequest, @Body() data: RequestEmailChangeDto) {
    return this.emailChange.request(request.sessionUser.id, data);
  }

  @Post('email-change/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, SessionAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  confirmEmailChange(@Req() request: SessionRequest, @Body() data: ConfirmEmailChangeDto) {
    return this.emailChange.confirm(request.sessionUser.id, data.code);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  verifyEmail(@Body() data: ConfirmEmailDto) {
    return this.emailVerification.verify(data.token);
  }

  @Post('resend-confirmation')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  resendConfirmation(@Body() data: ResendConfirmationDto) {
    return this.emailVerification.resend(data.email);
  }
}
