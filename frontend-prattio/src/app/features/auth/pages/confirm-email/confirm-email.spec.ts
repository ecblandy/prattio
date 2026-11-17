import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { AuthApiService } from '../../auth-api.service';
import { ConfirmEmail } from './confirm-email';

describe('ConfirmEmail', () => {
  const token = 'a'.repeat(64);
  let confirmEmail: ReturnType<typeof vi.fn>;
  let replaceState: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    confirmEmail = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [ConfirmEmail],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { fragment: `token=${token}` } } },
        { provide: AuthApiService, useValue: { confirmEmail } },
      ],
    }).compileComponents();
    replaceState = vi.spyOn(TestBed.inject(Location), 'replaceState');
  });

  it('removes the token from the URL and confirms the account', async () => {
    const fixture = TestBed.createComponent(ConfirmEmail);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(replaceState).toHaveBeenCalledWith('/auth/confirm-email');
    expect(confirmEmail).toHaveBeenCalledWith(token);
    expect(fixture.componentInstance.state()).toBe('success');
  });

  it('shows an error when the link has expired', async () => {
    confirmEmail.mockRejectedValue(new HttpErrorResponse({ status: 400 }));
    const fixture = TestBed.createComponent(ConfirmEmail);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.state()).toBe('error');
    expect(fixture.componentInstance.errorMessage()).toContain('inválido ou expirou');
  });
});
