import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AudioAlertsService } from '../../core/notifications/audio-alerts.service';
import {
  preparationDelayLevel,
  RestaurantDataService,
  type RestaurantTvOrder,
} from './restaurant-data.service';

@Component({
  selector: 'app-restaurant-tv',
  imports: [DatePipe, RouterLink],
  templateUrl: './restaurant-tv.html',
  styleUrl: './restaurant-tv.css',
})
export class RestaurantTv {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly alerts = inject(AudioAlertsService);
  protected readonly data = inject(RestaurantDataService);
  readonly clock = signal(Date.now());
  private readonly seenOrderIds = new Set<string>();
  private readonly seenArrivalEvents = new Set<string>();
  private readonly announcedLateIds = new Set<string>();
  private alertsInitialized = false;
  readonly code = this.route.snapshot.paramMap.get('code') ?? '';
  readonly authorized = computed(() => this.code === this.data.tvAccessCode());
  readonly orders = computed(() =>
    this.data
      .tvOrders()
      .filter(
        (order) => !['Concluído', 'Cancelado', 'Cancelado parcialmente'].includes(order.status),
      )
      .sort((left, right) => left.receivedAt.localeCompare(right.receivedAt)),
  );
  readonly awaitingPreparation = computed(() =>
    this.prioritize(
      this.orders().filter((order) => ['Novo', 'Entregador a caminho'].includes(order.status)),
    ),
  );
  readonly preparing = computed(() =>
    this.prioritize(this.orders().filter((order) => order.status === 'Em preparo')),
  );
  readonly ready = computed(() =>
    this.orders().filter((order) => ['Pronto', 'Pedido coletado'].includes(order.status)),
  );
  readonly inDelivery = computed(() =>
    this.orders().filter((order) => ['Saiu para entrega', 'Em entrega'].includes(order.status)),
  );
  readonly attentionOrders = computed(() =>
    this.orders().filter((order) =>
      ['Cancelamento solicitado', 'Reembolso solicitado'].includes(order.status),
    ),
  );
  readonly boardSections = computed(() => [
    { id: 'waiting', label: 'Aguardando preparação', orders: this.awaitingPreparation() },
    { id: 'preparing', label: 'Em preparação', orders: this.preparing() },
    { id: 'ready', label: 'Pedidos prontos', orders: this.ready() },
    { id: 'delivery', label: 'Em entrega', orders: this.inDelivery() },
  ]);
  readonly receivedCount = computed(() => this.orders().length);
  readonly lateCount = computed(
    () =>
      [...this.awaitingPreparation(), ...this.preparing()].filter(
        (order) => this.delayLevel(order) === 'late',
      ).length,
  );
  readonly couriersWaiting = computed(
    () =>
      new Set(
        this.orders()
          .filter((order) => order.courierStatus === 'Chegou à loja' && order.courierId !== null)
          .map((order) => order.courierId),
      ).size,
  );
  readonly couriersInDelivery = computed(
    () =>
      new Set(
        this.inDelivery()
          .filter((order) => order.courierId !== null)
          .map((order) => order.courierId),
      ).size,
  );

  constructor() {
    const timer = setInterval(() => this.clock.set(Date.now()), 30_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
    effect(() => {
      const currentOrders = this.orders();
      const audioReady = this.alerts.audioReady();
      const lateOrders = [...this.awaitingPreparation(), ...this.preparing()].filter(
        (order) => this.delayLevel(order) === 'late',
      );
      void audioReady;
      if (!this.alertsInitialized) {
        if (currentOrders.length === 0) return;
        currentOrders.forEach((order) => this.seenOrderIds.add(order.id));
        currentOrders.forEach((order) =>
          order.events.forEach((event) =>
            this.seenArrivalEvents.add(`${order.id}:${event.type}:${event.occurredAt}`),
          ),
        );
        this.alertsInitialized = true;
        return;
      }

      for (const order of currentOrders) {
        if (!this.seenOrderIds.has(order.id)) {
          this.seenOrderIds.add(order.id);
          this.alerts.announce(
            `Um novo pedido foi registrado. Pedido ${order.id}.`,
            'Novo pedido',
            'order',
          );
        }
        for (const event of order.events) {
          const eventKey = `${order.id}:${event.type}:${event.occurredAt}`;
          if (this.seenArrivalEvents.has(eventKey)) continue;
          this.seenArrivalEvents.add(eventKey);
          if (event.type === 'Motoboy da loja chegou' || event.type === 'Motoboy chegou à loja') {
            this.alerts.announce(
              `Motoboy da loja chegou. Pedido ${order.id}.`,
              'Motoboy chegou à loja',
              'arrival',
            );
          }
        }
      }

      for (const order of lateOrders) {
        if (this.announcedLateIds.has(order.id)) continue;
        this.announcedLateIds.add(order.id);
        this.alerts.announce(
          `Pedido atrasado ${order.id}. Priorizar preparação.`,
          'Pedido atrasado',
          'late',
        );
      }
    });
  }

  enableAlerts(): void {
    void this.alerts.activateFromUserGesture();
  }

  setVoiceEnabled(enabled: boolean): void {
    this.alerts.setVoiceEnabled(enabled);
  }

  async enableNotifications(): Promise<void> {
    this.alerts.setNotificationsEnabled(true);
    await this.alerts.requestNotificationPermission();
  }

  age(receivedAt: string): number {
    return Math.max(0, Math.floor((this.clock() - new Date(receivedAt).getTime()) / 60_000));
  }

  elapsedMinutes(timestamp?: string, endTimestamp?: string): number | null {
    if (!timestamp) return null;
    const end = endTimestamp ? new Date(endTimestamp).getTime() : this.clock();
    const start = new Date(timestamp).getTime();
    return Number.isFinite(start) && Number.isFinite(end)
      ? Math.max(0, Math.floor((end - start) / 60_000))
      : null;
  }

  timeLabel(timestamp?: string): string {
    if (!timestamp) return 'Não registrado';
    const date = new Date(timestamp);
    return Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
      : 'Não registrado';
  }

  prepStartedAt(order: RestaurantTvOrder): string | undefined {
    return order.events.find((event) => event.type === 'Em preparo')?.occurredAt;
  }

  readyAt(order: RestaurantTvOrder): string | undefined {
    return order.events.find((event) => event.type === 'Pronto')?.occurredAt;
  }

  collectedAt(order: RestaurantTvOrder): string | undefined {
    return order.events.find((event) => event.type === 'Pedido coletado')?.occurredAt;
  }

  prepDuration(order: RestaurantTvOrder): number | null {
    return this.elapsedMinutes(this.prepStartedAt(order), this.readyAt(order));
  }

  preparationWaitMinutes(order: RestaurantTvOrder): number | null {
    const startedAt = this.prepStartedAt(order);
    if (!startedAt && order.status !== 'Novo' && order.status !== 'Entregador a caminho')
      return null;
    return this.elapsedMinutes(order.receivedAt, startedAt);
  }

  readyWaitMinutes(order: RestaurantTvOrder): number | null {
    return this.elapsedMinutes(this.readyAt(order), order.departedAt ?? this.collectedAt(order));
  }

  deliveryMinutes(order: RestaurantTvOrder): number | null {
    return this.elapsedMinutes(order.departedAt, order.completedAt);
  }

  totalOrderMinutes(order: RestaurantTvOrder): number | null {
    return this.elapsedMinutes(order.receivedAt, order.completedAt);
  }

  delayLevel(order: RestaurantTvOrder): 'on-time' | 'warning' | 'late' | 'unknown' {
    return preparationDelayLevel(
      order,
      this.clock(),
      this.data.prepSlaMinutes(),
      this.data.warningBeforeSlaMinutes(),
    );
  }

  delayColor(level: ReturnType<RestaurantTv['delayLevel']>): string {
    return level === 'late'
      ? '#c34b45'
      : level === 'warning'
        ? '#e69b18'
        : level === 'on-time'
          ? '#16845a'
          : '#718078';
  }

  delayLabel(level: ReturnType<RestaurantTv['delayLevel']>): string {
    return level === 'late'
      ? 'Atrasado'
      : level === 'warning'
        ? 'Próximo do prazo'
        : level === 'on-time'
          ? 'No prazo'
          : 'Sem início registrado';
  }

  courierLabel(order: RestaurantTvOrder): string {
    if (order.fulfillment === 'pickup') return 'Retirada · sem motoboy';
    if (order.channel !== 'Loja própria') return `Logística ${order.channel}`;
    return (
      order.courierName ??
      (order.courierId === null ? 'Aguardando atribuição' : 'Motoboy sem cadastro local')
    );
  }

  courierState(order: RestaurantTvOrder): string {
    if (order.fulfillment === 'pickup' || order.channel !== 'Loja própria') return '';
    if (order.courierId === null) return 'Não atribuído';
    if (order.courierStatus === 'Chegou à loja') {
      const waited = this.elapsedMinutes(order.arrivedAt);
      return waited === null
        ? 'Chegou · horário não registrado'
        : `Na loja · esperando ${waited} min`;
    }
    if (order.courierStatus === 'A caminho da loja') return 'Aguardando chegada';
    if (order.courierStatus === 'Em entrega') return 'Em entrega';
    if (order.courierStatus === 'Coletado') return 'Coletado';
    return 'Chegada não registrada';
  }

  otherRouteOrders(orderId: string, routeId?: string): string[] {
    if (!routeId) return [];
    return this.orders()
      .filter((entry) => entry.routeId === routeId && entry.id !== orderId)
      .map((entry) => entry.id);
  }

  prioritize(orders: RestaurantTvOrder[]): RestaurantTvOrder[] {
    const priority = { late: 0, warning: 1, 'on-time': 2, unknown: 3 };
    return [...orders].sort((left, right) => {
      const levelDiff = priority[this.delayLevel(left)] - priority[this.delayLevel(right)];
      return levelDiff || left.receivedAt.localeCompare(right.receivedAt);
    });
  }

  statusColor(status: string): string {
    const colors = this.data.tvStatusColors();
    if (status === 'Novo') return colors.new;
    if (status === 'Em preparo') return colors.prep;
    if (status === 'Pronto') return colors.ready;
    if (status.includes('Cancelamento') || status.includes('Reembolso')) return colors.issue;
    return '#567060';
  }
}
