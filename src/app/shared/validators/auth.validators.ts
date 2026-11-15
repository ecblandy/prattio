import { required, email } from '@angular/forms/signals';

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
}

export function forgotPasswordValidators(path: any) {
  required(path.email, {
    message: 'Email é obrigatório.',
  });

  email(path.email, {
    message: 'Digite um email válido.',
  });
}
