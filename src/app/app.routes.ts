import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/signin',
  },
  {
    path: 'courier',
    loadComponent: () =>
      import('./features/courier-app/courier-app').then((module) => module.CourierApp),
  },
  {
    path: 'restaurant',
    loadChildren: () =>
      import('./features/restaurant/restaurant.routes').then((module) => module.routes),
  },
  {
    path: 'loja/:slug',
    loadComponent: () =>
      import('./features/storefront/storefront').then((module) => module.Storefront),
  },
  {
    path: '',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.routes),
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then((module) => module.NotFound),
  },
];
