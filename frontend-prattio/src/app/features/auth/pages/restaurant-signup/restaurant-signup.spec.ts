import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { provideEnvironmentNgxMask } from 'ngx-mask';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideAppIcons } from '../../../../shared/icons/icons.provider';
import { AuthApiService } from '../../auth-api.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { RestaurantSignup } from './restaurant-signup';

describe('RestaurantSignup', () => {
  let component: RestaurantSignup;
  let fixture: ComponentFixture<RestaurantSignup>;
  let registerRestaurant: ReturnType<typeof vi.fn>;
  let show: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;
  const validForm = {
    restaurantName: 'Restaurante de teste',
    cnpj: '11222333000181',
    responsibleName: 'Pessoa Teste',
    email: 'teste@example.com',
    phone: '11999991234',
    password: 'secure-password',
    confirmPassword: 'secure-password',
    postalCode: '01001000',
    street: 'Praça da Sé',
    number: '1',
    complement: '',
    neighborhood: 'Sé',
    city: 'São Paulo',
    state: 'SP',
  };

  beforeEach(async () => {
    registerRestaurant = vi.fn().mockResolvedValue(undefined);
    show = vi.fn();
    await TestBed.configureTestingModule({
      imports: [RestaurantSignup],
      providers: [
        provideRouter([]),
        provideEnvironmentNgxMask(),
        provideAppIcons(),
        { provide: AuthApiService, useValue: { registerRestaurant } },
        { provide: ToastService, useValue: { show } },
      ],
    }).compileComponents();

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(RestaurantSignup);
    component = fixture.componentInstance;
    await fixture.whenStable();
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

    expect(component.restaurantForm.confirmPassword().errors()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'passwordMismatch' })]),
    );
  });

  it('accepts and formats landline and mobile phone numbers as they are typed', async () => {
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#restaurant-phone');
    expect(input.maxLength === -1 || input.maxLength >= 15).toBe(true);
    input.focus();
    const typeDigit = async (digit: string) => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: digit, code: `Numpad${digit}`, bubbles: true }));
      input.setRangeText(digit, input.selectionStart!, input.selectionEnd!, 'end');
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: digit }));
      await fixture.whenStable();
    };

    for (const digit of '1199999123') {
      await typeDigit(digit);
    }

    expect(input.value).toBe('(11) 9999-9123');
    expect(component.model().phone).toBe('1199999123');
    expect(component.restaurantForm.phone().errors()).toEqual([]);

    await typeDigit('4');

    expect(input.value).toBe('(11) 99999-1234');
    expect(component.model().phone).toBe('11999991234');
    expect(component.restaurantForm.phone().errors()).toEqual([]);
  });

  it('accepts rapid numeric-keypad input', async () => {
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#restaurant-phone');
    input.focus();
    for (const digit of '71912345678') {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: digit, code: `Numpad${digit}`, bubbles: true }));
      input.setRangeText(digit, input.selectionStart!, input.selectionEnd!, 'end');
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: digit }));
    }
    await fixture.whenStable();

    expect(input.value).toBe('(71) 91234-5678');
    expect(component.model().phone).toBe('71912345678');
  });

  it('rejects a phone number longer than 11 digits in the form model', () => {
    component.model.update((model) => ({ ...model, phone: '119999912345' }));
    expect(component.restaurantForm.phone().errors()).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: 'Informe um telefone válido.' })]),
    );
  });

  it('provides guidance in the address inputs', () => {
    fixture.detectChanges();
    for (const id of ['restaurant-street', 'restaurant-complement', 'restaurant-neighborhood', 'restaurant-city']) {
      const input: HTMLInputElement = fixture.nativeElement.querySelector(`#${id}`);
      expect(input.placeholder).not.toBe('');
    }
  });

  it('shows a spinner and disables registration while the request is pending', async () => {
    let resolveRegistration!: () => void;
    registerRestaurant.mockReturnValue(new Promise<void>((resolve) => (resolveRegistration = resolve)));
    component.model.set(validForm);

    const submission = component.onSubmit(new SubmitEvent('submit'));
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.textContent).toContain('Cadastrando...');
    expect(button.querySelector('ng-icon[name="lucideLoaderCircle"]')).toBeTruthy();

    resolveRegistration();
    await submission;
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
  });

  it('submits the registration without the password confirmation and goes to email confirmation', async () => {
    component.model.set(validForm);
    await component.onSubmit(new SubmitEvent('submit'));

    const { confirmPassword: _confirmPassword, ...data } = validForm;
    expect(registerRestaurant).toHaveBeenCalledWith(data);
    expect(navigate).toHaveBeenCalledWith(['/auth/resend-confirmation']);
    expect(show).toHaveBeenCalledWith('Cadastro concluído! Confirme seu e-mail para entrar.', 'success');
  });

  it('shows a conflict without navigating away', async () => {
    registerRestaurant.mockRejectedValue(new HttpErrorResponse({ status: 409 }));
    component.model.set(validForm);
    await component.onSubmit(new SubmitEvent('submit'));

    expect(show).toHaveBeenCalledWith('E-mail ou CNPJ já cadastrado.', 'error');
    expect(navigate).not.toHaveBeenCalled();
  });
});
