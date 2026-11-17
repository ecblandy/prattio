import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEnvironmentNgxMask } from 'ngx-mask';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideAppIcons } from '../../../../shared/icons/icons.provider';
import { MotoboySignup } from './motoboy-signup';

describe('MotoboySignup', () => {
  let component: MotoboySignup;
  let fixture: ComponentFixture<MotoboySignup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MotoboySignup],
      providers: [provideRouter([]), provideEnvironmentNgxMask(), provideAppIcons()],
    }).compileComponents();

    fixture = TestBed.createComponent(MotoboySignup);
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

    expect(component.motoboyForm.confirmPassword().errors()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'passwordMismatch' })]),
    );
  });
});
