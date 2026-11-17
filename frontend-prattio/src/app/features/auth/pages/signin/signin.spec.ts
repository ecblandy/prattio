import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { AuthApiService, LoginResponse } from '../../auth-api.service';
import { ToastService } from '../../../../core/notifications/toast.service';

import { Signin } from './signin';

describe('Signin', () => {
  let component: Signin;
  let fixture: ComponentFixture<Signin>;
  let login: ReturnType<typeof vi.fn>;
  let showToast: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;
  const session: LoginResponse = {
    accessToken: 'test-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: {
      id: '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9a',
      name: 'Test User',
      email: 'user@example.com',
      role: 'client',
    },
  };

  beforeEach(async () => {
    login = vi.fn().mockResolvedValue(session);
    showToast = vi.fn();

    await TestBed.configureTestingModule({
      imports: [Signin],
      providers: [
        provideRouter([]),
        { provide: AuthApiService, useValue: { login } },
        { provide: ToastService, useValue: { show: showToast } },
      ],
    })
      .compileComponents();

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Signin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links to the signup profile selection', () => {
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      'a[href="/auth/user-profile"]',
    );
    expect(link.textContent).toContain('Cadastre-se');
  });

  it('submits credentials to the API and shows success feedback', async () => {
    const credentials = { email: 'user@example.com', password: 'secure-password' };
    component.signinModel.set(credentials);

    await component.authenticate(new SubmitEvent('submit'));

    expect(login).toHaveBeenCalledWith(credentials);
    expect(showToast).toHaveBeenCalledWith('Login realizado com sucesso.', 'success');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirects restaurant users to the store dashboard', async () => {
    login.mockResolvedValue({ ...session, user: { ...session.user, role: 'restaurant' } });
    component.signinModel.set({ email: 'loja@example.com', password: 'secure-password' });

    await component.authenticate(new SubmitEvent('submit'));

    expect(navigate).toHaveBeenCalledWith(['/restaurant']);
    expect(showToast).toHaveBeenCalledWith('Login realizado com sucesso.', 'success');
  });

  it('reports when navigation to the store dashboard is cancelled', async () => {
    login.mockResolvedValue({ ...session, user: { ...session.user, role: 'restaurant' } });
    navigate.mockResolvedValue(false);
    component.signinModel.set({ email: 'loja@example.com', password: 'secure-password' });

    await component.authenticate(new SubmitEvent('submit'));

    expect(showToast).toHaveBeenCalledWith('Não foi possível abrir o painel da loja.', 'error');
    expect(showToast).not.toHaveBeenCalledWith('Login realizado com sucesso.', 'success');
  });

  it('shows a spinner and disables the button while the request is pending', async () => {
    let resolveLogin!: (value: LoginResponse) => void;
    login.mockReturnValue(new Promise<LoginResponse>((resolve) => (resolveLogin = resolve)));
    component.signinModel.set({ email: 'user@example.com', password: 'secure-password' });

    const submission = component.authenticate(new SubmitEvent('submit'));
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.textContent).toContain('Entrando...');
    expect(button.querySelector('.signin-spinner')).toBeTruthy();

    resolveLogin(session);
    await submission;
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
    expect(button.querySelector('.signin-spinner')).toBeNull();
  });

  it('shows a useful message when credentials are rejected', async () => {
    login.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
    component.signinModel.set({ email: 'user@example.com', password: 'secure-password' });

    await component.authenticate(new SubmitEvent('submit'));

    expect(showToast).toHaveBeenCalledWith('Email ou senha inválidos.', 'error');
  });
});
