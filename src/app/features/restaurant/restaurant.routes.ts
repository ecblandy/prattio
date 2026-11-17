import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'tv/:code',
    loadComponent: () => import('./restaurant-tv').then((module) => module.RestaurantTv),
  },
  {
    path: '',
    loadComponent: () =>
      import('./restaurant-dashboard').then((module) => module.RestaurantDashboard),
  },
];
