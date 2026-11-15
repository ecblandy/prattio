import { Component, signal } from '@angular/core';
import { FormField, form, submit } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';

import { signinValidators } from '../../../../shared/validators/auth.validators';
import { FieldErrors } from '../../../../shared/components/field-errors/field-errors';

export interface SigninModel {
  email: string;
  password: string;
}

@Component({
  selector: 'app-signin',
  imports: [NgIcon, FormField, FieldErrors],
  templateUrl: './signin.html',
  styleUrl: './signin.css',
})
export class Signin {
  readonly signinModel = signal<SigninModel>({
    email: '',
    password: '',
  });

  readonly signinForm = form(this.signinModel, signinValidators);

  readonly passwordVisible = signal(false);

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  async authenticate(event: Event): Promise<void> {
    event.preventDefault();

    await submit(this.signinForm, async (field) => {
      const credentials = field().value();

      console.log('Authenticating with credentials:', credentials);
    });
  }
}
