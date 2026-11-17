import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { provideEnvironmentNgxMask } from 'ngx-mask';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideAppIcons } from '../../../../shared/icons/icons.provider';
import { ClientSignup } from './client-signup';
import { AuthApiService } from '../../auth-api.service';
import { ToastService } from '../../../../core/notifications/toast.service';

describe('ClientSignup', () => {
  let component: ClientSignup;
  let fixture: ComponentFixture<ClientSignup>;
  let registerPersonal: ReturnType<typeof vi.fn>;
  let show: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    registerPersonal = vi.fn().mockResolvedValue(undefined);
    show = vi.fn();
    await TestBed.configureTestingModule({
      imports: [ClientSignup],
      providers: [provideRouter([]), provideEnvironmentNgxMask(), provideAppIcons(),
        { provide: AuthApiService, useValue: { registerPersonal } },
        { provide: ToastService, useValue: { show } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientSignup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('sends a client registration without the password confirmation', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.model.set({
      fullName: 'Pessoa Teste', email: 'teste@example.test', cpf: '52998224725',
      phone: '71912345678', password: 'secure-password', confirmPassword: 'secure-password',
      acceptedTerms: true,
    });
    await component.onSubmit(new SubmitEvent('submit'));
    expect(registerPersonal).toHaveBeenCalledWith({
      name: 'Pessoa Teste', email: 'teste@example.test', cpf: '52998224725',
      phone: '71912345678', password: 'secure-password', acceptedTerms: true, role: 'client',
    });
    expect(navigate).toHaveBeenCalledWith(['/auth/resend-confirmation']);
  });

  it('reports an invalid CPF without navigating away', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    registerPersonal.mockRejectedValue(new HttpErrorResponse({
      status: 400, error: { message: ['Informe um CPF válido.'] },
    }));
    component.model.set({
      fullName: 'Pessoa Teste', email: 'teste@example.test', cpf: '11111111111',
      phone: '71912345678', password: 'secure-password', confirmPassword: 'secure-password',
      acceptedTerms: true,
    });
    await component.onSubmit(new SubmitEvent('submit'));
    expect(show).toHaveBeenCalledWith('Informe um CPF válido.', 'error');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate that the password confirmation matches', () => {
    component.model.update((model) => ({
      ...model,
      password: 'secure-pass-123',
      confirmPassword: 'different-pass',
    }));

    expect(component.clientForm.confirmPassword().errors()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'passwordMismatch' })]),
    );
  });
});
