import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastService } from '../../../core/notifications/toast.service';
import { AuthApiService, PersonalRegistration } from '../auth-api.service';

export async function submitPersonalSignup(
  authApi: AuthApiService,
  router: Router,
  toast: ToastService,
  data: PersonalRegistration,
): Promise<void> {
  try {
    await authApi.registerPersonal(data);
  } catch (error) {
    if (!(error instanceof HttpErrorResponse)) throw error;
    const messages: unknown = error.error?.message;
    const message = error.status === 409
      ? 'E-mail já cadastrado.'
      : error.status === 400
        ? Array.isArray(messages) && messages.includes('Informe um CPF válido.')
          ? 'Informe um CPF válido.'
          : 'Confira os dados informados e tente novamente.'
        : error.status === 503
          ? typeof messages === 'string' && messages.startsWith('Cadastro criado')
            ? messages
            : 'O envio de confirmação por e-mail está indisponível. Tente novamente mais tarde.'
          : error.status === 429
            ? 'Muitas tentativas. Aguarde um momento e tente novamente.'
            : error.status === 0
              ? 'Não foi possível conectar à API. Tente novamente.'
              : 'Não foi possível criar a conta. Tente novamente.';
    toast.show(message, 'error');
    return;
  }

  const navigated = await router.navigate(['/auth/resend-confirmation']);
  if (!navigated) {
    toast.show('Cadastro concluído. Verifique seu e-mail antes de entrar.', 'warning');
    return;
  }
  toast.show('Cadastro concluído! Confirme seu e-mail para entrar.', 'success');
}
