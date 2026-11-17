import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideEnvironmentNgxMask } from 'ngx-mask';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideAppIcons } from '../../../../shared/icons/icons.provider';
import { MotoboySignup } from './motoboy-signup';
import { AuthApiService } from '../../auth-api.service';
import { ToastService } from '../../../../core/notifications/toast.service';

describe('MotoboySignup', () => {
  let component: MotoboySignup;
  let fixture: ComponentFixture<MotoboySignup>;
  let registerPersonal: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    registerPersonal = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [MotoboySignup],
      providers: [provideRouter([]), provideEnvironmentNgxMask(), provideAppIcons(),
        { provide: AuthApiService, useValue: { registerPersonal } },
        { provide: ToastService, useValue: { show: vi.fn() } }],
    }).compileComponents();

    fixture = TestBed.createComponent(MotoboySignup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('sends a motoboy registration without the password confirmation', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.model.set({
      name: 'Pessoa Teste', email: 'teste@example.test', cpf: '52998224725',
      phone: '71912345678', password: 'secure-password', confirmPassword: 'secure-password',
      acceptedTerms: true,
    });
    await component.onSubmit(new SubmitEvent('submit'));
    expect(registerPersonal).toHaveBeenCalledWith({
      name: 'Pessoa Teste', email: 'teste@example.test', cpf: '52998224725',
      phone: '71912345678', password: 'secure-password', acceptedTerms: true, role: 'motoboy',
    });
    expect(navigate).toHaveBeenCalledWith(['/auth/resend-confirmation']);
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

    expect(component.motoboyForm.confirmPassword().errors()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'passwordMismatch' })]),
    );
  });
});
