import { HttpErrorResponse } from '@angular/common/http';
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
import { AuthApiService, RestaurantRegistration } from '../../auth-api.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { FieldErrors } from '../../../../shared/components/field-errors/field-errors';

interface RestaurantSignupModel extends RestaurantRegistration {
  confirmPassword: string;
}

@Component({
  selector: 'app-restaurant-signup',
  imports: [NgIcon, RouterLink, NgxMaskDirective, FormField, FieldErrors],
  templateUrl: './restaurant-signup.html',
  styleUrl: './restaurant-signup.css',
})
export class RestaurantSignup {
  private readonly authApi = inject(AuthApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly states = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
  ];

  readonly model = signal<RestaurantSignupModel>({
    restaurantName: '',
    cnpj: '',
    responsibleName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    postalCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  readonly restaurantForm = form(this.model, (path) => {
    required(path.restaurantName, { message: 'Informe o nome do estabelecimento.' });
    minLength(path.restaurantName, 3, {
      message: 'Informe um nome válido para o estabelecimento.',
    });
    maxLength(path.restaurantName, 120, { message: 'Use no máximo 120 caracteres.' });

    required(path.cnpj, { message: 'Informe o CNPJ.' });
    minLength(path.cnpj, 14, { message: 'Informe os 14 caracteres do CNPJ.' });

    required(path.responsibleName, { message: 'Informe o nome do responsável.' });
    minLength(path.responsibleName, 3, { message: 'Informe o nome completo do responsável.' });
    maxLength(path.responsibleName, 120, { message: 'Use no máximo 120 caracteres.' });

    required(path.email, { message: 'Informe o e-mail comercial.' });
    email(path.email, { message: 'Informe um e-mail válido.' });
    maxLength(path.email, 254, { message: 'Informe um e-mail válido.' });

    required(path.phone, { message: 'Informe o telefone comercial.' });
    minLength(path.phone, 10, { message: 'Informe o telefone com DDD.' });
    maxLength(path.phone, 11, { message: 'Informe um telefone válido.' });

    required(path.postalCode, { message: 'Informe o CEP.' });
    minLength(path.postalCode, 8, { message: 'Informe os 8 dígitos do CEP.' });
    required(path.street, { message: 'Informe o endereço.' });
    maxLength(path.street, 120, { message: 'Use no máximo 120 caracteres.' });
    required(path.number, { message: 'Informe o número ou S/N.' });
    maxLength(path.number, 20, { message: 'Use no máximo 20 caracteres.' });
    maxLength(path.complement, 120, { message: 'Use no máximo 120 caracteres.' });
    required(path.neighborhood, { message: 'Informe o bairro.' });
    maxLength(path.neighborhood, 120, { message: 'Use no máximo 120 caracteres.' });
    required(path.city, { message: 'Informe a cidade.' });
    maxLength(path.city, 120, { message: 'Use no máximo 120 caracteres.' });
    required(path.state, { message: 'Selecione a UF.' });

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
  });

  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    await submit(this.restaurantForm, async (field) => {
      const { confirmPassword: _confirmPassword, ...data } = field().value();

      try {
        await this.authApi.registerRestaurant(data);
      } catch (error) {
        if (!(error instanceof HttpErrorResponse)) throw error;
        const validationMessages: unknown = error.error?.message;
        const message =
          error.status === 409
            ? 'E-mail ou CNPJ já cadastrado.'
            : error.status === 400
              ? Array.isArray(validationMessages) &&
                validationMessages.includes('Informe um CNPJ válido.')
                ? 'Informe um CNPJ válido.'
                : 'Confira os dados informados e tente novamente.'
            : error.status === 503
              ? typeof validationMessages === 'string' &&
                validationMessages.startsWith('Cadastro criado')
                ? validationMessages
                : 'O envio de confirmação por e-mail está indisponível. Tente novamente mais tarde.'
            : error.status === 429
              ? 'Muitas tentativas. Aguarde um momento e tente novamente.'
              : error.status === 0
                ? 'Não foi possível conectar à API. Tente novamente.'
                : 'Não foi possível cadastrar o restaurante. Tente novamente.';
        this.toast.show(message, 'error');
        return;
      }

      const navigated = await this.router.navigate(['/auth/resend-confirmation']);
      if (!navigated) {
        this.toast.show('Cadastro concluído. Verifique seu e-mail antes de entrar.', 'warning');
        return;
      }
      this.toast.show('Cadastro concluído! Confirme seu e-mail para entrar.', 'success');
    });
  }
}
