import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthApiService } from '../../auth-api.service';
import { provideAppIcons } from '../../../../shared/icons/icons.provider';
import { ResendConfirmation } from './resend-confirmation';

describe('ResendConfirmation', () => {
  let resendConfirmation: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    resendConfirmation = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [ResendConfirmation],
      providers: [provideRouter([]), provideAppIcons(), { provide: AuthApiService, useValue: { resendConfirmation } }],
    }).compileComponents();
  });

  it('shows a generic response after requesting a new link', async () => {
    const component = TestBed.createComponent(ResendConfirmation).componentInstance;
    component.model.set({ email: 'user@example.test' });
    await component.onSubmit(new SubmitEvent('submit'));

    expect(resendConfirmation).toHaveBeenCalledWith('user@example.test');
    expect(component.message()).toContain('Se houver uma conta pendente');
  });

  it('shows a spinner while requesting a new link', async () => {
    let resolveRequest!: () => void;
    resendConfirmation.mockReturnValue(new Promise<void>((resolve) => (resolveRequest = resolve)));
    const fixture = TestBed.createComponent(ResendConfirmation);
    fixture.componentInstance.model.set({ email: 'user@example.test' });

    const submission = fixture.componentInstance.onSubmit(new SubmitEvent('submit'));
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#confirmation-email');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(input.placeholder).not.toBe('');
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('ng-icon[name="lucideLoaderCircle"]')).toBeTruthy();

    resolveRequest();
    await submission;
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
  });

  it('shows a clear message when the request is rate limited', async () => {
    resendConfirmation.mockRejectedValue(new HttpErrorResponse({ status: 429 }));
    const component = TestBed.createComponent(ResendConfirmation).componentInstance;
    component.model.set({ email: 'user@example.test' });
    await component.onSubmit(new SubmitEvent('submit'));
    expect(component.error()).toContain('Muitas tentativas');
  });
});
