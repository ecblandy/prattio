import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
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
      // Futuras rotas:
      // signup
      // forgot-password
      // reset-password
    ],
  },
];
