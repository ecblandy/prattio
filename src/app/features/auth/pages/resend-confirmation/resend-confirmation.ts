import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { email, FormField, form, required, submit } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

import { AuthApiService } from '../../auth-api.service';
import { FieldErrors } from '../../../../shared/components/field-errors/field-errors';

@Component({
  selector: 'app-resend-confirmation',
  imports: [FormField, RouterLink, NgIcon, FieldErrors],
  templateUrl: './resend-confirmation.html',
})
export class ResendConfirmation {
  private readonly authApi = inject(AuthApiService);

  readonly model = signal({ email: '' });
  readonly form = form(this.model, (path) => {
    required(path.email, { message: 'Informe seu e-mail.' });
    email(path.email, { message: 'Informe um e-mail válido.' });
  });
  readonly message = signal('');
  readonly error = signal('');

  async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.message.set('');
    this.error.set('');

    await submit(this.form, async (field) => {
      try {
        await this.authApi.resendConfirmation(field().value().email);
        this.message.set('Se houver uma conta pendente, enviaremos um link de confirmação.');
      } catch (error) {
        if (!(error instanceof HttpErrorResponse)) throw error;
        this.error.set(
          error.status === 429
            ? 'Muitas tentativas. Aguarde um momento e tente novamente.'
            : 'Não foi possível enviar o e-mail. Tente novamente mais tarde.',
        );
      }
    });
  }
}
