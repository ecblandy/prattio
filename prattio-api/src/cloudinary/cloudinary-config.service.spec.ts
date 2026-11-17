import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { CloudinaryConfigService } from './cloudinary-config.service.js';

describe('CloudinaryConfigService', () => {
  async function createService(values: Record<string, string>) {
    const module = await Test.createTestingModule({
      providers: [
        CloudinaryConfigService,
        { provide: ConfigService, useValue: { get: (name: string) => values[name] } },
      ],
    }).compile();
    return module.get(CloudinaryConfigService);
  }

  it('rejects incomplete or blank configuration when credentials are needed', async () => {
    const service = await createService({
      CLOUDINARY_CLOUD_NAME: 'example',
      CLOUDINARY_API_KEY: 'test-key',
      CLOUDINARY_API_SECRET: ' ',
    });
    expect(() => service.requireCredentials()).toThrow(ServiceUnavailableException);
  });

  it('reads the credentials from server configuration', async () => {
    const service = await createService({
      CLOUDINARY_CLOUD_NAME: 'example',
      CLOUDINARY_API_KEY: 'test-key',
      CLOUDINARY_API_SECRET: 'test-secret',
    });
    expect(service.requireCredentials()).toEqual({
      cloudName: 'example',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
    });
  });
});
