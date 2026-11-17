import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Subject } from 'rxjs';

import { ToastService } from '../../core/notifications/toast.service';
import { provideAppIcons } from '../../shared/icons/icons.provider';
import { RestaurantDashboard } from './restaurant-dashboard';
import { AuthApiService, AuthenticatedUser } from '../auth/auth-api.service';
import { RestaurantDataService, RestaurantOrderRecord } from './restaurant-data.service';
import { AnnouncementLiveService } from './announcement-live.service';

describe('RestaurantDashboard', () => {
  let component: RestaurantDashboard;
  let fixture: ComponentFixture<RestaurantDashboard>;
  let toastService: ToastService;
  let currentUser: ReturnType<typeof signal<AuthenticatedUser | null>>;
  let completeRestaurantOnboarding: ReturnType<typeof vi.fn>;
  let submitRestaurantFeedback: ReturnType<typeof vi.fn>;
  let listAnnouncements: ReturnType<typeof vi.fn>;
  let markAnnouncementRead: ReturnType<typeof vi.fn>;
  let requestEmailChange: ReturnType<typeof vi.fn>;
  let confirmEmailChange: ReturnType<typeof vi.fn>;
  let liveReads: Subject<string>;
  let liveConnections: Subject<void>;

  beforeEach(async () => {
    currentUser = signal<AuthenticatedUser | null>(null);
    completeRestaurantOnboarding = vi.fn().mockResolvedValue(undefined);
    submitRestaurantFeedback = vi.fn().mockResolvedValue(undefined);
    listAnnouncements = vi.fn().mockResolvedValue([]);
    markAnnouncementRead = vi.fn().mockResolvedValue(undefined);
    requestEmailChange = vi.fn().mockResolvedValue(undefined);
    confirmEmailChange = vi.fn().mockResolvedValue(undefined);
    liveReads = new Subject<string>();
    liveConnections = new Subject<void>();
    await TestBed.configureTestingModule({
      imports: [RestaurantDashboard],
      providers: [
        provideRouter([]),
        provideAppIcons(),
        { provide: AuthApiService, useValue: { currentUser, accessToken: signal('test-token'), completeRestaurantOnboarding, submitRestaurantFeedback, listAnnouncements, markAnnouncementRead, requestEmailChange, confirmEmailChange } },
        { provide: AnnouncementLiveService, useValue: { readEvents: liveReads, connected: liveConnections, status: signal('idle'), connect: vi.fn(), disconnect: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantDashboard);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('creates the restaurant operations dashboard', () => {
    expect(component).toBeTruthy();
    expect(component.navItems.map((item) => item.id)).toContain('integrations');
  });

  it('classifies preparation using the configured limit, events and the current clock', () => {
    const data = TestBed.inject(RestaurantDataService);
    const now = Date.parse('2026-01-01T12:00:00Z');
    const base = data.orders()[0];
    const order = (id: string, status: RestaurantOrderRecord['status'], receivedAt: string, scheduledAt?: string): RestaurantOrderRecord =>
      ({ ...base, id, status, receivedAt, scheduledAt });
    const at = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
    component.clock.set(now);
    data.prepSlaMinutes.set(25);
    data.warningBeforeSlaMinutes.set(5);
    data.orders.set([
      order('late', 'Novo', at(25)),
      order('warning', 'Novo', at(20)),
      order('on-time', 'Novo', at(19)),
      order('preparing', 'Em preparo', at(60)),
      order('missing', 'Em preparo', at(60)),
      order('invalid', 'Novo', 'invalid'),
      order('scheduled', 'Novo', at(60), at(-10)),
      order('scheduled-past', 'Novo', at(60), at(30)),
      order('done', 'Concluído', at(60)),
      order('cancelled', 'Cancelado', at(60)),
      order('partial', 'Cancelado parcialmente', at(60)),
    ]);
    data.orderEvents.set([{ id: 'event', orderId: 'preparing', type: 'Em preparo', occurredAt: at(24), actor: 'teste' }]);

    expect(component.latePreparationOrders().map((entry) => entry.order.id)).toEqual(['late']);
    expect(component.warningPreparationCount()).toBe(2);
    expect(component.unknownPreparationCount()).toBe(4);
    component.clock.set(now + 60_000);
    expect(component.latePreparationOrders().map((entry) => entry.order.id)).toEqual(['late', 'preparing']);
    data.prepSlaMinutes.set(30);
    expect(component.latePreparationOrders()).toHaveLength(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Pedidos agendados não são avaliados');
    expect(fixture.nativeElement.textContent).toContain('Ambiente demonstrativo');
  });

  it('shows accurate order flow and recent orders independently of order filters', () => {
    const data = TestBed.inject(RestaurantDataService);
    const base = data.orders()[0];
    const statuses: RestaurantOrderRecord['status'][] = [
      'Novo', 'Entregador a caminho', 'Em preparo', 'Pronto', 'Pedido coletado',
      'Saiu para entrega', 'Em entrega', 'Cancelamento solicitado', 'Concluído',
    ];
    data.orders.set(statuses.map((status, index) => ({
      ...base, id: String(index), status, receivedAt: new Date(1767268800000 + index * 1000).toISOString(),
    })));
    component.orderFilter.set('Concluídos');
    expect(component.overviewFlow().map((stage) => stage.count)).toEqual([2, 1, 2, 2, 1]);
    expect(component.activeOrderCount()).toBe(8);
    expect(component.recentOrders().map((order) => order.id)).toEqual(['8', '7', '6', '5', '4']);
    data.orders.set([]);
    fixture.detectChanges();
    expect(component.overviewFlow().every((stage) => stage.count === 0)).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Nenhum pedido na demonstração');
  });

  it('opens the complete order list from the overview even when filters were set', () => {
    component.orderFilter.set('Concluídos');
    component.orderPeriodFilter.set('24 horas');
    component.orderChannelFilter.set('iFood');
    component.orderCourierFilter.set('1');
    component.orderFulfillmentFilter.set('pickup');
    component.openOverviewOrders();
    expect(component.activeSection()).toBe('orders');
    expect(component.filteredOrders()).toHaveLength(component.orders().length);
  });

  it('opens the guide for a restaurant that has not completed it and navigates to a section', () => {
    currentUser.set({ id: 'user-id', name: 'Pessoa', email: 'user@example.test', role: 'restaurant', onboardingCompleted: false });
    const guideFixture = TestBed.createComponent(RestaurantDashboard);
    guideFixture.detectChanges();
    const guide = guideFixture.componentInstance;
    expect(guide.guideOpen()).toBe(true);
    guide.guideStep.set(2);
    guide.selectSection(guide.guideSteps[2].section);
    expect(guide.activeSection()).toBe('menu');
    expect(guide.guideOpen()).toBe(false);
    expect(guide.guideMinimized()).toBe(true);
    guide.openGuide();
    expect(guide.guideStep()).toBe(2);
  });

  it('lets the user jump between guide steps and updates the accessible progress', () => {
    component.openGuide();
    fixture.detectChanges();
    const step: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[aria-label="Ir para etapa 3: Cardápio"]',
    );
    step.click();
    fixture.detectChanges();
    expect(component.guideStep()).toBe(2);
    expect(step.getAttribute('aria-current')).toBe('step');
    expect(fixture.nativeElement.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('3');
    expect(fixture.nativeElement.querySelector('#guide-title').textContent).toContain('Organize o cardápio');
  });

  it('opens each guide destination without hiding it behind the guide and resumes the same step', () => {
    component.openGuide();
    fixture.detectChanges();
    const buttons = () => Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    for (let index = 0; index < component.guideSteps.length; index++) {
      component.guideStep.set(index);
      fixture.detectChanges();
      const action = buttons().find((button) => button.textContent?.trim() === component.guideSteps[index].action);
      expect(action).toBeDefined();
      action!.click();
      fixture.detectChanges();
      expect(component.activeSection()).toBe(component.guideSteps[index].section);
      expect(component.guideOpen()).toBe(false);
      expect(component.guideMinimized()).toBe(true);
      expect(fixture.nativeElement.querySelector('h1').textContent).toContain(component.activePage().label);
      buttons().find((button) => button.textContent?.trim() === 'Retomar guia')!.click();
      fixture.detectChanges();
      expect(component.guideOpen()).toBe(true);
      expect(component.guideStep()).toBe(index);
    }
  });

  it('keeps the guide open when a visitor attempts to complete it without an account', async () => {
    component.openGuide();
    component.guideStep.set(4);
    await component.finishGuide();
    expect(component.guideOpen()).toBe(true);
    expect(component.guideStep()).toBe(4);
    expect(completeRestaurantOnboarding).not.toHaveBeenCalled();
    expect(toastService.toasts().at(-1)?.message).toContain('Entre com sua conta');
  });

  it('opens settings from the header and only offers search in supported sections', () => {
    expect(fixture.nativeElement.querySelector('header input[type="search"]')).toBeNull();
    fixture.nativeElement.querySelector('button[aria-label="Abrir configurações"]').click();
    fixture.detectChanges();
    expect(component.activeSection()).toBe('settings');
    expect(fixture.nativeElement.querySelector('[aria-label="Configurações do painel"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('publicação pelo painel administrativo ainda não está disponível');
    expect(fixture.nativeElement.querySelector('app-theme-toggle')).toBeTruthy();
    const guideButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((button) => button.textContent?.includes('Abrir guia inicial'));
    guideButton!.click();
    fixture.detectChanges();
    expect(component.guideOpen()).toBe(true);
    component.selectSection('orders');
    fixture.detectChanges();
    expect(component.guideOpen()).toBe(false);
    expect(component.guideMinimized()).toBe(true);
    expect(fixture.nativeElement.querySelector('input[aria-label="Buscar pedidos"]')).toBeTruthy();
  });

  it('identifies unavailable communication channels and opens the store settings', () => {
    component.selectSection('settings');
    fixture.detectChanges();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Consulte os avisos e notícias disponíveis');
    expect(text).toContain('Push · indisponível');
    expect(text).toContain('Nenhuma mensagem ou ligação será enviada');
    const storeButton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((button) => button.textContent?.includes('Abrir Loja'));
    storeButton!.click();
    expect(component.activeSection()).toBe('store');
  });

  it('keeps menu and courier controls functional in mobile cards', () => {
    component.selectSection('menu');
    fixture.detectChanges();
    const item = component.filteredMenuItems()[0];
    const available = item.channels.iFood.available;
    const toggle: HTMLButtonElement = fixture.nativeElement.querySelector(
      `[aria-label="${available ? 'Pausar' : 'Ativar'} ${item.name} em iFood"]`,
    );
    toggle.click();
    expect(component.menuItems().find((entry) => entry.id === item.id)?.channels.iFood.available).toBe(!available);

    component.selectSection('couriers');
    fixture.detectChanges();
    const courier = component.filteredCouriers().find((entry) => entry.active)!;
    const online = courier.online;
    const presence: HTMLButtonElement = fixture.nativeElement.querySelector(
      `[aria-label="${online ? 'Colocar offline' : 'Colocar online'} ${courier.name}"]`,
    );
    presence.click();
    expect(component.couriers().find((entry) => entry.id === courier.id)?.online).toBe(!online);
  });

  it('updates both switch controls and their accessible state', () => {
    component.selectSection('orders');
    fixture.detectChanges();
    const external: HTMLButtonElement = fixture.nativeElement.querySelector('button[role="switch"]');
    const externalBefore = component.allowExternalCourier();
    expect(external.getAttribute('aria-checked')).toBe(String(externalBefore));
    external.click();
    fixture.detectChanges();
    expect(component.allowExternalCourier()).toBe(!externalBefore);
    expect(external.getAttribute('aria-checked')).toBe(String(!externalBefore));

    component.selectSection('store');
    fixture.detectChanges();
    const store: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Receber novos pedidos"]');
    const storeBefore = component.storeOpen();
    store.click();
    fixture.detectChanges();
    expect(component.storeOpen()).toBe(!storeBefore);
    expect(store.getAttribute('aria-checked')).toBe(String(!storeBefore));
  });

  it('validates the complete load before assigning or transferring selected orders', () => {
    const data = TestBed.inject(RestaurantDataService);
    component.selectSection('couriers');
    component.routeTargetCourierId.set('2');
    data.maxItemsPerCourier.set(5);
    fixture.detectChanges();

    const destination: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    expect(destination.value).toBe('2');
    const orders = Array.from(fixture.nativeElement.querySelectorAll('label')) as HTMLLabelElement[];
    for (const id of ['2840', '2925']) {
      orders.find((label) => label.textContent?.includes(`#${id}`))!.querySelector('input')!.click();
    }
    fixture.detectChanges();
    const button = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((entry) => entry.textContent?.includes('Atribuir 2 pedidos'))!;
    const queue = [...data.courierQueue()];
    button.click();
    expect(toastService.toasts().at(-1)?.message).toContain('capacidade');
    expect(component.routeOrderSelection()).toHaveLength(2);
    expect(data.orders().find((order) => order.id === '2925')?.courierId).toBeNull();

    data.maxItemsPerCourier.set(6);
    button.click();
    expect(data.orders().find((order) => order.id === '2925')?.courierId).toBe(2);
    expect(component.routeOrderSelection()).toHaveLength(0);
    expect(data.courierQueue()).toEqual(queue);
  });

  it('validates feedback and preserves the message when submission fails', async () => {
    component.feedbackMessage.set('Um problema na tela');
    await component.submitFeedback(new Event('submit'));
    expect(component.feedbackError()).toContain('Entre com sua conta');
    currentUser.set({ id: 'user-id', name: 'Pessoa', email: 'user@example.test', role: 'restaurant' });
    component.feedbackMessage.set('   ');
    await component.submitFeedback(new Event('submit'));
    expect(component.feedbackError()).toContain('10 e 2000');
    component.feedbackKind.set('problem');
    component.feedbackMessage.set('  Um problema na tela  ');
    submitRestaurantFeedback.mockRejectedValueOnce(new HttpErrorResponse({ status: 500 }));
    await component.submitFeedback(new Event('submit'));
    expect(component.feedbackMessage()).toBe('  Um problema na tela  ');
    expect(component.feedbackError()).toContain('Não foi possível');
    await component.submitFeedback(new Event('submit'));
    expect(submitRestaurantFeedback).toHaveBeenLastCalledWith('problem', 'Um problema na tela');
    expect(component.feedbackMessage()).toBe('');
  });

  it('loads announcements for the signed-in user and marks them read only after confirmation', async () => {
    await component.loadAnnouncements();
    expect(component.announcementsError()).toContain('Entre com sua conta');
    currentUser.set({ id: 'user-id', name: 'Pessoa', email: 'user@example.test', role: 'restaurant' });
    const announcement = { id: 'notice-id', category: 'notice', title: 'Aviso', message: 'Mensagem', publishedAt: '2026-01-01T12:00:00Z', readAt: null };
    listAnnouncements.mockResolvedValueOnce([announcement]);
    await component.loadAnnouncements();
    markAnnouncementRead.mockRejectedValueOnce(new HttpErrorResponse({ status: 500 }));
    await component.markAnnouncementRead(announcement.id);
    expect(component.announcements()[0].readAt).toBeNull();
    expect(component.announcementsError()).toContain('Não foi possível');
    await component.markAnnouncementRead(announcement.id);
    expect(component.announcements()[0].readAt).not.toBeNull();
  });

  it('opens example notices as details without marking them as real messages', () => {
    component.selectSection('settings');
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
    buttons.find((button) => button.textContent?.includes('Novidades para sua operação'))!.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Detalhes da notificação"]')?.textContent)
      .toContain('Conteúdo demonstrativo');
    expect(markAnnouncementRead).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[aria-label="Detalhes da notificação"] button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Configurações do painel"]')).toBeTruthy();
  });

  it('updates the displayed announcement when another session marks it read', () => {
    const item = { id: 'notice-id', category: 'notice' as const, title: 'Aviso', message: 'Mensagem', publishedAt: '2026-01-01T12:00:00Z', readAt: null };
    component.announcements.set([item]);
    component.selectedAnnouncement.set({ item, example: false });
    liveReads.next(item.id);
    expect(component.announcements()[0].readAt).not.toBeNull();
    expect(component.selectedAnnouncement()?.item.readAt).not.toBeNull();
  });

  it('keeps order controls available inside collapsed details', () => {
    component.selectSection('orders');
    fixture.detectChanges();
    const summaries = Array.from(fixture.nativeElement.querySelectorAll('summary') as NodeListOf<HTMLElement>);
    const advanced = summaries.find((summary) => summary.textContent?.includes('Configurações de despacho e TV'))!;
    expect((advanced.parentElement as HTMLDetailsElement).open).toBe(false);
    advanced.click();
    expect((advanced.parentElement as HTMLDetailsElement).open).toBe(true);
    const orderDetails = summaries.find((summary) => summary.textContent?.includes('Detalhes e ações'))!;
    expect((orderDetails.parentElement as HTMLDetailsElement).open).toBe(false);
    orderDetails.click();
    const statuses = fixture.nativeElement.querySelectorAll('select[aria-label="Atualizar status"]') as NodeListOf<HTMLSelectElement>;
    expect(component.filteredOrders().some((order) => order.status !== 'Novo')).toBe(true);
    component.filteredOrders().forEach((order, index) => expect(statuses[index].value).toBe(order.status));
    const couriers = fixture.nativeElement.querySelectorAll('select[aria-label="Entregador da loja"]') as NodeListOf<HTMLSelectElement>;
    const storeOrders = component.filteredOrders().filter((order) => order.channel === 'Loja própria');
    expect(storeOrders.some((order) => !!order.courierId)).toBe(true);
    storeOrders.forEach((order, index) => expect(couriers[index].value).toBe(String(order.courierId ?? '')));
  });

  it('requests and confirms the email change with an eight-digit code', async () => {
    currentUser.set({ id: 'user-id', name: 'Pessoa', email: 'user@example.test', role: 'restaurant' });
    component.newAccountEmail.set(' NOVO@example.test ');
    component.accountPassword.set('secure-password');
    await component.requestAccountEmailChange(new Event('submit'));
    expect(requestEmailChange).toHaveBeenCalledWith('novo@example.test', 'secure-password');
    expect(component.accountPassword()).toBe('');
    component.accountEmailCode.set('1234');
    await component.confirmAccountEmail(new Event('submit'));
    expect(confirmEmailChange).not.toHaveBeenCalled();
    component.accountEmailCode.set('01234567');
    confirmEmailChange.mockRejectedValueOnce(new HttpErrorResponse({ status: 400 }));
    await component.confirmAccountEmail(new Event('submit'));
    expect(component.accountCodeError()).toContain('inválido');
    await component.confirmAccountEmail(new Event('submit'));
    expect(confirmEmailChange).toHaveBeenCalledWith('01234567');
    expect(component.accountEmailCode()).toBe('');
  });

  it('saves completion, can reopen the guide, and keeps it open on API failure', async () => {
    currentUser.set({ id: 'user-id', name: 'Pessoa', email: 'user@example.test', role: 'restaurant', onboardingCompleted: false });
    const guide = TestBed.createComponent(RestaurantDashboard).componentInstance;
    completeRestaurantOnboarding.mockRejectedValueOnce(new HttpErrorResponse({ status: 401 }));
    await guide.finishGuide();
    expect(guide.guideOpen()).toBe(true);
    expect(toastService.toasts().at(-1)?.message).toContain('sessão expirou');
    await guide.finishGuide();
    expect(guide.guideOpen()).toBe(false);
    expect(completeRestaurantOnboarding).toHaveBeenCalledTimes(2);
    guide.openGuide();
    expect(guide.guideOpen()).toBe(true);
    expect(guide.guideStep()).toBe(0);
  });

  it('does not automatically reopen the guide for a restaurant that completed it', () => {
    currentUser.set({ id: 'user-id', name: 'Pessoa', email: 'user@example.test', role: 'restaurant', onboardingCompleted: true });
    const guide = TestBed.createComponent(RestaurantDashboard).componentInstance;
    expect(guide.guideOpen()).toBe(false);
  });

  it('adds a menu item and notifies the user', () => {
    component.updateMenuDraft('name', 'Nhoque da casa');
    component.updateMenuDraft('category', 'Pratos');
    component.updateMenuDraft('description', 'Nhoque artesanal ao molho da casa.');
    component.updateMenuDraft('ifoodPrice', '38');
    component.updateMenuDraft('food99Price', '37');
    component.updateMenuDraft('housePrice', '34.5');
    component.saveMenuItem(new Event('submit'));

    expect(component.menuItems()[0]).toMatchObject({
      name: 'Nhoque da casa',
      channels: {
        iFood: { price: 38 },
        '99Food': { price: 37 },
        'Loja própria': { price: 34.5 },
      },
    });
    expect(toastService.toasts().at(-1)?.message).toBe('Item adicionado ao cardápio.');
  });

  it('rejects invalid manual orders without changing the order list', () => {
    const orderCount = component.orders().length;

    component.updateOrderDraft('customer', 'Cliente');
    component.saveOrder(new Event('submit'));

    expect(component.orders()).toHaveLength(orderCount);
    expect(component.dialogError()).toBe(
      'Preencha cliente, telefone, entrega/endereço e valores válidos.',
    );
  });

  it('updates order status and emits a toast', () => {
    component.updateOrderStatus('2841', 'Em preparo');

    expect(component.orders().find((order) => order.id === '2841')?.status).toBe('Em preparo');
    expect(toastService.toasts().at(-1)?.kind).toBe('success');
  });

  it('only opens external dispatch after all own couriers are offline', () => {
    component.openExternalDispatch('2840');
    expect(component.orders().find((order) => order.id === '2840')?.externalDispatch).toBe(
      'closed',
    );

    component.toggleCourierOnline(1);
    component.toggleCourierOnline(2);
    component.openExternalDispatch('2840');

    expect(component.orders().find((order) => order.id === '2840')?.externalDispatch).toBe(
      'available',
    );
  });

  it('resolves a marketplace cancellation request and restores the previous status when refused', () => {
    component.resolveOrderRequest('2839', false);

    expect(component.orders().find((order) => order.id === '2839')?.status).toBe('Pronto');
    expect(component.orders().find((order) => order.id === '2839')?.previousStatus).toBeUndefined();
  });
});
