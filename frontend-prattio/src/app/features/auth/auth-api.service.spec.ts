import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthApiService, LoginResponse, RestaurantRegistration } from './auth-api.service';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('posts credentials and keeps the returned session in memory', async () => {
    const credentials = { email: 'user@example.com', password: 'secure-password' };
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

    const login = service.login(credentials);
    const request = httpTestingController.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);
    request.flush(session);

    await expect(login).resolves.toEqual(session);
    expect(service.accessToken()).toBe('test-token');
    expect(service.currentUser()).toEqual(session.user);
    service.logout();
    expect(service.accessToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('sends restaurant details to the registration endpoint', async () => {
    const data: RestaurantRegistration = {
      restaurantName: 'Restaurante de teste',
      cnpj: '11222333000181',
      responsibleName: 'Pessoa Teste',
      email: 'teste@example.com',
      phone: '11999991234',
      password: 'secure-password',
      postalCode: '01001000',
      street: 'Praça da Sé',
      number: '1',
      complement: '',
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP',
    };

    const registration = service.registerRestaurant(data);
    const request = httpTestingController.expectOne('/api/restaurants');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(data);
    request.flush({ message: 'Restaurante cadastrado com sucesso.' }, { status: 201, statusText: 'Created' });
    await expect(registration).resolves.toBeUndefined();
  });

  it('saves guide completion with the session token and updates the current user', async () => {
    const login = service.login({ email: 'store@example.test', password: 'secure-password' });
    httpTestingController.expectOne('/api/auth/login').flush({
      accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 900,
      user: { id: 'user-id', name: 'Pessoa', email: 'store@example.test', role: 'restaurant', onboardingCompleted: false },
    });
    await login;

    const completion = service.completeRestaurantOnboarding();
    const request = httpTestingController.expectOne('/api/auth/onboarding/complete');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush({ message: 'Guia inicial concluído.' });
    await completion;
    expect(service.currentUser()?.onboardingCompleted).toBe(true);
  });

  it('sends authenticated feedback and retrieves announcements', async () => {
    const login = service.login({ email: 'store@example.test', password: 'secure-password' });
    httpTestingController.expectOne('/api/auth/login').flush({
      accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 900,
      user: { id: 'user-id', name: 'Pessoa', email: 'store@example.test', role: 'restaurant' },
    });

    await login;

    const feedback = service.submitRestaurantFeedback('problem', 'Descrição do problema');
    const feedbackRequest = httpTestingController.expectOne('/api/auth/restaurant-feedback');
    expect(feedbackRequest.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(feedbackRequest.request.body).toEqual({ kind: 'problem', message: 'Descrição do problema' });
    feedbackRequest.flush({ message: 'Relato registrado.' });
    await feedback;

    const notices = service.listAnnouncements();
    const noticesRequest = httpTestingController.expectOne('/api/auth/announcements');
    expect(noticesRequest.request.headers.get('Authorization')).toBe('Bearer test-token');
    noticesRequest.flush([]);
    await expect(notices).resolves.toEqual([]);

    const read = service.markAnnouncementRead('notice-id');
    const readRequest = httpTestingController.expectOne('/api/auth/announcements/notice-id/read');
    expect(readRequest.request.headers.get('Authorization')).toBe('Bearer test-token');
    readRequest.flush({ message: 'Aviso marcado como lido.' });
    await read;
  });

  it('updates the displayed email only after confirming the code', async () => {
    const login = service.login({ email: 'old@example.test', password: 'secure-password' });
    httpTestingController.expectOne('/api/auth/login').flush({
      accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 900,
      user: { id: 'user-id', name: 'Pessoa', email: 'old@example.test', role: 'restaurant' },
    });
    await login;
    const request = service.requestEmailChange('new@example.test', 'secure-password');
    const send = httpTestingController.expectOne('/api/auth/email-change');
    expect(send.request.headers.get('Authorization')).toBe('Bearer test-token');
    send.flush({ message: 'Código enviado.' });
    await request;
    expect(service.currentUser()?.email).toBe('old@example.test');
    const confirmation = service.confirmEmailChange('01234567');
    const confirm = httpTestingController.expectOne('/api/auth/email-change/confirm');
    expect(confirm.request.body).toEqual({ code: '01234567' });
    expect(confirm.request.headers.get('Authorization')).toBe('Bearer test-token');
    confirm.flush({ message: 'E-mail alterado.', email: 'new@example.test' });
    await confirmation;
    expect(service.currentUser()?.email).toBe('new@example.test');
  });
});
