import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { NgxMaskDirective } from 'ngx-mask';
import {
  FormField,
  email,
  form,
  maxLength,
  minLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { FieldErrors } from '../../../../shared/components/field-errors/field-errors';
import { ToastService } from '../../../../core/notifications/toast.service';
import { AuthApiService } from '../../auth-api.service';
import { submitPersonalSignup } from '../submit-personal-signup';

interface ClientSignupModel {
  fullName: string;
  email: string;
  cpf: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

@Component({
  selector: 'app-client-signup',
  imports: [NgIcon, RouterLink, NgxMaskDirective, FormField, FieldErrors],
  templateUrl: './client-signup.html',
  styleUrl: './client-signup.css',
})
export class ClientSignup {
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly model = signal<ClientSignupModel>({
    fullName: '',
    email: '',
    cpf: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  });

  readonly clientForm = form(this.model, (path) => {
    required(path.fullName, { message: 'Informe seu nome completo.' });
    minLength(path.fullName, 3, { message: 'Informe seu nome completo.' });
    maxLength(path.fullName, 120, { message: 'Use no máximo 120 caracteres.' });
    required(path.email, { message: 'Informe seu e-mail.' });
    email(path.email, { message: 'Informe um e-mail válido.' });
    maxLength(path.email, 254, { message: 'Informe um e-mail válido.' });
    required(path.cpf, { message: 'Informe seu CPF.' });
    minLength(path.cpf, 11, { message: 'Informe os 11 dígitos do CPF.' });
    required(path.phone, { message: 'Informe seu telefone.' });
    minLength(path.phone, 11, { message: 'Informe os 11 dígitos do celular.' });
    required(path.password, { message: 'Informe sua senha.' });
    minLength(path.password, 8, { message: 'A senha deve ter pelo menos 8 caracteres.' });
    maxLength(path.password, 128, { message: 'A senha deve ter no máximo 128 caracteres.' });
    required(path.confirmPassword, { message: 'Confirme sua senha.' });
    validate(path.confirmPassword, ({ value, valueOf }) => {
      if (!value() || value() === valueOf(path.password)) return null;

      return {
        kind: 'passwordMismatch',
        message: 'As senhas informadas não coincidem.',
      };
    });
    required(path.acceptedTerms, { message: 'Você precisa aceitar os termos para continuar.' });
  });

  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    await submit(this.clientForm, async (field) => {
      const { fullName, confirmPassword: _confirmPassword, ...data } = field().value();
      await submitPersonalSignup(this.authApi, this.router, this.toast, {
        ...data, name: fullName, role: 'client',
      });
    });
  }
}
