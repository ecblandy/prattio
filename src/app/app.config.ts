import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAppIcons } from './shared/icons/icons.provider';
import { provideAppMasks } from './shared/masks/mask.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAppIcons(),
    provideAppMasks(),
  ],
};
