import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

import { AuthApiService } from '../../auth-api.service';

@Component({
  selector: 'app-confirm-email',
  imports: [RouterLink, NgIcon],
  templateUrl: './confirm-email.html',
})
export class ConfirmEmail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly authApi = inject(AuthApiService);

  readonly state = signal<'loading' | 'success' | 'error'>('loading');
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const token = new URLSearchParams(this.route.snapshot.fragment ?? '').get('token');
    this.location.replaceState('/auth/confirm-email');
    if (!token || !/^[0-9a-f]{64}$/.test(token)) {
      this.errorMessage.set('O link de confirmação é inválido ou expirou.');
      this.state.set('error');
      return;
    }
    void this.confirm(token);
  }

  private async confirm(token: string): Promise<void> {
    try {
      await this.authApi.confirmEmail(token);
      this.state.set('success');
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      this.errorMessage.set(
        error.status === 400
          ? 'O link de confirmação é inválido ou expirou.'
          : error.status === 429
            ? 'Muitas tentativas. Aguarde e tente novamente.'
            : 'Não foi possível confirmar o e-mail. Tente novamente.',
      );
      this.state.set('error');
    }
  }
}
