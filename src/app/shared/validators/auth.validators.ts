import { email, minLength, required } from '@angular/forms/signals';

export function signinValidators(path: any) {
  required(path.email, {
    message: 'Email é obrigatório.',
  });

  email(path.email, {
    message: 'Digite um email válido.',
  });

  required(path.password, {
    message: 'Senha é obrigatória.',
  });

  minLength(path.password, 8, {
    message: 'A senha deve ter pelo menos 8 caracteres.',
  });
}

export function forgotPasswordValidators(path: any) {
  required(path.email, {
    message: 'Email é obrigatório.',
  });

  email(path.email, {
    message: 'Digite um email válido.',
  });
}
