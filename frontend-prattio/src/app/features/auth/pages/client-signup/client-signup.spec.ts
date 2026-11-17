import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEnvironmentNgxMask } from 'ngx-mask';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideAppIcons } from '../../../../shared/icons/icons.provider';
import { ClientSignup } from './client-signup';

describe('ClientSignup', () => {
  let component: ClientSignup;
  let fixture: ComponentFixture<ClientSignup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientSignup],
      providers: [provideRouter([]), provideEnvironmentNgxMask(), provideAppIcons()],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientSignup);
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

    expect(component.clientForm.confirmPassword().errors()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'passwordMismatch' })]),
    );
  });
});
