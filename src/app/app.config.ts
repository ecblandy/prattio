import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAppIcons } from './shared/icons/icons.provider';
import { provideAppMasks } from './shared/masks/mask.provider';
import { ThemeService } from './core/theme/theme.service';
import { apiHeadersInterceptor } from './core/interceptors/api-headers.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([apiHeadersInterceptor])),
    provideRouter(routes),
    provideAppIcons(),
    provideAppMasks(),
    provideAppInitializer(() => inject(ThemeService).init()),
  ],
};
