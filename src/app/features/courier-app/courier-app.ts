import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import * as L from 'leaflet';

import { ToastService } from '../../core/notifications/toast.service';
import { ThemeService } from '../../core/theme/theme.service';
import { AudioAlertsService } from '../../core/notifications/audio-alerts.service';
import { ThemeToggle } from '../../shared/ui/theme-toggle/theme-toggle';
import {
  RestaurantDataService,
  type ExternalDeliveryOffer,
  type HouseOrderRequest,
  type RestaurantOrderRecord,
  type StoreDriverJob,
} from '../restaurant/restaurant-data.service';
import {
  planCourierStops,
  type CourierRoutePoint,
  type CourierRouteStop,
} from './courier-route-planner';

type DriverMode = 'Loja' | 'Parceiro';

interface CourierSampleTask {
  id: string;
  store: string;
  items: string;
  address: string;
  status: string;
  routeId: string;
  reward: number;
  latitude: number;
  longitude: number;
}

interface CourierLocalProfile {
  key: string;
  name: string;
  photoUrl: string;
}

type ContactRecipient = 'Cliente' | 'Loja';

interface DemoChatMessage {
  id: string;
  text: string;
  createdAt: string;
}

const DEMO_ROUTE_ORIGIN: CourierRoutePoint = { latitude: -12.985, longitude: -38.49 };

@Component({
  selector: 'app-courier-app',
  imports: [NgIcon, ThemeToggle],
  templateUrl: './courier-dashboard.html',
})
export class CourierApp implements AfterViewInit, OnDestroy {
  protected readonly data = inject(RestaurantDataService);
  protected readonly theme = inject(ThemeService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly alerts = inject(AudioAlertsService);
  private readonly destroyRef = inject(DestroyRef);
  readonly clock = signal(Date.now());
  readonly settingsOpen = signal(false);
  readonly offerDeadline = signal<number | null>(null);
  readonly offerActionPending = signal<string | null>(null);
  readonly jobActionPending = signal<string | null>(null);
  readonly localProfile = signal<CourierLocalProfile>({ key: '', name: '', photoUrl: '' });

  readonly mode = signal<DriverMode>(
    this.route.snapshot.queryParamMap.has('courierId') ? 'Loja' : 'Parceiro',
  );
  readonly courierId = signal(this.resolveCourierId());
  readonly courierSessionOnline = signal(false);
  readonly partnerId = signal(this.route.snapshot.queryParamMap.get('partnerId') ?? 'AV-1042');
  readonly selectedExternalCourier = computed(
    () => this.data.externalCouriers().find((courier) => courier.id === this.partnerId()) ?? null,
  );
  readonly availableExternalCouriers = computed(() =>
    this.data.externalCouriers().filter((courier) => courier.online),
  );
  readonly partnerName = signal(this.selectedExternalCourier()?.name ?? 'Entregador parceiro');
  readonly partnerOnline = signal(false);
  readonly deliveryCodeInputs = signal<Record<string, string>>({});
  readonly deliveryCodeErrors = signal<Record<string, string>>({});
  readonly ignoredOfferIds = signal<string[]>([]);
  readonly proofPendingOrder = signal<string | null>(null);
  readonly activeView = signal<'offers' | 'route' | 'earnings'>('route');
  readonly sheetExpanded = signal(false);
  readonly contactRecipient = signal<ContactRecipient>('Cliente');
  readonly activeChatOrderId = signal<string | null>(null);
  readonly chatDraft = signal('');
  readonly localChatMessages = signal<Record<string, DemoChatMessage[]>>({});
  readonly supportOpen = signal(false);
  readonly supportDraft = signal('');
  readonly supportMessages = signal<DemoChatMessage[]>([]);
  private currentAlertedOfferId: string | null = null;
  readonly gpsState = signal<
    'off' | 'searching' | 'active' | 'low-accuracy' | 'denied' | 'unavailable'
  >('off');
  readonly gpsAccuracy = signal<number | null>(null);
  readonly routeStatus = signal<'waiting' | 'loading' | 'ready' | 'unavailable'>('waiting');
  readonly routeDistanceMeters = signal<number | null>(null);
  readonly routeDurationSeconds = signal<number | null>(null);
  readonly routeIsDemo = signal(false);
  readonly livePosition = signal<{ latitude: number; longitude: number; accuracy: number } | null>(
    null,
  );
  @ViewChild('mapCanvas', { static: true }) private mapCanvas?: ElementRef<HTMLDivElement>;
  private mapInstance?: L.Map;
  private locationWatchId: number | null = null;
  private nextDemoOrderId = 9500;
  private locationMarker?: L.CircleMarker;
  private accuracyCircle?: L.Circle;
  private demoOriginMarker?: L.CircleMarker;
  private destinationMarkers: L.CircleMarker[] = [];
  private routeLayer?: L.GeoJSON;
  private baseLayer?: L.TileLayer;
  private lastRouteRequestedAt = 0;
  private lastRouteOrigin?: L.LatLng;
  private lastRouteDestination = '';
  private readonly themeLayerEffect = effect(() => {
    this.theme.isDark();
    this.setBaseLayer();
  });
  private readonly deliveryAlertEffect = effect(() => {
    const jobs = this.activeJobs();
    const isOnline = this.online();
    if (!isOnline) return;

    for (const job of jobs) {
      if (this.announcedJobIds.has(job.orderId)) continue;
      this.announcedJobIds.add(job.orderId);
      if (job.courierId === -1) continue;
      this.alerts.announce(
        job.status === 'Chegou à loja'
          ? `Chegou sua vez. O pedido ${job.orderId} está pronto para coleta.`
          : `Nova entrega atribuída. Pedido ${job.orderId}.`,
        'Nova entrega',
        'arrival',
      );
    }
  });
  private readonly directOfferFocusEffect = effect(() => {
    if (this.mode() === 'Parceiro' && this.directOffers().length) {
      this.sheetExpanded.set(false);
      this.settingsOpen.set(false);
      this.supportOpen.set(false);
    }
  });
  private readonly offerAttentionEffect = effect((onCleanup) => {
    if (this.offerActionPending()) return;
    const offers = this.activeDirectOfferBundle().length
      ? this.activeDirectOfferBundle()
      : this.activeRadarOfferBundle();
    if (!offers.length) {
      this.currentAlertedOfferId = null;
      this.offerDeadline.set(null);
      return;
    }
    const offerKey = offers.map((offer) => offer.orderId).join(':');
    if (this.currentAlertedOfferId === offerKey) return;

    this.currentAlertedOfferId = offerKey;
    const isDirectOffer = offers.some((offer) => offer.targetCourierId === this.partnerId());
    const deadline = isDirectOffer ? Date.now() + 5000 : null;
    this.offerDeadline.set(deadline);
    const stopsMessage = offers
      .map(
        (offer, index) =>
          `${index ? 'segunda coleta' : 'coleta'} na ${offer.storeName}, ${offer.storeAddress || 'endereço da loja indisponível'}; entrega para ${offer.customer} em ${offer.address}`,
      )
      .join('. ');
    const message = isDirectOffer
      ? `${offers.length > 1 ? 'Rota dupla' : 'Nova entrega'}: ${stopsMessage}. Você tem cinco segundos para responder.`
      : `Nova chamada no Radar: ${stopsMessage}.`;
    const tone = isDirectOffer ? 'offer' : 'radar';
    this.alerts.announce(message, 'Nova oferta de entrega', tone, {
      speak: isDirectOffer,
      notify: isDirectOffer,
    });
    const toneInterval = isDirectOffer
      ? window.setInterval(() => {
          if (
            this.actionableOffers()
              .map((offer) => offer.orderId)
              .join(':') === offerKey
          ) {
            this.alerts.announce(message, 'Nova oferta de entrega', 'offer', {
              speak: false,
              notify: false,
            });
          }
        }, 1500)
      : null;
    const expiryTimer = isDirectOffer
      ? window.setTimeout(
          () =>
            this.declineOfferBundle(
              offers.map((offer) => offer.orderId),
              true,
            ),
          5000,
        )
      : null;

    onCleanup(() => {
      if (toneInterval !== null) window.clearInterval(toneInterval);
      if (expiryTimer !== null) window.clearTimeout(expiryTimer);
      this.alerts.cancelTone(tone);
      if (this.currentAlertedOfferId === offerKey) this.currentAlertedOfferId = null;
      if (deadline !== null && this.offerDeadline() === deadline) this.offerDeadline.set(null);
    });
  });
  private readonly announcedJobIds = new Set<string>();

  readonly selectedCourier = computed(
    () => this.data.storeCouriers().find((courier) => courier.id === this.courierId()) ?? null,
  );
  readonly courierAtStore = computed(() => Boolean(this.selectedCourier()?.atStoreSince));
  readonly atStoreMinutes = computed(() => {
    const timestamp = this.selectedCourier()?.atStoreSince;
    return timestamp ? this.elapsedSince(timestamp) : null;
  });
  readonly online = computed(() =>
    this.mode() === 'Loja'
      ? this.courierSessionOnline() && Boolean(this.selectedCourier()?.active)
      : this.partnerOnline(),
  );
  readonly activeJobs = computed(() =>
    this.data
      .storeDriverJobs()
      .filter((job) =>
        this.mode() === 'Loja'
          ? job.courierId === this.courierId() && job.status !== 'Entregue'
          : job.courierId === -1 &&
            job.externalCourierId === this.partnerId() &&
            job.status !== 'Entregue',
      ),
  );
  readonly availableOffers = computed(() =>
    this.mode() === 'Parceiro' && this.online()
      ? this.matchingOffers().filter((offer) => !this.ignoredOfferIds().includes(offer.orderId))
      : [],
  );
  readonly directOffers = computed(() =>
    this.availableOffers().filter((offer) => offer.targetCourierId === this.partnerId()),
  );
  readonly radarOffers = computed(() =>
    this.availableOffers().filter((offer) => !offer.targetCourierId),
  );
  readonly activeDirectOfferBundle = computed(() =>
    this.bundleOffers(this.directOffers(), this.availableOffers()),
  );
  readonly activeRadarOfferBundle = computed(() =>
    this.bundleOffers(this.radarOffers(), this.radarOffers()),
  );
  readonly radarQueueCount = computed(() => {
    const directIds = new Set(this.activeDirectOfferBundle().map((offer) => offer.orderId));
    return this.radarOffers().filter((offer) => !directIds.has(offer.orderId)).length;
  });
  readonly activeDirectOffer = computed(() => this.activeDirectOfferBundle()[0] ?? null);
  readonly activeRadarOffer = computed(() => this.activeRadarOfferBundle()[0] ?? null);
  readonly actionableOffers = computed(() => {
    const directBundle = this.activeDirectOfferBundle();
    if (directBundle.length) return directBundle;
    return this.activeView() === 'offers' ? this.activeRadarOfferBundle() : [];
  });
  readonly actionableOffer = computed(() => this.actionableOffers()[0] ?? null);
  readonly offerSecondsRemaining = computed(() => {
    const deadline = this.offerDeadline();
    return deadline === null
      ? 0
      : Math.min(5, Math.max(0, Math.ceil((deadline - this.clock()) / 1000)));
  });
  readonly offerProgressPercent = computed(() => (this.offerSecondsRemaining() / 5) * 100);
  readonly queuedOfferCount = computed(() =>
    Math.max(0, this.availableOffers().length - this.actionableOffers().length),
  );
  readonly matchingOffers = computed(() =>
    this.data
      .externalDeliveryOffers()
      .filter(
        (offer) =>
          offer.status === 'available' &&
          (!offer.targetCourierId || offer.targetCourierId === this.partnerId()),
      ),
  );
  readonly accountName = computed(() =>
    this.mode() === 'Loja'
      ? (this.selectedCourier()?.name ?? 'Conta indisponível')
      : (this.selectedExternalCourier()?.name ?? this.partnerName()),
  );
  readonly profileName = computed(() => this.localProfile().name.trim() || this.accountName());
  readonly profilePhotoUrl = computed(() => this.localProfile().photoUrl);
  readonly completedJobs = computed(() =>
    this.data
      .storeDriverJobs()
      .filter((job) =>
        this.mode() === 'Loja'
          ? job.courierId === this.courierId() && job.status === 'Entregue'
          : job.courierId === -1 &&
            job.externalCourierId === this.partnerId() &&
            job.status === 'Entregue',
      ),
  );
  readonly completedCount = computed(() => this.completedJobs().length);
  readonly courierOfferHistory = computed(() =>
    this.data
      .externalDeliveryOffers()
      .filter(
        (offer) =>
          offer.targetCourierId === this.partnerId() || offer.courierName === this.profileName(),
      ),
  );
  readonly decidedOffers = computed(() =>
    this.courierOfferHistory().filter((offer) => offer.status !== 'available'),
  );
  readonly acceptedOfferCount = computed(
    () =>
      this.decidedOffers().filter((offer) =>
        ['accepted', 'picked-up', 'delivered'].includes(offer.status),
      ).length,
  );
  readonly acceptanceRate = computed(() =>
    this.decidedOffers().length
      ? Math.round((this.acceptedOfferCount() / this.decidedOffers().length) * 100)
      : null,
  );
  readonly completionRate = computed(() => {
    if (this.mode() === 'Parceiro') {
      const accepted = this.courierOfferHistory().filter((offer) =>
        ['accepted', 'picked-up', 'delivered'].includes(offer.status),
      ).length;
      const delivered = this.courierOfferHistory().filter(
        (offer) => offer.status === 'delivered',
      ).length;
      return accepted ? Math.round((delivered / accepted) * 100) : null;
    }
    const total = this.completedCount() + this.activeJobs().length;
    return total ? Math.round((this.completedCount() / total) * 100) : null;
  });
  readonly routeItemCount = computed(() =>
    this.activeJobs().reduce((total, job) => total + job.itemCount, 0),
  );
  readonly earnedAmount = computed(() => {
    const jobs = this.completedJobs();
    if (this.mode() === 'Parceiro') return jobs.reduce((total, job) => total + job.total, 0);
    const courier = this.selectedCourier();
    const rate = courier?.payValue ?? 0;
    return courier?.payModel === '% por pedido'
      ? jobs.reduce((total, job) => total + (job.total * rate) / 100, 0)
      : jobs.length * rate;
  });
  readonly sampleTasks: CourierSampleTask[] = [
    {
      id: 'EX-2041',
      store: 'Coleta · Farol da Barra',
      items: '2 sacolas · 3 itens',
      address: 'Largo do Farol da Barra, s/n · Barra, Salvador - BA',
      status: 'A caminho da coleta',
      routeId: 'ROTA-DEMO-01',
      reward: 10.5,
      latitude: -13.0107,
      longitude: -38.5325,
    },
    {
      id: 'EX-2042',
      store: 'Entrega · Mercado Modelo',
      items: '1 pacote · 2 itens',
      address: 'Praça Visconde de Cayru, s/n · Comércio, Salvador - BA',
      status: 'Próxima parada',
      routeId: 'ROTA-DEMO-01',
      reward: 9.75,
      latitude: -12.9717,
      longitude: -38.5145,
    },
  ];
  readonly routeStops = computed(() => planCourierStops(this.activeJobs(), this.routeOrigin()));
  readonly nextRouteStop = computed(() => this.routeStops()[0] ?? this.mapRouteStops()[0] ?? null);
  readonly routeEtaMinutes = computed(() => {
    const duration = this.routeDurationSeconds();
    return duration === null ? null : Math.max(1, Math.round(duration / 60));
  });
  readonly routeDistanceLabel = computed(() => {
    const distance = this.routeDistanceMeters();
    return distance === null ? null : `${(distance / 1000).toFixed(1).replace('.', ',')} km`;
  });
  readonly activeChatMessages = computed(() => {
    const orderId = this.activeChatOrderId();
    return orderId ? (this.localChatMessages()[`${orderId}:${this.contactRecipient()}`] ?? []) : [];
  });
  readonly mapRouteStops = computed<CourierRouteStop[]>(() => {
    if (this.activeJobs().length) return this.routeStops();
    const sample = this.sampleTasks[1];
    return [
      {
        orderId: sample.id,
        kind: 'delivery',
        label: 'Destino · demonstração',
        address: sample.address,
        latitude: sample.latitude,
        longitude: sample.longitude,
      },
    ];
  });
  readonly routeOrigin = computed<CourierRoutePoint>(() => {
    const position = this.livePosition();
    return position && position.accuracy <= 5000
      ? { latitude: position.latitude, longitude: position.longitude }
      : DEMO_ROUTE_ORIGIN;
  });
  readonly nextDestination = computed(() => {
    const firstStop = this.mapRouteStops()[0];
    return firstStop
      ? {
          latitude: firstStop.latitude,
          longitude: firstStop.longitude,
          address: firstStop.address,
        }
      : null;
  });
  private readonly destinationEffect = effect(() => {
    const destinations = this.mapRouteStops();
    const origin = this.routeOrigin();
    const position = this.livePosition();
    if (!this.mapInstance) return;
    this.showDestinations(destinations);
    if (!destinations.length) {
      this.routeLayer?.remove();
      this.routeLayer = undefined;
      this.routeStatus.set('waiting');
      return;
    }
    void this.updateRoute(
      L.latLng(origin.latitude, origin.longitude),
      destinations.map((stop) => L.latLng(stop.latitude, stop.longitude)),
      !position || position.accuracy > 5000,
    );
  });
  readonly sampleOffers = [
    {
      orderId: 'EX-992',
      storeName: 'Restaurante exemplo',
      items: '2 itens · 1 sacola',
      address: 'Comércio · Salvador - BA',
      deliveryFee: 14.5,
    },
  ];

  constructor() {
    this.loadLocalProfile();
    const timer = setInterval(() => this.clock.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  ngAfterViewInit(): void {
    const element = this.mapCanvas?.nativeElement;
    if (!element) return;

    this.mapInstance = L.map(element, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
    }).setView([-12.991, -38.522], 13);
    this.setBaseLayer();
    L.control.attribution({ position: 'topright', prefix: false }).addTo(this.mapInstance);
    this.showDestinations(this.mapRouteStops());
    if (this.activeJobs().length === 0) {
      const origin = L.latLng(DEMO_ROUTE_ORIGIN.latitude, DEMO_ROUTE_ORIGIN.longitude);
      this.demoOriginMarker = L.circleMarker(origin, {
        radius: 8,
        color: '#fff',
        weight: 3,
        fillColor: '#286d48',
        fillOpacity: 1,
      })
        .bindTooltip('Você · exemplo', {
          direction: 'top',
          offset: [0, -7],
          permanent: true,
          className: 'courier-map-label',
        })
        .addTo(this.mapInstance);
      void this.updateRoute(
        origin,
        this.mapRouteStops().map((stop) => L.latLng(stop.latitude, stop.longitude)),
        true,
      );
    }

    window.setTimeout(() => this.mapInstance?.invalidateSize(), 0);
  }

  private setBaseLayer(): void {
    if (!this.mapInstance) return;
    this.baseLayer?.remove();
    this.baseLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.mapInstance);
  }

  private showDestinations(stops: CourierRouteStop[]): void {
    this.destinationMarkers.forEach((marker) => marker.remove());
    this.destinationMarkers = [];
    if (!this.mapInstance) return;

    stops.forEach((stop, index) => {
      const marker = L.circleMarker([stop.latitude, stop.longitude], {
        radius: index === 0 ? 9 : 7,
        color: '#fff',
        weight: 3,
        fillColor: stop.kind === 'pickup' ? '#286d48' : '#d34f37',
        fillOpacity: 1,
      })
        .bindTooltip(`${index + 1}. ${stop.label}`, {
          direction: 'top',
          offset: [0, -7],
          permanent: true,
          className: 'courier-map-label',
        })
        .addTo(this.mapInstance!);
      this.destinationMarkers.push(marker);
    });

    if (stops.length && !this.livePosition()) {
      this.mapInstance.setView([stops[0].latitude - 0.008, stops[0].longitude], 13);
    }
  }

  private async updateRoute(
    origin: L.LatLng,
    destinations: L.LatLng[],
    isDemo = false,
  ): Promise<void> {
    if (!this.mapInstance || !destinations.length) return;
    const now = Date.now();
    const destinationKey = destinations
      .map((destination) => `${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`)
      .join(';');
    if (
      this.lastRouteOrigin &&
      this.lastRouteOrigin.distanceTo(origin) < 150 &&
      now - this.lastRouteRequestedAt < 20_000 &&
      this.lastRouteDestination === destinationKey &&
      this.routeIsDemo() === isDemo
    )
      return;

    this.lastRouteOrigin = origin;
    this.lastRouteRequestedAt = now;
    this.lastRouteDestination = destinationKey;
    this.routeStatus.set('loading');
    this.routeIsDemo.set(isDemo);
    this.routeDistanceMeters.set(null);
    this.routeDurationSeconds.set(null);
    this.routeLayer?.remove();
    const coordinates = [origin, ...destinations]
      .map((point) => `${point.lng},${point.lat}`)
      .join(';');
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;
    try {
      const response = await fetch(routeUrl);
      if (!response.ok) throw new Error('Route unavailable');
      const result = (await response.json()) as {
        routes?: Array<{ geometry: GeoJSON.GeoJsonObject; distance: number; duration: number }>;
      };
      const route = result.routes?.[0];
      const geometry = route?.geometry;
      if (!geometry || !this.mapInstance) throw new Error('Route unavailable');
      this.routeDistanceMeters.set(route.distance);
      this.routeDurationSeconds.set(route.duration);
      this.routeLayer = L.geoJSON(geometry, {
        style: { color: '#d34f37', weight: 5, opacity: 0.92 },
      }).addTo(this.mapInstance);
      this.destinationMarkers.forEach((marker) => marker.bringToFront());
      this.locationMarker?.bringToFront();
      const mobileSheetHeight = window.matchMedia('(max-width: 719px)').matches
        ? Math.round(window.innerHeight * 0.58)
        : 24;
      this.mapInstance.fitBounds(this.routeLayer.getBounds(), {
        paddingTopLeft: [28, 185],
        paddingBottomRight: [28, mobileSheetHeight],
        maxZoom: 16,
      });
      this.routeStatus.set('ready');
    } catch {
      this.routeLayer?.remove();
      this.routeLayer = undefined;
      this.routeStatus.set('unavailable');
      this.routeDistanceMeters.set(null);
      this.routeDurationSeconds.set(null);
    }
  }

  ngOnDestroy(): void {
    this.stopLiveLocation();
    this.mapInstance?.remove();
  }

  private resolveCourierId(): number {
    const requestedId = Number(this.route.snapshot.queryParamMap.get('courierId'));
    return Number.isInteger(requestedId) && requestedId > 0 ? requestedId : 1;
  }

  toggleLiveLocation(): void {
    if (this.gpsState() === 'active') {
      this.stopLiveLocation();
      return;
    }
    if (this.locationWatchId !== null) this.stopLiveLocation();
    this.startLiveLocation();
  }

  timeLabel(timestamp?: string): string {
    if (!timestamp) return 'Não registrado';
    const date = new Date(timestamp);
    return Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
      : 'Não registrado';
  }

  elapsedSince(timestamp?: string): number | null {
    if (!timestamp) return null;
    const date = new Date(timestamp).getTime();
    return Number.isFinite(date) ? Math.max(0, Math.floor((this.clock() - date) / 60_000)) : null;
  }

  routeJobs(job: StoreDriverJob): StoreDriverJob[] {
    return this.data
      .storeDriverJobs()
      .filter((entry) => entry.routeId === job.routeId && entry.status !== 'Entregue');
  }

  private normalizeArea(address: string, area?: string): string {
    return (area || address.split('·').at(-1) || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('pt-BR');
  }

  private offerItemCount(offer: ExternalDeliveryOffer): number {
    return Number(offer.items.match(/(\d+)\s+itens?/i)?.[1]) || 1;
  }

  private distanceBetweenPoints(first: CourierRoutePoint, second: CourierRoutePoint): number {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const latitudeDelta = radians(second.latitude - first.latitude);
    const longitudeDelta = radians(second.longitude - first.longitude);
    const value =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(radians(first.latitude)) *
        Math.cos(radians(second.latitude)) *
        Math.sin(longitudeDelta / 2) ** 2;
    return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  private offersShareRoute(first: ExternalDeliveryOffer, second: ExternalDeliveryOffer): boolean {
    if (
      first.storeLatitude == null ||
      first.storeLongitude == null ||
      second.storeLatitude == null ||
      second.storeLongitude == null ||
      first.destinationLatitude == null ||
      first.destinationLongitude == null ||
      second.destinationLatitude == null ||
      second.destinationLongitude == null
    )
      return false;

    const pickupDistance = this.distanceBetweenPoints(
      { latitude: first.storeLatitude, longitude: first.storeLongitude },
      { latitude: second.storeLatitude, longitude: second.storeLongitude },
    );
    const customerDistance = this.distanceBetweenPoints(
      { latitude: first.destinationLatitude, longitude: first.destinationLongitude },
      { latitude: second.destinationLatitude, longitude: second.destinationLongitude },
    );
    return pickupDistance <= 2500 && customerDistance <= 2500;
  }

  private bundleOffers(
    seeds: ExternalDeliveryOffer[],
    candidates: ExternalDeliveryOffer[] = seeds,
  ): ExternalDeliveryOffer[] {
    const first = seeds[0];
    if (!first) return [];

    const currentLoad = this.activeJobs().reduce((total, job) => total + job.itemCount, 0);
    const maxItems = this.data.maxItemsPerCourier();
    const bundled = [first];
    let itemCount = this.offerItemCount(first);

    for (const candidate of candidates) {
      if (candidate.orderId === first.orderId || bundled.length === 2) continue;
      if (candidate.targetCourierId && candidate.targetCourierId !== this.partnerId()) continue;
      if (!this.offersShareRoute(first, candidate)) continue;
      const candidateItems = this.offerItemCount(candidate);
      if (currentLoad + itemCount + candidateItems > maxItems) continue;
      bundled.push(candidate);
      itemCount += candidateItems;
    }
    return bundled;
  }

  private nearbyDelivery(job: StoreDriverJob, offer: ExternalDeliveryOffer): boolean {
    const incomingArea = this.normalizeArea(offer.address, offer.area);
    const jobArea = this.normalizeArea(job.address, job.area);
    if (incomingArea && jobArea && incomingArea === jobArea) return true;
    if (
      job.destinationLatitude == null ||
      job.destinationLongitude == null ||
      offer.destinationLatitude == null ||
      offer.destinationLongitude == null
    )
      return false;
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const latitudeDelta = radians(offer.destinationLatitude - job.destinationLatitude);
    const longitudeDelta = radians(offer.destinationLongitude - job.destinationLongitude);
    const value =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(radians(job.destinationLatitude)) *
        Math.cos(radians(offer.destinationLatitude)) *
        Math.sin(longitudeDelta / 2) ** 2;
    const distanceMeters = 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
    return distanceMeters <= 2500;
  }

  mapUrl(address: string, latitude?: number, longitude?: number): string {
    const params = new URLSearchParams({
      q: address,
      navigate: 'yes',
      vehicle_type: 'motorcycle',
    });
    if (latitude !== undefined && longitude !== undefined) {
      params.set('ll', `${latitude},${longitude}`);
    }
    return `https://waze.com/ul?${params.toString()}`;
  }

  routeSummary(): string {
    const distance = this.routeDistanceMeters();
    const duration = this.routeDurationSeconds();
    if (distance === null || duration === null) return '';
    const kilometers = (distance / 1000).toFixed(1).replace('.', ',');
    const minutes = Math.max(1, Math.round(duration / 60));
    return `${kilometers} km · ${minutes} min${this.routeIsDemo() ? ' · exemplo' : ''}`;
  }

  startLiveLocation(): void {
    if (this.locationWatchId !== null) return;
    if (!navigator.geolocation) {
      this.gpsState.set('unavailable');
      return;
    }

    this.gpsState.set('searching');
    this.locationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const point = L.latLng(latitude, longitude);
        this.gpsAccuracy.set(Math.round(accuracy));
        this.livePosition.set({ latitude, longitude, accuracy });
        if (accuracy > 5000) {
          if (!this.demoOriginMarker) {
            this.locationMarker?.remove();
            this.accuracyCircle?.remove();
            this.locationMarker = undefined;
            this.accuracyCircle = undefined;
            this.routeLayer?.remove();
            this.routeLayer = undefined;
            this.lastRouteOrigin = undefined;
            this.lastRouteDestination = '';
            this.routeStatus.set('waiting');
          }
          this.gpsState.set('low-accuracy');
          return;
        }
        if (this.demoOriginMarker) {
          this.demoOriginMarker.remove();
          this.demoOriginMarker = undefined;
          this.routeLayer?.remove();
          this.routeLayer = undefined;
          this.lastRouteOrigin = undefined;
          this.lastRouteDestination = '';
        }
        if (this.mapInstance) {
          if (!this.locationMarker) {
            this.locationMarker = L.circleMarker(point, {
              radius: 9,
              color: '#fff',
              weight: 4,
              fillColor: '#247449',
              fillOpacity: 1,
            })
              .bindTooltip('Você', {
                direction: 'top',
                offset: [0, -7],
                permanent: true,
                className: 'courier-map-label',
              })
              .addTo(this.mapInstance);
          } else {
            this.locationMarker.setLatLng(point);
          }
        }
        this.gpsState.set('active');

        if (!this.mapInstance) return;
        if (!this.accuracyCircle) {
          this.accuracyCircle = L.circle(point, {
            radius: accuracy,
            color: '#247449',
            weight: 1,
            fillColor: '#247449',
            fillOpacity: 0.1,
          }).addTo(this.mapInstance);
        }

        this.locationMarker?.setLatLng(point);
        this.accuracyCircle?.setLatLng(point).setRadius(accuracy);
        const destinations = this.mapRouteStops().map((stop) =>
          L.latLng(stop.latitude, stop.longitude),
        );
        if (destinations.length) {
          void this.updateRoute(point, destinations);
        } else {
          this.mapInstance.panTo(point, { animate: true, duration: 0.45 });
        }
      },
      (error) => {
        this.gpsState.set(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable');
        if (this.locationWatchId !== null) {
          navigator.geolocation.clearWatch(this.locationWatchId);
        }
        this.locationWatchId = null;
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 },
    );
  }

  stopLiveLocation(): void {
    if (this.locationWatchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.locationWatchId);
    }
    this.locationWatchId = null;
    this.locationMarker?.remove();
    this.accuracyCircle?.remove();
    this.locationMarker = undefined;
    this.accuracyCircle = undefined;
    this.demoOriginMarker?.remove();
    this.demoOriginMarker = undefined;
    this.routeLayer?.remove();
    this.routeLayer = undefined;
    this.lastRouteOrigin = undefined;
    this.lastRouteDestination = '';
    this.routeStatus.set('waiting');
    this.routeIsDemo.set(false);
    this.routeDistanceMeters.set(null);
    this.routeDurationSeconds.set(null);
    this.livePosition.set(null);
    this.gpsAccuracy.set(null);
    this.gpsState.set('off');
    if (this.mapInstance && this.activeJobs().length === 0) {
      const sampleOrigin = this.sampleTasks[0];
      const origin = L.latLng(sampleOrigin.latitude, sampleOrigin.longitude);
      this.demoOriginMarker = L.circleMarker(origin, {
        radius: 8,
        color: '#fff',
        weight: 3,
        fillColor: '#286d48',
        fillOpacity: 1,
      })
        .bindTooltip('Você · exemplo', {
          direction: 'top',
          offset: [0, -7],
          permanent: true,
          className: 'courier-map-label',
        })
        .addTo(this.mapInstance);
      const destinations = this.mapRouteStops().map((stop) =>
        L.latLng(stop.latitude, stop.longitude),
      );
      if (destinations.length) {
        void this.updateRoute(origin, destinations, true);
      }
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  payRateLabel(): string {
    const courier = this.selectedCourier();
    if (!courier) return 'Pagamento não configurado';
    return courier.payModel === '% por pedido'
      ? `${courier.payValue ?? 0}% por pedido`
      : `${this.formatCurrency(courier.payValue ?? 0)} por entrega`;
  }

  setMode(mode: DriverMode): void {
    if (this.mode() === mode) return;
    if (this.mode() === 'Loja' && this.courierSessionOnline()) {
      this.data.setStoreCourierOnline(this.courierId(), false);
    } else if (this.mode() === 'Parceiro' && this.partnerOnline()) {
      this.data.setExternalCourierOnline(this.partnerId(), false);
    }
    this.mode.set(mode);
    this.settingsOpen.set(false);
    this.supportOpen.set(false);
    this.activeView.set('route');
    this.sheetExpanded.set(true);
    this.courierSessionOnline.set(false);
    this.partnerOnline.set(false);
    this.activeChatOrderId.set(null);
    this.stopLiveLocation();
    this.loadLocalProfile();
  }

  toggleSettings(): void {
    if (!this.settingsOpen() && this.activeDirectOffer()) {
      this.toast.show('Responda à oferta atual antes de abrir as configurações.', 'warning');
      return;
    }
    this.settingsOpen.update((open) => !open);
  }

  isOfferProcessing(orderId: string): boolean {
    return this.offerActionPending() === orderId;
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
  }

  openSupport(): void {
    this.settingsOpen.set(false);
    this.supportOpen.set(true);
  }

  closeSupport(): void {
    this.supportOpen.set(false);
    this.supportDraft.set('');
  }

  sendSupportMessage(): void {
    const text = this.supportDraft().trim();
    if (!text) return;
    this.supportMessages.update((messages) => [
      ...messages,
      { id: `support-${Date.now()}`, text, createdAt: new Date().toISOString() },
    ]);
    this.supportDraft.set('');
    this.toast.show(
      'Mensagem registrada localmente; o canal Prattio ainda não está conectado.',
      'info',
    );
  }

  navigateToView(view: 'offers' | 'route' | 'earnings'): void {
    if (this.offerActionPending() || this.activeDirectOffer()) return;
    this.activeView.set(view);
    this.sheetExpanded.set(true);
  }

  setContactRecipient(recipient: ContactRecipient): void {
    this.contactRecipient.set(recipient);
    this.chatDraft.set('');
  }

  toggleOrderChat(orderId: string): void {
    if (this.activeChatOrderId() === orderId) {
      this.activeChatOrderId.set(null);
      this.chatDraft.set('');
      return;
    }
    this.activeChatOrderId.set(orderId);
    this.chatDraft.set('');
  }

  sendOrderChat(orderId: string): void {
    const text = this.chatDraft().trim();
    if (!text || this.activeChatOrderId() !== orderId) return;
    const key = `${orderId}:${this.contactRecipient()}`;
    this.localChatMessages.update((messages) => ({
      ...messages,
      [key]: [
        ...(messages[key] ?? []),
        { id: `message-${Date.now()}`, text, createdAt: new Date().toISOString() },
      ],
    }));
    this.chatDraft.set('');
    this.toast.show('Rascunho registrado neste dispositivo; mensagem não enviada.', 'info');
  }

  privateCallHref(job: StoreDriverJob): string | null {
    const relayNumber =
      this.contactRecipient() === 'Cliente' ? job.customerRelayNumber : job.storeRelayNumber;
    const sanitized = relayNumber?.replace(/[^\d+]/g, '');
    return sanitized && /^\+?[1-9]\d{7,14}$/.test(sanitized) ? `tel:${sanitized}` : null;
  }

  saveProfileName(name: string): void {
    this.localProfile.update((profile) => ({ ...profile, name: name.slice(0, 60) }));
    this.persistLocalProfile();
  }

  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      this.toast.show('Escolha uma imagem de até 2 MB.', 'warning');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.localProfile.update((profile) => ({
        ...profile,
        photoUrl: String(reader.result ?? ''),
      }));
      this.persistLocalProfile();
      this.toast.show('Foto de perfil atualizada neste dispositivo.', 'success');
    };
    reader.onerror = () => this.toast.show('Não foi possível carregar a foto.', 'error');
    reader.readAsDataURL(file);
  }

  private profileStorageKey(): string {
    return this.mode() === 'Loja'
      ? `prattio.courier.profile.store.${this.courierId()}`
      : `prattio.courier.profile.partner.${this.partnerId()}`;
  }

  private loadLocalProfile(): void {
    const key = this.profileStorageKey();
    if (typeof localStorage === 'undefined') {
      this.localProfile.set({ key, name: '', photoUrl: '' });
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<CourierLocalProfile>;
      this.localProfile.set({ key, name: saved.name ?? '', photoUrl: saved.photoUrl ?? '' });
    } catch {
      this.localProfile.set({ key, name: '', photoUrl: '' });
    }
  }

  private persistLocalProfile(): void {
    const { key, name, photoUrl } = this.localProfile();
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify({ name, photoUrl }));
    } catch {
      this.toast.show('Não foi possível salvar o perfil neste dispositivo.', 'error');
    }
  }

  toggleSheet(): void {
    this.sheetExpanded.update((expanded) => !expanded);
  }

  async enableAlerts(): Promise<void> {
    await this.alerts.activateFromUserGesture();
  }

  async setSoundEnabled(enabled: boolean): Promise<void> {
    await this.alerts.setSoundEnabled(enabled);
  }

  setVoiceEnabled(enabled: boolean): void {
    this.alerts.setVoiceEnabled(enabled);
  }

  async enableNotifications(): Promise<void> {
    this.alerts.setNotificationsEnabled(true);
    await this.alerts.requestNotificationPermission();
  }

  setDeliveryCode(orderId: string, value: string): void {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    this.deliveryCodeInputs.update((codes) => ({ ...codes, [orderId]: digits }));
    this.deliveryCodeErrors.update((errors) => ({ ...errors, [orderId]: '' }));
  }

  checkInAtStore(): void {
    if (this.mode() !== 'Loja' || !this.online()) return;
    this.data.setStoreCourierAtStore(this.courierId(), true);
    this.toast.show(
      `Ponto registrado em ${this.selectedCourier()?.storeName ?? 'sua loja'}.`,
      'success',
    );
  }

  checkOutFromStore(): void {
    if (this.mode() !== 'Loja') return;
    this.data.setStoreCourierAtStore(this.courierId(), false);
    this.toast.show(
      `Saída registrada de ${this.selectedCourier()?.storeName ?? 'sua loja'}.`,
      'info',
    );
  }

  ignoreOffer(orderId: string): void {
    this.ignoredOfferIds.update((ids) => [...new Set([...ids, orderId])]);
  }

  selectPartner(id: string): void {
    this.partnerId.set(id);
    this.partnerName.set(
      this.data.externalCouriers().find((courier) => courier.id === id)?.name ??
        'Entregador avulso',
    );
    this.ignoredOfferIds.set([]);
    this.loadLocalProfile();
  }

  simulateIncomingOrder(): void {
    if (!this.online()) {
      this.toast.show('Conecte-se para simular um pedido chegando.', 'warning');
      return;
    }
    if (this.mode() === 'Loja' && !this.courierAtStore()) {
      this.toast.show(
        'Registre sua chegada à loja antes de receber uma rota de demonstração.',
        'warning',
      );
      return;
    }

    const orderId = `DEMO-${this.nextDemoOrderId++}`;
    const createdAt = new Date().toISOString();
    const storeName = 'Lanchonete Três Irmãs';
    const storeAddress = 'Rua Cosme de Farias, 418 · Cosme de Farias, Salvador - BA';
    const storeLatitude = -12.9847;
    const storeLongitude = -38.4909;
    const address = 'Rua da Alegria, 48 · Cosme de Farias, Salvador - BA';
    const destinationLatitude = -12.9832;
    const destinationLongitude = -38.486;
    const order: RestaurantOrderRecord = {
      id: orderId,
      customer: 'Cliente de demonstração',
      phone: '(11) 99999-0000',
      address,
      fulfillment: 'delivery',
      paymentMethod: 'Pix',
      deliveryCode: '4826',
      items: '2 itens · 1 sacola',
      lines: [],
      subtotal: 48,
      deliveryFee: 8,
      total: 56,
      channel: 'Loja própria',
      status: 'Pronto',
      time: new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(),
      ),
      receivedAt: createdAt,
      courierId: this.mode() === 'Loja' ? this.courierId() : null,
      externalDispatch: this.mode() === 'Parceiro' ? 'available' : 'closed',
      itemCount: 2,
    };
    this.data.orders.update((orders) => [order, ...orders]);
    const houseOrder: HouseOrderRequest = {
      ...order,
      changeFor: null,
      scheduledAt: null,
      notes: 'Pedido fictício de demonstração',
      fulfillment: 'delivery',
      paymentMethod: 'Pix',
      phone: order.phone ?? '',
      address: order.address ?? '',
      lines: [],
      subtotal: 48,
      deliveryFee: 8,
      total: 56,
      channel: 'Loja própria',
      status: 'Pronto',
      courierId: order.courierId,
    };
    this.data.houseOrders.update((orders) => [houseOrder, ...orders]);
    this.data.recordOrderEvent(orderId, 'Pedido recebido', 'Demonstração');
    this.data.recordOrderEvent(orderId, 'Pronto', 'Demonstração');

    if (this.mode() === 'Loja') {
      const courier = this.selectedCourier();
      if (!courier || !this.courierAtStore()) return;
      this.data.assignStoreCourier(orderId, courier.id);
      this.data.upsertStoreDriverJob({
        orderId,
        courierId: courier.id,
        routeId: `ROTA-DEMO-${courier.id}`,
        itemCount: 2,
        storeName,
        storeAddress,
        storeLatitude,
        storeLongitude,
        customer: order.customer,
        phone: order.phone ?? '',
        address,
        destinationLatitude,
        destinationLongitude,
        deliveryCode: '4826',
        items: order.items,
        paymentMethod: 'Pix',
        total: order.total,
        status: 'Chegou à loja',
        assignedAt: createdAt,
        arrivedAt: createdAt,
      });
      this.data.recordOrderEvent(orderId, 'Motoboy da loja chegou', courier.name);
      this.activeView.set('route');
    } else {
      this.data.externalDeliveryOffers.update((offers) => [
        {
          orderId,
          customer: order.customer,
          storeName: `${storeName} · DEMO`,
          storeAddress,
          storeLatitude,
          storeLongitude,
          address,
          area: 'Cosme de Farias',
          destinationLatitude,
          destinationLongitude,
          items: order.items,
          deliveryFee: 8,
          status: 'available',
          targetCourierId: this.partnerId(),
          deliveryCode: '4826',
        },
        ...offers,
      ]);
      this.activeView.set('offers');
    }
  }

  declineOffer(orderId: string, expired = false): void {
    this.declineOfferBundle([orderId], expired);
  }

  declineOfferBundle(orderIds: string[], expired = false): void {
    if (this.offerActionPending()) return;
    const offers = orderIds
      .map((orderId) =>
        this.data
          .externalDeliveryOffers()
          .find((entry) => entry.orderId === orderId && entry.status === 'available'),
      )
      .filter((offer): offer is ExternalDeliveryOffer => Boolean(offer));
    if (!offers.length) return;
    const primaryOrderId = offers[0].orderId;
    this.offerActionPending.set(primaryOrderId);
    offers.forEach((offer) => {
      this.ignoreOffer(offer.orderId);
      if (offer.targetCourierId) {
        this.data.updateExternalOffer(offer.orderId, 'declined', this.profileName());
      }
    });
    const isBroadcastOnly = offers.every((offer) => !offer.targetCourierId);
    this.toast.show(
      expired
        ? `A oferta direcionada #${primaryOrderId} expirou.`
        : isBroadcastOnly
          ? 'Rota removida do seu Radar; as chamadas seguem disponíveis para outros entregadores.'
          : `Oferta #${offers.map((offer) => `#${offer.orderId}`).join(' + ')} recusada.`,
      expired ? 'warning' : 'info',
    );
    window.setTimeout(() => {
      if (this.offerActionPending() === primaryOrderId) this.offerActionPending.set(null);
    }, 350);
  }

  setOnline(online: boolean): void {
    if (this.mode() === 'Parceiro') {
      this.partnerOnline.set(online);
      this.data.setExternalCourierOnline(this.partnerId(), online);
      if (online) this.startLiveLocation();
      else this.stopLiveLocation();
      if (online) void this.alerts.activateFromUserGesture();
      this.toast.show(
        online ? 'Você está disponível para ofertas.' : 'Você ficou offline.',
        'info',
      );
      return;
    }

    const id = this.courierId();
    this.data.setStoreCourierOnline(id, online);
    this.courierSessionOnline.set(online);
    if (online) this.startLiveLocation();
    else this.stopLiveLocation();
    if (online) void this.alerts.activateFromUserGesture();
    this.toast.show(
      online ? 'Você está disponível para entregas da loja.' : 'Você ficou offline.',
      'info',
    );
  }

  acceptOffer(orderId: string): void {
    const activeBundle = this.actionableOffers();
    if (activeBundle[0]?.orderId === orderId) {
      this.acceptOfferBundle(activeBundle);
      return;
    }
    const offer = this.data
      .externalDeliveryOffers()
      .find((item) => item.orderId === orderId && item.status === 'available');
    if (offer) this.acceptOfferBundle([offer]);
  }

  acceptOfferBundle(bundle: ExternalDeliveryOffer[]): void {
    if (this.offerActionPending()) return;
    if (!this.online()) {
      this.toast.show('Fique online para aceitar uma oferta.', 'warning');
      return;
    }
    const offers = bundle
      .slice(0, 2)
      .map((offer) =>
        this.data
          .externalDeliveryOffers()
          .find((current) => current.orderId === offer.orderId && current.status === 'available'),
      )
      .filter((offer): offer is ExternalDeliveryOffer => Boolean(offer));
    if (!offers.length) return;

    const primaryOrderId = offers[0].orderId;
    this.offerActionPending.set(primaryOrderId);
    const bundleItemCount = offers.reduce((total, offer) => total + this.offerItemCount(offer), 0);
    const currentLoad = this.activeJobs().reduce((total, job) => total + job.itemCount, 0);
    if (currentLoad + bundleItemCount > this.data.maxItemsPerCourier()) {
      this.offerActionPending.set(null);
      this.toast.show('A rota atingiu a capacidade máxima de itens.', 'warning');
      return;
    }
    const groupedJob = this.activeJobs().find((job) =>
      offers.some((offer) => this.nearbyDelivery(job, offer)),
    );
    const area = this.normalizeArea(offers[0].address, offers[0].area) || 'regiao';
    const areaSlug = area
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-');
    const routeId = groupedJob?.routeId ?? `${this.partnerId()}-${areaSlug}`;

    offers.forEach((offer) => {
      this.data.updateExternalOffer(offer.orderId, 'accepted', this.profileName());
      this.data.upsertStoreDriverJob({
        orderId: offer.orderId,
        courierId: -1,
        routeId,
        itemCount: this.offerItemCount(offer),
        customer: offer.customer,
        phone: 'Telefone protegido até a coleta',
        address: offer.address,
        area: offer.area ?? area,
        storeName: offer.storeName,
        storeAddress: offer.storeAddress,
        storeLatitude: offer.storeLatitude,
        storeLongitude: offer.storeLongitude,
        destinationLatitude: offer.destinationLatitude,
        destinationLongitude: offer.destinationLongitude,
        deliveryCode: offer.deliveryCode,
        items: offer.items,
        paymentMethod: 'Pix',
        total: offer.deliveryFee,
        status: 'A caminho da loja',
        externalCourierId: this.partnerId(),
      });
    });
    const acceptedOrders = offers.map((offer) => `#${offer.orderId}`).join(' + ');
    this.toast.show(
      `${offers.length > 1 ? 'Rota dupla' : 'Entrega'} ${acceptedOrders} aceita. Siga a ordem calculada das coletas.`,
      'success',
    );
    window.setTimeout(() => {
      if (this.offerActionPending() === primaryOrderId) this.offerActionPending.set(null);
    }, 350);
  }

  advanceJob(job: StoreDriverJob): void {
    if (this.jobActionPending()) return;
    this.jobActionPending.set(job.orderId);
    const releaseAction = () => {
      window.setTimeout(() => {
        if (this.jobActionPending() === job.orderId) this.jobActionPending.set(null);
      }, 350);
    };
    const next: Record<StoreDriverJob['status'], StoreDriverJob['status']> = {
      'A caminho da loja': 'Chegou à loja',
      'Chegou à loja': 'Coletado',
      Coletado: 'Em entrega',
      'Em entrega': 'Entregue',
      Entregue: 'Entregue',
    };
    const status = next[job.status];
    if (status === 'Entregue' && job.deliveryCode) {
      const enteredCode = this.deliveryCodeInputs()[job.orderId] ?? '';
      if (enteredCode !== job.deliveryCode) {
        this.deliveryCodeErrors.update((errors) => ({
          ...errors,
          [job.orderId]: 'O código informado não confere. Peça o código ao cliente.',
        }));
        this.alerts.announce('Código de entrega incorreto.', 'Entrega não confirmada', 'late', {
          speak: false,
          notify: false,
        });
        this.jobActionPending.set(null);
        return;
      }
    }

    this.data.updateStoreDriverJob(job.orderId, status);
    if (status === 'Chegou à loja' && job.courierId > 0) {
      this.data.setStoreCourierAtStore(job.courierId, true);
      this.data.recordOrderEvent(job.orderId, 'Motoboy da loja chegou', this.accountName());
      this.alerts.announce('Motoboy da loja chegou à loja.', 'Chegada registrada', 'arrival');
    } else if (status === 'Coletado') {
      this.data.updateHouseOrderStatus(job.orderId, 'Pedido coletado');
    } else if (status === 'Em entrega') {
      if (job.courierId > 0) this.data.setStoreCourierAtStore(job.courierId, false);
      this.data.updateHouseOrderStatus(job.orderId, 'Em entrega');
    } else if (status === 'Entregue') {
      this.data.updateHouseOrderStatus(job.orderId, 'Concluído');
      this.deliveryCodeInputs.update((codes) => {
        const remaining = { ...codes };
        delete remaining[job.orderId];
        return remaining;
      });
      this.deliveryCodeErrors.update((errors) => ({ ...errors, [job.orderId]: '' }));
      this.alerts.announce('Entrega confirmada.', 'Entrega concluída', 'success', {
        speak: false,
        notify: false,
      });
    }

    if (job.courierId === -1 && status === 'Entregue') {
      this.data.updateExternalOffer(job.orderId, 'delivered', this.accountName());
    } else if (job.courierId === -1 && status === 'Coletado') {
      this.data.updateExternalOffer(job.orderId, 'picked-up', this.accountName());
    }
    this.toast.show(`Pedido #${job.orderId}: ${status}.`, 'success');
    releaseAction();
  }

  onProofSelected(job: StoreDriverJob, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      this.toast.show('Escolha uma imagem de até 5 MB.', 'warning');
      input.value = '';
      return;
    }
    this.proofPendingOrder.set(job.orderId);
    const reader = new FileReader();
    reader.onload = () => {
      this.data.updateStoreDriverJob(job.orderId, job.status, String(reader.result ?? ''));
      this.proofPendingOrder.set(null);
      this.toast.show('Comprovante adicionado ao pedido.', 'success');
    };
    reader.onerror = () => {
      this.proofPendingOrder.set(null);
      this.toast.show('Não foi possível carregar a imagem.', 'error');
    };
    reader.readAsDataURL(file);
  }

  actionLabel(job: StoreDriverJob): string {
    switch (job.status) {
      case 'A caminho da loja':
        return 'Registrar chegada à loja';
      case 'Chegou à loja':
        return 'Confirmar coleta';
      case 'Coletado':
        return 'Iniciar entrega';
      case 'Em entrega':
        return 'Confirmar entrega';
      default:
        return 'Concluído';
    }
  }
}
