import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

import { AuthApiService, LoginResponse } from '../../auth-api.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { signinValidators } from '../../../../shared/validators/auth.validators';
import { FieldErrors } from '../../../../shared/components/field-errors/field-errors';

export interface SigninModel {
  email: string;
  password: string;
}

@Component({
  selector: 'app-signin',
  imports: [NgIcon, FormField, FieldErrors, RouterLink],
  templateUrl: './signin.html',
  styleUrl: './signin.css',
})
export class Signin {
  private readonly authApi = inject(AuthApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly signinModel = signal<SigninModel>({
    email: '',
    password: '',
  });

  readonly signinForm = form(this.signinModel, signinValidators);

  readonly passwordVisible = signal(false);

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  async authenticate(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    await submit(this.signinForm, async (field) => {
      const credentials = field().value();
      let session: LoginResponse;

      try {
        session = await this.authApi.login(credentials);
      } catch (error) {
        if (!(error instanceof HttpErrorResponse)) throw error;

        const message =
          error.status === 401
            ? 'Email ou senha inválidos.'
            : error.status === 403
              ? 'Confirme seu e-mail antes de entrar.'
            : error.status === 429
              ? 'Muitas tentativas. Aguarde um momento e tente novamente.'
            : error.status === 400
              ? 'Confira o email e a senha informados.'
              : error.status === 0
                ? 'Não foi possível conectar à API. Verifique se o backend está em execução.'
                : 'Não foi possível entrar agora. Tente novamente.';

        this.toast.show(message, 'error');
        return;
      }

      if (session.user.role === 'restaurant') {
        const navigated = await this.router.navigate(['/restaurant']);
        if (!navigated) {
          this.toast.show('Não foi possível abrir o painel da loja.', 'error');
          return;
        }
      }

      this.toast.show('Login realizado com sucesso.', 'success');
    });
  }
}
