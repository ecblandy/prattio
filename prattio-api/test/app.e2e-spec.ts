import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { DatabaseService } from './../src/database/database.service.js';
import { UsersRepository } from './../src/auth/users.repository.js';
import { RestaurantsService } from './../src/restaurants/restaurants.service.js';
import { AppModule } from './../src/app.module.js';
import { RestaurantFeedbackService } from './../src/auth/restaurant-feedback.service.js';
import { AnnouncementsService } from './../src/auth/announcements.service.js';
import { EmailChangeService } from './../src/auth/email-change.service.js';
import { PersonalRegistrationService } from './../src/auth/personal-registration.service.js';
import { io, Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import { corsOptions } from './../src/cors.config.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let findByEmail: ReturnType<typeof vi.fn>;
  let register: ReturnType<typeof vi.fn>;
  let registerPersonal: ReturnType<typeof vi.fn>;
  let completeRestaurantOnboarding: ReturnType<typeof vi.fn>;
  let submitFeedback: ReturnType<typeof vi.fn>;
  let listAnnouncements: ReturnType<typeof vi.fn>;
  let markAnnouncementRead: ReturnType<typeof vi.fn>;
  let requestEmailChange: ReturnType<typeof vi.fn>;
  let confirmEmailChange: ReturnType<typeof vi.fn>;
  const registration = {
    restaurantName: 'Restaurante de teste',
    cnpj: '11.222.333/0001-81',
    responsibleName: 'Pessoa Teste',
    email: 'TESTE@example.com',
    phone: '(11) 99999-1234',
    password: 'secure-password',
    postalCode: '01001-000',
    street: 'Praça da Sé',
    number: '1',
    complement: '',
    neighborhood: 'Sé',
    city: 'São Paulo',
    state: 'sp',
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-jwt-signing';
    findByEmail = vi.fn().mockResolvedValue(undefined);
    completeRestaurantOnboarding = vi.fn().mockResolvedValue(true);
    register = vi.fn().mockResolvedValue({ message: 'Restaurante cadastrado com sucesso.' });
    registerPersonal = vi.fn().mockResolvedValue({ message: 'Cadastro criado. Confirme seu e-mail para entrar.' });
    submitFeedback = vi.fn().mockResolvedValue({ message: 'Relato registrado.' });
    listAnnouncements = vi.fn().mockResolvedValue([]);
    markAnnouncementRead = vi.fn().mockResolvedValue({ message: 'Aviso marcado como lido.' });
    requestEmailChange = vi.fn().mockResolvedValue({ message: 'Código enviado.' });
    confirmEmailChange = vi.fn().mockResolvedValue({ message: 'E-mail alterado.', email: 'novo@example.test' });
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({ db: {}, onApplicationShutdown: async () => {} })
      .overrideProvider(UsersRepository)
      .useValue({ findByEmail, completeRestaurantOnboarding })
      .overrideProvider(RestaurantsService)
      .useValue({ register })
      .overrideProvider(PersonalRegistrationService)
      .useValue({ register: registerPersonal })
      .overrideProvider(RestaurantFeedbackService)
      .useValue({ submit: submitFeedback })
      .overrideProvider(AnnouncementsService)
      .useValue({ list: listAnnouncements, markRead: markAnnouncementRead })
      .overrideProvider(EmailChangeService)
      .useValue({ request: requestEmailChange, confirm: confirmEmailChange })
      .compile();

    app = moduleFixture.createNestApplication();
    app.enableCors(corsOptions());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('handles CORS preflight for allowed origins without authorizing unknown origins', async () => {
    const allowed = await request(app.getHttpServer()).options('/auth/login')
      .set('Origin', 'http://localhost:4200')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type')
      .expect(204);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:4200');
    expect(allowed.headers['access-control-allow-headers']).toContain('Authorization');
    const rejected = await request(app.getHttpServer()).options('/auth/login')
      .set('Origin', 'https://untrusted.example.test')
      .set('Access-Control-Request-Method', 'POST');
    expect(rejected.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('/auth/login (POST) rejects invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'secure-password' })
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Email ou senha inválidos.');
      });
  });

  it('/auth/login (POST) returns an access token for valid credentials', async () => {
    findByEmail.mockResolvedValue({
      id: '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9a',
      name: 'Test User',
      email: 'user@example.com',
      passwordHash: await argon2.hash('secure-password'),
      role: 'client',
      emailVerifiedAt: new Date(),
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'secure-password' })
      .expect(200);

    expect(response.body).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 900,
      user: {
        id: '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9a',
        name: 'Test User',
        email: 'user@example.com',
        role: 'client',
      },
    });
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('/auth/login (POST) blocks accounts with unconfirmed email', async () => {
    findByEmail.mockResolvedValue({
      id: '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9a',
      email: 'user@example.com',
      passwordHash: await argon2.hash('secure-password'),
      role: 'restaurant',
      emailVerifiedAt: null,
    });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'secure-password' })
      .expect(403)
      .expect(({ body }) => {
        expect(body.message).toBe('Confirme seu e-mail antes de entrar.');
      });
  });

  it('/auth/login (POST) validates request fields', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('accepts both personal roles and normalizes registration details', async () => {
    const data = {
      name: ' Pessoa Teste ', email: 'TESTE@example.test', cpf: '529.982.247-25',
      phone: '(71) 91234-5678', password: 'secure-password', acceptedTerms: true,
    };
    for (const role of ['client', 'motoboy']) {
      await request(app.getHttpServer()).post('/auth/register').send({ ...data, role }).expect(201);
      expect(registerPersonal).toHaveBeenLastCalledWith({
        ...data, name: 'Pessoa Teste', email: 'teste@example.test',
        cpf: '52998224725', phone: '71912345678', role,
      });
    }
  });

  it('rejects invalid CPF, unaccepted terms and unsupported roles', async () => {
    const valid = {
      name: 'Pessoa Teste', email: 'teste@example.test', cpf: '52998224725',
      phone: '71912345678', password: 'secure-password', acceptedTerms: true, role: 'client',
    };
    await request(app.getHttpServer()).post('/auth/register').send({ ...valid, cpf: '11111111111' }).expect(400);
    await request(app.getHttpServer()).post('/auth/register').send({ ...valid, acceptedTerms: false }).expect(400);
    await request(app.getHttpServer()).post('/auth/register').send({ ...valid, role: 'restaurant' }).expect(400);
    expect(registerPersonal).not.toHaveBeenCalled();
  });

  it('/auth/onboarding/complete requires a valid restaurant session', async () => {
    const endpoint = '/auth/onboarding/complete';
    const jwt = app.get(JwtService);
    const userId = '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9a';
    await request(app.getHttpServer()).post(endpoint).expect(401);
    await request(app.getHttpServer()).post(endpoint).set('Authorization', 'Bearer invalid').expect(401);
    const expired = await jwt.signAsync({ sub: userId, role: 'restaurant' }, { expiresIn: -1 });
    await request(app.getHttpServer()).post(endpoint).set('Authorization', `Bearer ${expired}`).expect(401);
    const client = await jwt.signAsync({ sub: userId, role: 'client' });
    await request(app.getHttpServer()).post(endpoint).set('Authorization', `Bearer ${client}`).expect(403);
    const restaurant = await jwt.signAsync({ sub: userId, role: 'restaurant' });
    await request(app.getHttpServer()).post(endpoint).set('Authorization', `Bearer ${restaurant}`).expect(200);
    expect(completeRestaurantOnboarding).toHaveBeenCalledOnce();
    expect(completeRestaurantOnboarding).toHaveBeenCalledWith(userId);
  });

  it('accepts validated feedback only from an authenticated restaurant', async () => {
    const endpoint = '/auth/restaurant-feedback';
    const jwt = app.get(JwtService);
    const userId = '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9a';
    const client = await jwt.signAsync({ sub: userId, role: 'client' });
    const restaurant = await jwt.signAsync({ sub: userId, role: 'restaurant' });
    const valid = { kind: 'problem', message: '  A tela não abre corretamente.  ' };
    await request(app.getHttpServer()).post(endpoint).send(valid).expect(401);
    await request(app.getHttpServer()).post(endpoint).set('Authorization', `Bearer ${client}`).send(valid).expect(403);
    await request(app.getHttpServer()).post(endpoint).set('Authorization', `Bearer ${restaurant}`).send({ kind: 'problem', message: '   ' }).expect(400);
    await request(app.getHttpServer()).post(endpoint).set('Authorization', `Bearer ${restaurant}`).send({ kind: 'other', message: 'Descrição suficiente' }).expect(400);
    await request(app.getHttpServer()).post(endpoint).set('Authorization', `Bearer ${restaurant}`).send(valid).expect(201);
    expect(submitFeedback).toHaveBeenCalledOnce();
    expect(submitFeedback).toHaveBeenCalledWith(userId, { kind: 'problem', message: 'A tela não abre corretamente.' });
  });

  it('requires a valid session for notices and uses its identity for reading', async () => {
    const userId = '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9a';
    const id = '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9b';
    const token = await app.get(JwtService).signAsync({ sub: userId, role: 'motoboy' });
    await request(app.getHttpServer()).get('/auth/announcements').expect(401);
    await request(app.getHttpServer()).get('/auth/announcements').set('Authorization', `Bearer ${token}`).expect(200);
    expect(listAnnouncements).toHaveBeenCalledWith({ id: userId, role: 'motoboy' });
    await request(app.getHttpServer()).post('/auth/announcements/invalid/read').set('Authorization', `Bearer ${token}`).expect(400);
    await request(app.getHttpServer()).post(`/auth/announcements/${id}/read`).set('Authorization', `Bearer ${token}`).expect(200);
    expect(markAnnouncementRead).toHaveBeenCalledWith({ id: userId, role: 'motoboy' }, id);
  });

  it('synchronizes reads only to authenticated sockets belonging to the same user', async () => {
    const userId = '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9a';
    const otherId = '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9c';
    const noticeId = '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9b';
    const jwt = app.get(JwtService);
    const token = await jwt.signAsync({ sub: userId, role: 'restaurant' });
    const otherToken = await jwt.signAsync({ sub: otherId, role: 'restaurant' });
    await app.listen(0, '127.0.0.1');
    const url = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
    const sockets: Socket[] = [];
    const createSocket = (authToken: string, origin = 'http://127.0.0.1:18080') => {
      const socket = io(url, { transports: ['websocket'], auth: { token: authToken }, extraHeaders: { Origin: origin }, forceNew: true, reconnection: false });
      sockets.push(socket);
      return socket;
    };
    const connected = (socket: Socket) => new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    try {
      const first = createSocket(token);
      const second = createSocket(token);
      const other = createSocket(otherToken);
      await Promise.all([connected(first), connected(second), connected(other)]);
      const firstRead = vi.fn();
      const secondRead = vi.fn();
      const otherRead = vi.fn();
      first.on('announcement:read', firstRead);
      second.on('announcement:read', secondRead);
      other.on('announcement:read', otherRead);
      const received = Promise.all([first, second].map((socket) =>
        new Promise<void>((resolve) => socket.once('announcement:read', () => resolve())),
      ));
      await request(app.getHttpServer()).post(`/auth/announcements/${noticeId}/read`)
        .set('Authorization', `Bearer ${token}`).expect(200);
      await received;
      expect(firstRead).toHaveBeenCalledWith({ id: noticeId });
      expect(secondRead).toHaveBeenCalledWith({ id: noticeId });
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(otherRead).not.toHaveBeenCalled();

      const invalid = createSocket('invalid-token');
      await expect(connected(invalid)).rejects.toThrow();
      const expiredToken = await jwt.signAsync({ sub: userId, role: 'restaurant' }, { expiresIn: -1 });
      await expect(connected(createSocket(expiredToken))).rejects.toThrow();
      const shortToken = await jwt.signAsync({ sub: userId, role: 'restaurant' }, { expiresIn: 3 });
      const shortSession = createSocket(shortToken);
      await connected(shortSession);
      const disconnected = new Promise<string>((resolve) => shortSession.once('disconnect', resolve));
      expect(await disconnected).toBe('io server disconnect');
      const forbiddenOrigin = createSocket(token, 'https://untrusted.example.test');
      await expect(connected(forbiddenOrigin)).rejects.toThrow();
    } finally {
      sockets.forEach((socket) => socket.disconnect());
    }
  });

  it('requires authentication and validates email change requests and codes', async () => {
    const userId = '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9a';
    const token = await app.get(JwtService).signAsync({ sub: userId, role: 'restaurant' });
    await request(app.getHttpServer()).post('/auth/email-change').send({ email: 'novo@example.test', password: 'secure-password' }).expect(401);
    await request(app.getHttpServer()).post('/auth/email-change').set('Authorization', `Bearer ${token}`)
      .send({ email: '  NOVO@example.test  ', password: 'secure-password' }).expect(201);
    expect(requestEmailChange).toHaveBeenCalledWith(userId, { email: 'novo@example.test', password: 'secure-password' });
    await request(app.getHttpServer()).post('/auth/email-change/confirm').send({ code: '12345678' }).expect(401);
    await request(app.getHttpServer()).post('/auth/email-change/confirm').set('Authorization', `Bearer ${token}`).send({ code: '1234' }).expect(400);
    await request(app.getHttpServer()).post('/auth/email-change/confirm').set('Authorization', `Bearer ${token}`).send({ code: '01234567' }).expect(200);
    expect(confirmEmailChange).toHaveBeenCalledWith(userId, '01234567');
  });

  it('/auth/onboarding/complete rejects a session whose restaurant account is unavailable', async () => {
    completeRestaurantOnboarding.mockResolvedValue(false);
    const token = await app.get(JwtService).signAsync({
      sub: '18a6b0bd-f951-4e79-a24d-0c8b9b21ac9a',
      role: 'restaurant',
    });
    await request(app.getHttpServer())
      .post('/auth/onboarding/complete')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('/restaurants (POST) validates and normalizes registration data', async () => {
    await request(app.getHttpServer())
      .post('/restaurants')
      .send(registration)
      .expect(201);

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({
        cnpj: '11222333000181',
        email: 'teste@example.com',
        phone: '11999991234',
        postalCode: '01001000',
        state: 'SP',
      }),
    );
  });

  it('/restaurants (POST) rejects invalid CNPJ and missing address', async () => {
    await request(app.getHttpServer())
      .post('/restaurants')
      .send({ ...registration, cnpj: '11222333000180', street: '' })
      .expect(400);

    expect(register).not.toHaveBeenCalled();
  });

  it('/restaurants (POST) accepts a valid alphanumeric CNPJ', async () => {
    await request(app.getHttpServer())
      .post('/restaurants')
      .send({ ...registration, cnpj: '12.ABC.345/01DE-35' })
      .expect(201);

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ cnpj: '12ABC34501DE35' }),
    );
  });

  afterEach(async () => {
    await app.close();
  });
});
