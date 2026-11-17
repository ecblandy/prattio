import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';

export interface LoginCredentials {
  email: string;
  password: string;
}

export type UserRole = 'client' | 'motoboy' | 'restaurant';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  onboardingCompleted?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthenticatedUser;
}

export interface Announcement {
  id: string;
  category: 'notice' | 'news';
  title: string;
  message: string;
  publishedAt: string;
  readAt: string | null;
}

export interface RestaurantRegistration {
  restaurantName: string;
  cnpj: string;
  responsibleName: string;
  email: string;
  phone: string;
  password: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface PersonalRegistration {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  password: string;
  role: 'client' | 'motoboy';
  acceptedTerms: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly currentSession = signal<LoginResponse | null>(null);

  readonly currentUser = computed(() => this.currentSession()?.user ?? null);
  readonly accessToken = computed(() => this.currentSession()?.accessToken ?? null);

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const session = await firstValueFrom(
      this.http.post<LoginResponse>(`${API_BASE_URL}/auth/login`, credentials),
    );
    this.currentSession.set(session);
    return session;
  }

  logout(): void {
    this.currentSession.set(null);
  }

  async registerRestaurant(data: RestaurantRegistration): Promise<void> {
    await firstValueFrom(this.http.post<{ message: string }>(`${API_BASE_URL}/restaurants`, data));
  }

  async registerPersonal(data: PersonalRegistration): Promise<void> {
    await firstValueFrom(this.http.post<{ message: string }>(`${API_BASE_URL}/auth/register`, data));
  }

  async confirmEmail(token: string): Promise<void> {
    await firstValueFrom(this.http.post<{ message: string }>(`${API_BASE_URL}/auth/verify-email`, { token }));
  }

  async resendConfirmation(email: string): Promise<void> {
    await firstValueFrom(
      this.http.post<{ message: string }>(`${API_BASE_URL}/auth/resend-confirmation`, { email }),
    );
  }

  async completeRestaurantOnboarding(): Promise<void> {
    const token = this.accessToken();
    if (!token) throw new Error('Uma sessão de restaurante é necessária para concluir o guia.');

    await firstValueFrom(
      this.http.post<{ message: string }>(`${API_BASE_URL}/auth/onboarding/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
    this.currentSession.update((session) =>
      session ? { ...session, user: { ...session.user, onboardingCompleted: true } } : session,
    );
  }

  async submitRestaurantFeedback(kind: 'suggestion' | 'problem', message: string): Promise<void> {
    const token = this.accessToken();
    if (!token) throw new Error('Uma sessão de restaurante é necessária para enviar um relato.');

    await firstValueFrom(
      this.http.post<{ message: string }>(`${API_BASE_URL}/auth/restaurant-feedback`, { kind, message }, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );
  }

  async listAnnouncements(): Promise<Announcement[]> {
    const token = this.accessToken();
    if (!token) throw new Error('Uma sessão é necessária para consultar os avisos.');
    return firstValueFrom(this.http.get<Announcement[]>(`${API_BASE_URL}/auth/announcements`, {
      headers: { Authorization: `Bearer ${token}` },
    }));
  }

  async markAnnouncementRead(id: string): Promise<void> {
    const token = this.accessToken();
    if (!token) throw new Error('Uma sessão é necessária para marcar um aviso.');
    await firstValueFrom(this.http.post(`${API_BASE_URL}/auth/announcements/${encodeURIComponent(id)}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    }));
  }

  async requestEmailChange(email: string, password: string): Promise<void> {
    const token = this.accessToken();
    if (!token) throw new Error('Uma sessão é necessária para alterar o e-mail.');
    await firstValueFrom(this.http.post(`${API_BASE_URL}/auth/email-change`, { email, password }, {
      headers: { Authorization: `Bearer ${token}` },
    }));
  }

  async confirmEmailChange(code: string): Promise<void> {
    const token = this.accessToken();
    if (!token) throw new Error('Uma sessão é necessária para confirmar o e-mail.');
    const result = await firstValueFrom(this.http.post<{ message: string; email: string }>(
      `${API_BASE_URL}/auth/email-change/confirm`, { code }, { headers: { Authorization: `Bearer ${token}` } },
    ));
    this.currentSession.update((session) => session ? { ...session, user: { ...session.user, email: result.email } } : session);
  }
}
