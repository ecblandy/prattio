import { Routes } from '@angular/router';
import { Layout } from './layout/layout';

export const routes: Routes = [
  {
    path: 'auth',
    component: Layout,
    children: [
      {
        path: 'signin',
        loadComponent: () => import('./pages/signin/signin').then((m) => m.Signin),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./pages/forgot-password/forgot-password').then((m) => m.ForgotPassword),
      },

      {
        path: 'check-email',
        loadComponent: () => import('./pages/check-email/check-email').then((m) => m.CheckEmail),
      },
      {
        path: 'confirm-email',
        loadComponent: () =>
          import('./pages/confirm-email/confirm-email').then((m) => m.ConfirmEmail),
      },
      {
        path: 'resend-confirmation',
        loadComponent: () =>
          import('./pages/resend-confirmation/resend-confirmation').then((m) => m.ResendConfirmation),
      },

      {
        path: 'user-profile',
        loadComponent: () => import('./pages/user-profile/user-profile').then((m) => m.UserProfile),
      },

      {
        path: 'client-signup',
        loadComponent: () =>
          import('./pages/client-signup/client-signup').then((m) => m.ClientSignup),
      },
      {
        path: 'motoboy-signup',
        loadComponent: () =>
          import('./pages/motoboy-signup/motoboy-signup').then((m) => m.MotoboySignup),
      },
      {
        path: 'restaurant-signup',
        loadComponent: () =>
          import('./pages/restaurant-signup/restaurant-signup').then((m) => m.RestaurantSignup),
      },
      // Futuras rotas:
      // signup
      // forgot-password
      // reset-password
    ],
  },
];
