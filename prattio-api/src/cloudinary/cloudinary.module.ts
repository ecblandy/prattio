import { Module } from '@nestjs/common';
import { CloudinaryConfigService } from './cloudinary-config.service.js';

@Module({
  providers: [CloudinaryConfigService],
  exports: [CloudinaryConfigService],
})
export class CloudinaryModule {}
