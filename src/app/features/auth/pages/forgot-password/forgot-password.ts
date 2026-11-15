import { Component, signal } from '@angular/core';
import { forgotPasswordValidators } from '../../../../shared/validators/auth.validators';
import { form, FormField, submit } from '@angular/forms/signals';
import { FieldErrors } from '../../../../shared/components/field-errors/field-errors';
import { NgIcon } from '@ng-icons/core';
import { RouterLink } from '@angular/router';

interface ForgotPasswordModel {
  email: string;
}

@Component({
  selector: 'app-forgot-password',
  imports: [NgIcon, FormField, FieldErrors, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  readonly forgotPasswordModel = signal<ForgotPasswordModel>({
    email: '',
  });

  readonly forgotPasswordForm = form(this.forgotPasswordModel, forgotPasswordValidators);

  async requestPasswordReset(event: Event): Promise<void> {
    event.preventDefault();

    await submit(this.forgotPasswordForm, async (field) => {
      const { email } = field().value();

      console.log('Request password reset:', email);

      // TODO: Integrar com o endpoint de recuperação de senha.
    });
  }
}
