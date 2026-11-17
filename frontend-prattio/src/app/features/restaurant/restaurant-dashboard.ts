import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, Injector, signal, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

import { ToastService } from '../../core/notifications/toast.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ThemeToggle } from '../../shared/ui/theme-toggle/theme-toggle';
import { Announcement, AuthApiService } from '../auth/auth-api.service';
import { AnnouncementLiveService } from './announcement-live.service';
import {
  HouseOrderLine,
  HouseOrderStatus,
  MenuChannel,
  MenuModifierGroup,
  preparationDelayLevel,
  RestaurantDataService,
  RestaurantMenuItem,
  TvStatusColor,
} from './restaurant-data.service';

type SectionId = 'overview' | 'orders' | 'menu' | 'couriers' | 'finance' | 'integrations' | 'store' | 'settings';
type OrderStatus =
  | 'Novo'
  | 'Em preparo'
  | 'Pronto'
  | 'Entregador a caminho'
  | 'Pedido coletado'
  | 'Saiu para entrega'
  | 'Em entrega'
  | 'Cancelamento solicitado'
  | 'Reembolso solicitado'
  | 'Cancelado parcialmente'
  | 'Concluído'
  | 'Cancelado';
type DialogKind = 'menu' | 'courier' | 'order' | null;
type OrderChannel = 'iFood' | '99Food' | 'Loja própria';
type FulfillmentMethod = 'delivery' | 'pickup';
type PaymentMethod = 'Pix' | 'Crédito' | 'Débito' | 'Dinheiro';

interface Courier {
  id: number;
  name: string;
  phone: string;
  active: boolean;
  online: boolean;
  kind: 'Loja' | 'Parceiro';
  ordersToday: number;
  cpf?: string;
  birthDate?: string;
  email?: string;
  photoUrl?: string;
  payModel?: 'Fixo por entrega' | '% por pedido';
  payValue?: number;
  pixKey?: string;
  pixHolder?: string;
}

interface Integration {
  id: 'ifood' | 'food99' | 'whatsapp' | 'asaas';
  name: string;
  description: string;
  icon: string;
  status: 'Pendente backend' | 'Sandbox disponível' | 'Homologação necessária';
  documentationUrl: string;
}

interface MenuDraft {
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  modifierGroups: MenuModifierGroup[];
  ifoodPrice: string;
  food99Price: string;
  housePrice: string;
}

interface CourierDraft {
  name: string;
  cpf: string;
  birthDate: string;
  phone: string;
  email: string;
  photoUrl: string;
  payModel: 'Fixo por entrega' | '% por pedido';
  payValue: string;
  pixKey: string;
  pixHolder: string;
}

interface OrderDraft {
  customer: string;
  phone: string;
  address: string;
  deliveryFee: string;
  fulfillment: FulfillmentMethod;
  paymentMethod: PaymentMethod;
  changeFor: string;
  scheduledAt: string;
  notes: string;
  channel: OrderChannel;
}

interface ManualOrderLine {
  menuItemId: number | null;
  quantity: number;
}

interface SettlementRow {
  id: string;
  orderId: string;
  channel: OrderChannel;
  date: string;
  gross: number;
  commission: number;
  paymentFee: number;
  net: number;
  status: 'A liberar' | 'Previsto' | 'Pago';
}

interface PayoutRow {
  id: string;
  date: string;
  amount: number;
  destination: string;
  status: 'Concluído' | 'Processando' | 'Agendado';
}

@Component({
  selector: 'app-restaurant-dashboard',
  imports: [NgIcon, RouterLink, ThemeToggle, DatePipe],
  templateUrl: './restaurant-dashboard.html',
  styleUrl: './restaurant-dashboard.css',
})
export class RestaurantDashboard {
  protected readonly toast = inject(ToastService);
  protected readonly theme = inject(ThemeService);
  private readonly restaurantData = inject(RestaurantDataService);
  private readonly auth = inject(AuthApiService);
  protected readonly announcementLive = inject(AnnouncementLiveService);
  private readonly injector = inject(Injector);
  @ViewChild('guideTitle') private guideTitle?: ElementRef<HTMLElement>;
  @ViewChild('sectionTitle') private sectionTitle?: ElementRef<HTMLElement>;
  private nextMenuId = 8;
  private nextModifierId = 1;

  readonly storeName = this.restaurantData.storeName;
  readonly storeAddress = this.restaurantData.storeAddress;
  readonly storeNameDraft = signal(this.storeName());
  readonly storeAddressDraft = signal(this.storeAddress());
  readonly storeOpen = this.restaurantData.storeOpen;
  readonly activeSection = signal<SectionId>('overview');
  readonly guideSteps: readonly {
    title: string;
    shortLabel: string;
    description: string;
    section: SectionId;
    action: string;
    icon: string;
    tips: readonly string[];
  }[] = [
    {
      title: 'Bem-vindo à Prattio',
      shortLabel: 'Comece aqui',
      description: 'Conheça o painel do seu restaurante e descubra onde encontrar cada ferramenta.',
      section: 'overview',
      action: 'Ver visão geral',
      icon: 'lucideLayoutDashboard',
      tips: [
        'Veja os indicadores na visão geral.',
        'Acesse pedidos, cardápio e entregas pelo menu.',
        'Encontre financeiro e integrações na área de gestão.',
      ],
    },
    {
      title: 'Conheça sua loja',
      shortLabel: 'Sua loja',
      description: 'Comece pela área que reúne a apresentação e a operação do estabelecimento.',
      section: 'store',
      action: 'Abrir Loja',
      icon: 'lucideStore',
      tips: [
        'Confira onde ficam o nome e o endereço da loja.',
        'Conheça o controle de loja aberta ou pausada.',
        'Use a ajuda da própria página sempre que precisar.',
      ],
    },
    {
      title: 'Organize o cardápio',
      shortLabel: 'Cardápio',
      description: 'Explore a organização dos produtos e como eles aparecem nos diferentes canais.',
      section: 'menu',
      action: 'Abrir Cardápio',
      icon: 'lucideUtensils',
      tips: [
        'Navegue pelas categorias e encontre os produtos.',
        'Conheça o formulário para adicionar um item.',
        'Veja exemplos de preços e disponibilidade por canal.',
      ],
    },
    {
      title: 'Acompanhe os pedidos',
      shortLabel: 'Pedidos',
      description: 'Descubra como acompanhar cada etapa do atendimento em um só lugar.',
      section: 'orders',
      action: 'Abrir Pedidos',
      icon: 'lucideShoppingBag',
      tips: [
        'Filtre pedidos por status, canal e modalidade.',
        'Explore as etapas de preparo e entrega.',
        'Conheça as opções de despacho e atribuição.',
      ],
    },
    {
      title: 'Conheça as entregas',
      shortLabel: 'Entregas',
      description: 'Entenda onde acompanhar a equipe e organizar as entregas da loja.',
      section: 'couriers',
      action: 'Abrir Entregadores',
      icon: 'lucideBike',
      tips: [
        'Consulte a lista e a disponibilidade dos entregadores.',
        'Conheça o formulário de cadastro da equipe.',
        'Explore as opções de rota e capacidade.',
      ],
    },
  ];
  readonly sectionHelp: Record<SectionId, string> = {
    overview: 'Consulte os indicadores e use o menu para acessar as áreas da loja.',
    orders: 'Use os filtros para localizar pedidos e os controles de cada pedido para explorar status e despacho.',
    menu: 'Explore categorias e produtos. Use Adicionar item para conhecer o formulário do cardápio.',
    couriers: 'Consulte a equipe e use Cadastrar entregador para conhecer o formulário de entregas.',
    finance: 'Confira os exemplos de vendas, taxas e repasses apresentados nesta área.',
    integrations: 'Consulte os canais disponíveis e os requisitos de integração. As conexões ainda dependem do backend.',
    store: 'Explore os dados do estabelecimento e as opções de funcionamento da loja.',
    settings: 'Acesse o guia, ajuste a aparência e consulte a disponibilidade dos canais de comunicação.',
  };
  readonly guideStep = signal(0);
  readonly guideOpen = signal(
    this.auth.currentUser()?.role === 'restaurant' && !this.auth.currentUser()?.onboardingCompleted,
  );
  readonly guideSaving = signal(false);
  readonly feedbackKind = signal<'suggestion' | 'problem'>('suggestion');
  readonly feedbackMessage = signal('');
  readonly feedbackSaving = signal(false);
  readonly feedbackError = signal('');
  readonly newAccountEmail = signal('');
  readonly accountPassword = signal('');
  readonly accountEmailSaving = signal(false);
  readonly accountEmailError = signal('');
  readonly accountEmailCode = signal('');
  readonly accountCodeSaving = signal(false);
  readonly accountCodeError = signal('');
  readonly announcements = signal<Announcement[]>([]);
  readonly announcementsOpened = signal(false);
  readonly announcementsLoading = signal(false);
  readonly announcementsError = signal('');
  readonly announcementReadingId = signal<string | null>(null);
  private announcementsRefreshPending = false;
  readonly selectedAnnouncement = signal<{ item: Announcement; example: boolean } | null>(null);
  readonly exampleAnnouncements: readonly Announcement[] = [
    { id: 'example-news', category: 'news', title: 'Novidades para sua operação', message: 'Exemplo de notícia: conheça novidades e melhorias da plataforma nesta área.', publishedAt: '2026-01-01T12:00:00Z', readAt: null },
    { id: 'example-notice', category: 'notice', title: 'Aviso importante', message: 'Exemplo de aviso: informações importantes para sua conta aparecerão aqui.', publishedAt: '2026-01-01T12:00:00Z', readAt: null },
  ];
  readonly guideMinimized = signal(false);
  readonly signedInRestaurant = computed(() => this.auth.currentUser()?.role === 'restaurant');
  readonly accountName = computed(() => this.auth.currentUser()?.name ?? 'Visitante');
  readonly accountEmail = computed(() => this.auth.currentUser()?.email ?? null);
  readonly accountInitials = computed(() =>
    this.accountName().trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join(''),
  );
  readonly sidebarOpen = signal(false);
  readonly mobileSearchOpen = signal(false);
  readonly searchQuery = signal('');
  readonly orderFilter = signal('Todos');
  readonly menuCategory = signal('Todas');
  readonly dialog = signal<DialogKind>(null);
  readonly dialogError = signal('');
  readonly editingMenuId = signal<number | null>(null);
  readonly editingCourierId = signal<number | null>(null);
  readonly pendingIntegration = signal<string | null>(null);
  readonly payoutPending = signal(false);
  readonly orderChannelFilter = signal('Todos');
  readonly orderCourierFilter = signal('Todos');
  readonly orderFulfillmentFilter = signal('Todos');
  readonly orderPeriodFilter = signal('24 horas');
  readonly allowExternalCourier = signal(true);
  readonly reconciliationFilter = signal('Todos os canais');
  readonly financePeriod = signal('7 dias');

  readonly menuDraft = signal<MenuDraft>({
    name: '',
    category: 'Pratos',
    description: '',
    imageUrl: '',
    modifierGroups: [],
    ifoodPrice: '',
    food99Price: '',
    housePrice: '',
  });
  readonly courierDraft = signal<CourierDraft>({
    name: '',
    cpf: '',
    birthDate: '',
    phone: '',
    email: '',
    photoUrl: '',
    payModel: 'Fixo por entrega',
    payValue: '8',
    pixKey: '',
    pixHolder: '',
  });
  readonly orderDraft = signal<OrderDraft>({
    customer: '',
    phone: '',
    address: '',
    deliveryFee: '0',
    fulfillment: 'delivery',
    paymentMethod: 'Pix',
    changeFor: '',
    scheduledAt: '',
    notes: '',
    channel: 'Loja própria',
  });
  readonly manualOrderLines = signal<ManualOrderLine[]>([{ menuItemId: null, quantity: 1 }]);
  readonly manualOrderSubtotal = computed(() =>
    this.manualOrderLines().reduce((total, line) => {
      const item = this.menuItems().find((entry) => entry.id === line.menuItemId);
      return total + (item?.channels['Loja própria'].price ?? 0) * line.quantity;
    }, 0),
  );

  readonly navItems = [
    {
      id: 'overview',
      label: 'Visão geral',
      description: 'Acompanhe o ritmo da loja e as prioridades da operação.',
      icon: 'lucideLayoutDashboard',
      group: 'Operação',
    },
    {
      id: 'orders',
      label: 'Pedidos',
      description: 'Organize o atendimento e o despacho dos pedidos.',
      icon: 'lucideShoppingBag',
      group: 'Operação',
    },
    {
      id: 'menu',
      label: 'Cardápio',
      description: 'Gerencie produtos, preços e disponibilidade.',
      icon: 'lucideUtensils',
      group: 'Operação',
    },
    {
      id: 'couriers',
      label: 'Entregadores',
      description: 'Mantenha a equipe de entrega vinculada à loja.',
      icon: 'lucideBike',
      group: 'Operação',
    },
    {
      id: 'finance',
      label: 'Financeiro',
      description: 'Acompanhe vendas, repasses e movimentações.',
      icon: 'lucideWallet',
      group: 'Gestão',
    },
    {
      id: 'integrations',
      label: 'Integrações',
      description: 'Gerencie seus canais de venda e serviços conectados.',
      icon: 'lucidePlug',
      group: 'Gestão',
    },
    {
      id: 'store',
      label: 'Loja',
      description: 'Atualize os dados e o estado de funcionamento da loja.',
      icon: 'lucideStore',
      group: 'Gestão',
    },
    {
      id: 'settings',
      label: 'Configurações',
      description: 'Personalize sua experiência e encontre ajuda.',
      icon: 'lucideSettings',
      group: 'Gestão',
    },
  ] as const;

  readonly activePage = computed(
    () => this.navItems.find((item) => item.id === this.activeSection()) ?? this.navItems[0],
  );
  readonly searchPlaceholder = computed(() => {
    switch (this.activeSection()) {
      case 'orders': return 'Buscar pedidos';
      case 'menu': return 'Buscar no cardápio';
      case 'couriers': return 'Buscar entregadores';
      default: return null;
    }
  });
  readonly primaryAction = computed(() => {
    switch (this.activeSection()) {
      case 'orders':
        return 'Novo pedido';
      case 'menu':
        return 'Adicionar item';
      case 'couriers':
        return 'Cadastrar entregador';
      default:
        return null;
    }
  });

  readonly orderFilters = ['Todos', 'Novos', 'Em andamento', 'Concluídos'] as const;
  readonly orderChannelFilters = ['Todos', 'iFood', '99Food', 'Loja própria'] as const;
  readonly menuChannels: readonly MenuChannel[] = ['iFood', '99Food', 'Loja própria'];
  readonly orderStatuses: readonly OrderStatus[] = [
    'Novo',
    'Em preparo',
    'Pronto',
    'Entregador a caminho',
    'Pedido coletado',
    'Saiu para entrega',
    'Em entrega',
    'Cancelamento solicitado',
    'Reembolso solicitado',
    'Cancelado parcialmente',
    'Concluído',
    'Cancelado',
  ];
  readonly menuCategories = ['Todas', 'Pratos', 'Pizzas', 'Lanches', 'Bebidas', 'Sobremesas'];
  readonly transactions = [
    { title: 'Pedidos iFood', subtitle: 'Repasse previsto · 14:30', amount: 1284.5, kind: 'in' },
    {
      title: 'Compra de insumos',
      subtitle: 'Fornecedor · hoje, 10:18',
      amount: -438.9,
      kind: 'out',
    },
    { title: 'Pedidos diretos', subtitle: 'WhatsApp e balcão · hoje', amount: 862.4, kind: 'in' },
    { title: 'Taxa de entrega', subtitle: 'Ajuste operacional · ontem', amount: -96, kind: 'out' },
  ] as const;
  readonly commissionRates = [
    { channel: 'iFood', rate: '23% estimado' },
    { channel: '99Food', rate: '23% estimado' },
    { channel: 'Loja própria', rate: '3% de pagamento' },
  ] as const;

  readonly settlements = signal<SettlementRow[]>([
    {
      id: 'S-8421',
      orderId: '2841',
      channel: 'iFood',
      date: 'Hoje, 12:42',
      gross: 89.9,
      commission: 20.68,
      paymentFee: 2.7,
      net: 66.52,
      status: 'A liberar',
    },
    {
      id: 'S-8420',
      orderId: '2840',
      channel: 'Loja própria',
      date: 'Hoje, 12:36',
      gross: 132.5,
      commission: 0,
      paymentFee: 3.98,
      net: 128.52,
      status: 'Previsto',
    },
    {
      id: 'S-8419',
      orderId: '2839',
      channel: '99Food',
      date: 'Hoje, 12:21',
      gross: 42,
      commission: 9.66,
      paymentFee: 1.26,
      net: 31.08,
      status: 'A liberar',
    },
    {
      id: 'S-8418',
      orderId: '2838',
      channel: 'Loja própria',
      date: 'Hoje, 12:09',
      gross: 186.7,
      commission: 0,
      paymentFee: 5.6,
      net: 181.1,
      status: 'Previsto',
    },
    {
      id: 'S-8402',
      orderId: '2812',
      channel: 'iFood',
      date: 'Ontem, 20:18',
      gross: 118.9,
      commission: 27.35,
      paymentFee: 3.57,
      net: 87.98,
      status: 'Pago',
    },
    {
      id: 'S-8398',
      orderId: '2807',
      channel: '99Food',
      date: 'Ontem, 19:42',
      gross: 76.5,
      commission: 17.6,
      paymentFee: 2.3,
      net: 56.6,
      status: 'Pago',
    },
  ]);
  readonly payouts = signal<PayoutRow[]>([
    {
      id: 'TR-208',
      date: 'Hoje, 09:14',
      amount: 1250,
      destination: 'Asaas · final 4821',
      status: 'Concluído',
    },
    {
      id: 'TR-207',
      date: 'Ontem, 16:30',
      amount: 840.5,
      destination: 'Asaas · final 4821',
      status: 'Concluído',
    },
    {
      id: 'TR-206',
      date: '18 nov, 08:00',
      amount: 620,
      destination: 'Asaas · final 4821',
      status: 'Agendado',
    },
  ]);

  readonly orders = this.restaurantData.orders;
  readonly courierQueue = this.restaurantData.courierQueue;
  readonly managedCourierId = signal<number | null>(1);
  readonly routeOrderSelection = signal<string[]>([]);
  readonly routeTargetCourierId = signal('');
  readonly routeChangeReason = signal('');
  readonly externalCourierTargetId = signal('nearby');
  readonly tvAccessCode = this.restaurantData.tvAccessCode;
  readonly tvStatusColors = this.restaurantData.tvStatusColors;
  readonly maxItemsPerCourier = this.restaurantData.maxItemsPerCourier;
  readonly prepSlaMinutes = this.restaurantData.prepSlaMinutes;
  readonly orderEvents = this.restaurantData.orderEvents;
  private readonly destroyRef = inject(DestroyRef);
  readonly clock = signal(Date.now());

  readonly menuItems = this.restaurantData.menuItems;

  readonly couriers = this.restaurantData.storeCouriers;
  readonly externalCouriers = this.restaurantData.externalCouriers;

  readonly integrations = signal<Integration[]>([
    {
      id: 'ifood',
      name: 'iFood',
      description: 'Order, Events, Shipping, Catalog e Financial via APIs oficiais e homologação.',
      icon: 'lucideShoppingBag',
      status: 'Homologação necessária',
      documentationUrl: 'https://developer.ifood.com.br/pt-BR/',
    },
    {
      id: 'food99',
      name: '99Food',
      description: 'Pedidos, Menu, Logistics, Financial e callbacks por app autorizado.',
      icon: 'lucideShoppingBag',
      status: 'Sandbox disponível',
      documentationUrl: 'https://developer-food.99app.com/',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      description: 'Conecte seu canal direto para receber pedidos e avisos.',
      icon: 'lucidePhone',
      status: 'Pendente backend',
      documentationUrl: 'https://developers.facebook.com/docs/whatsapp/',
    },
    {
      id: 'asaas',
      name: 'Asaas',
      description: 'Acompanhe cobranças, saldo disponível e transferências.',
      icon: 'lucideWallet',
      status: 'Pendente backend',
      documentationUrl: 'https://docs.asaas.com/',
    },
  ]);

  constructor() {
    const timer = setInterval(() => this.clock.set(Date.now()), 30_000);
    const readSubscription = this.announcementLive.readEvents.subscribe((id) => {
      const readAt = new Date().toISOString();
      this.announcements.update((items) => items.map((item) =>
        item.id === id && !item.readAt ? { ...item, readAt } : item,
      ));
      const current = this.selectedAnnouncement();
      if (current && !current.example && current.item.id === id && !current.item.readAt) {
        this.selectedAnnouncement.set({ ...current, item: { ...current.item, readAt } });
      }
    });
    const connectionSubscription = this.announcementLive.connected.subscribe(() => {
      if (this.announcementsLoading()) this.announcementsRefreshPending = true;
      else if (this.announcementsOpened()) void this.loadAnnouncements();
    });
    this.destroyRef.onDestroy(() => {
      clearInterval(timer);
      readSubscription.unsubscribe();
      connectionSubscription.unsubscribe();
      this.announcementLive.disconnect();
    });
  }

  readonly filteredOrders = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.orderFilter();

    return this.orders().filter((order) => {
      const matchesQuery =
        !query ||
        `${order.id} ${order.customer} ${order.channel} ${order.status}`
          .toLowerCase()
          .includes(query);
      const channelFilter = this.orderChannelFilter();
      const matchesChannel = channelFilter === 'Todos' || order.channel === channelFilter;
      const courierFilter = this.orderCourierFilter();
      const matchesCourier =
        courierFilter === 'Todos' || String(order.courierId ?? '') === courierFilter;
      const fulfillmentFilter = this.orderFulfillmentFilter();
      const matchesFulfillment =
        fulfillmentFilter === 'Todos' || order.fulfillment === fulfillmentFilter;
      const period = this.orderPeriodFilter();
      const age = this.clock() - new Date(order.receivedAt).getTime();
      const matchesPeriod =
        period === 'Todos' ||
        (period === '24 horas' && age <= 86_400_000) ||
        (period === '7 dias' && age <= 604_800_000);
      const matchesStatus =
        filter === 'Todos' ||
        (filter === 'Novos' && order.status === 'Novo') ||
        (filter === 'Em andamento' &&
          [
            'Em preparo',
            'Pronto',
            'Entregador a caminho',
            'Pedido coletado',
            'Saiu para entrega',
            'Em entrega',
            'Cancelamento solicitado',
            'Reembolso solicitado',
          ].includes(order.status)) ||
        (filter === 'Concluídos' &&
          ['Concluído', 'Cancelado', 'Cancelado parcialmente'].includes(order.status));

      return (
        matchesQuery &&
        matchesStatus &&
        matchesChannel &&
        matchesCourier &&
        matchesFulfillment &&
        matchesPeriod
      );
    });
  });

  readonly recentOrders = computed(() =>
    [...this.orders()]
      .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt))
      .slice(0, 5),
  );
  readonly activeOrderCount = computed(
    () =>
      this.orders().filter(
        (order) => !['Concluído', 'Cancelado', 'Cancelado parcialmente'].includes(order.status),
      ).length,
  );
  readonly newOrderCount = computed(
    () => this.orders().filter((order) => order.status === 'Novo').length,
  );
  readonly preparingOrderCount = computed(
    () => this.orders().filter((order) => order.status === 'Em preparo').length,
  );
  readonly deliveryOrderCount = computed(
    () => this.orders().filter((order) => order.status === 'Saiu para entrega').length,
  );
  readonly overviewFlow = computed(() => {
    const orders = this.orders();
    return [
      { label: 'Aguardando preparo', count: orders.filter((o) => ['Novo', 'Entregador a caminho'].includes(o.status)).length, color: 'waiting' },
      { label: 'Em preparo', count: orders.filter((o) => o.status === 'Em preparo').length, color: 'preparing' },
      { label: 'Prontos ou coletados', count: orders.filter((o) => ['Pronto', 'Pedido coletado'].includes(o.status)).length, color: 'ready' },
      { label: 'Em entrega', count: orders.filter((o) => ['Saiu para entrega', 'Em entrega'].includes(o.status)).length, color: 'delivery' },
      { label: 'Solicitações', count: orders.filter((o) => ['Cancelamento solicitado', 'Reembolso solicitado'].includes(o.status)).length, color: 'attention' },
    ];
  });
  readonly preparationAlerts = computed(() => {
    const now = this.clock();
    const events = this.orderEvents();
    return this.orders()
      .filter((order) => ['Novo', 'Entregador a caminho', 'Em preparo'].includes(order.status))
      .map((order) => ({
        order,
        level: order.scheduledAt
          ? 'unknown' as const
          : preparationDelayLevel(
              { ...order, events: events.filter((event) => event.orderId === order.id) },
              now,
              this.prepSlaMinutes(),
              this.restaurantData.warningBeforeSlaMinutes(),
            ),
      }));
  });
  readonly latePreparationOrders = computed(() =>
    this.preparationAlerts().filter((entry) => entry.level === 'late'),
  );
  readonly warningPreparationCount = computed(() =>
    this.preparationAlerts().filter((entry) => entry.level === 'warning').length,
  );
  readonly unknownPreparationCount = computed(() =>
    this.preparationAlerts().filter((entry) => entry.level === 'unknown').length,
  );
  readonly requestCount = computed(() =>
    this.orders().filter((order) => ['Cancelamento solicitado', 'Reembolso solicitado'].includes(order.status)).length,
  );
  readonly grossSettlementTotal = computed(() =>
    this.settlements().reduce((total, row) => total + row.gross, 0),
  );
  readonly platformCommissionTotal = computed(() =>
    this.settlements().reduce((total, row) => total + row.commission, 0),
  );
  readonly paymentFeeTotal = computed(() =>
    this.settlements().reduce((total, row) => total + row.paymentFee, 0),
  );
  readonly netSettlementTotal = computed(() =>
    this.settlements().reduce((total, row) => total + row.net, 0),
  );
  readonly pendingSettlementTotal = computed(() =>
    this.settlements()
      .filter((row) => row.status !== 'Pago')
      .reduce((total, row) => total + row.net, 0),
  );
  readonly availableBalance = signal(3842.55);
  readonly transferredTotal = computed(() =>
    this.payouts()
      .filter((payout) => payout.status === 'Concluído')
      .reduce((total, payout) => total + payout.amount, 0),
  );
  readonly filteredSettlements = computed(() => {
    const channel = this.reconciliationFilter();
    return this.settlements().filter(
      (row) => channel === 'Todos os canais' || row.channel === channel,
    );
  });
  readonly activeCourierCount = computed(
    () => this.couriers().filter((courier) => courier.active).length,
  );
  readonly onlineCourierCount = computed(
    () => this.couriers().filter((courier) => courier.active && courier.online).length,
  );
  readonly eligibleStoreCourierCount = computed(
    () =>
      this.couriers().filter(
        (courier) =>
          courier.active &&
          courier.online &&
          Boolean(courier.atStoreSince) &&
          this.courierCapacityLeft(courier.id) > 0,
      ).length,
  );
  readonly availableMenuCount = computed(
    () =>
      this.menuItems().filter((item) =>
        this.menuChannels.some((channel) => item.channels[channel].available),
      ).length,
  );
  readonly filteredMenuItems = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.menuCategory();

    return this.menuItems().filter((item) => {
      const matchesCategory = category === 'Todas' || item.category === category;
      const matchesQuery = !query || `${item.name} ${item.category}`.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  });
  readonly filteredCouriers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    return this.couriers().filter(
      (courier) =>
        !query ||
        `${courier.name} ${courier.phone} ${courier.cpf ?? ''} ${courier.email ?? ''}`
          .toLowerCase()
          .includes(query),
    );
  });
  readonly assignableOrders = computed(() =>
    this.orders().filter(
      (order) =>
        order.channel === 'Loja própria' &&
        order.fulfillment !== 'pickup' &&
        !['Concluído', 'Cancelado', 'Cancelado parcialmente'].includes(order.status),
    ),
  );

  readonly currentDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  selectSection(section: SectionId): void {
    this.selectedAnnouncement.set(null);
    if (this.guideOpen()) {
      this.guideOpen.set(false);
      this.guideMinimized.set(true);
    }
    this.activeSection.set(section);
    this.searchQuery.set('');
    this.sidebarOpen.set(false);
    this.mobileSearchOpen.set(false);
  }

  openOverviewOrders(): void {
    this.orderFilter.set('Todos');
    this.orderChannelFilter.set('Todos');
    this.orderCourierFilter.set('Todos');
    this.orderFulfillmentFilter.set('Todos');
    this.orderPeriodFilter.set('Todos');
    this.selectSection('orders');
  }

  openGuide(): void {
    this.guideMinimized.set(false);
    this.guideOpen.set(true);
    afterNextRender(() => this.guideTitle?.nativeElement.focus(), { injector: this.injector });
  }

  openGuideSection(): void {
    this.selectSection(this.guideSteps[this.guideStep()].section);
    afterNextRender(() => this.sectionTitle?.nativeElement.focus(), { injector: this.injector });
  }

  async finishGuide(): Promise<void> {
    const user = this.auth.currentUser();
    if (user?.role === 'restaurant' && !user.onboardingCompleted) {
      this.guideSaving.set(true);
      try {
        await this.auth.completeRestaurantOnboarding();
      } catch (error) {
        if (!(error instanceof HttpErrorResponse)) throw error;
        this.toast.show(
          error.status === 401
            ? 'Sua sessão expirou. Entre novamente para salvar a conclusão do guia.'
            : 'Não foi possível salvar a conclusão do guia. Tente novamente.',
          'error',
        );
        return;
      } finally {
        this.guideSaving.set(false);
      }
    } else if (user?.role !== 'restaurant') {
      this.toast.show('Entre com sua conta de restaurante para salvar a conclusão do guia.', 'info');
      return;
    }
    this.guideOpen.set(false);
    this.guideMinimized.set(false);
    this.guideStep.set(0);
  }

  async submitFeedback(event: Event): Promise<void> {
    event.preventDefault();
    if (this.feedbackSaving()) return;
    this.feedbackError.set('');
    if (!this.signedInRestaurant()) {
      this.feedbackError.set('Entre com sua conta de restaurante para registrar o relato.');
      return;
    }
    const message = this.feedbackMessage().trim();
    if (message.length < 10 || message.length > 2000) {
      this.feedbackError.set('Escreva entre 10 e 2000 caracteres.');
      return;
    }
    this.feedbackSaving.set(true);
    try {
      await this.auth.submitRestaurantFeedback(this.feedbackKind(), message);
      this.feedbackMessage.set('');
      this.toast.show('Relato registrado. A consulta pela equipe depende do futuro painel administrativo.', 'success');
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      this.feedbackError.set(
        error.status === 401 || error.status === 403
          ? 'Sua sessão não está disponível. Entre novamente para registrar o relato.'
          : error.status === 429
            ? 'Muitos envios. Aguarde um momento antes de tentar novamente.'
            : 'Não foi possível registrar o relato. Tente novamente.',
      );
    } finally {
      this.feedbackSaving.set(false);
    }
  }

  async requestAccountEmailChange(event: Event): Promise<void> {
    event.preventDefault();
    if (this.accountEmailSaving()) return;
    this.accountEmailError.set('');
    if (!this.signedInRestaurant()) {
      this.accountEmailError.set('Entre com sua conta de restaurante para alterar o e-mail.');
      return;
    }
    const email = this.newAccountEmail().trim().toLowerCase();
    if (!email || !this.accountPassword()) {
      this.accountEmailError.set('Informe o novo e-mail e sua senha atual.');
      return;
    }
    this.accountEmailSaving.set(true);
    try {
      await this.auth.requestEmailChange(email, this.accountPassword());
      this.accountPassword.set('');
      this.newAccountEmail.set('');
      this.toast.show('Confira o código de confirmação no novo e-mail.', 'success');
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      this.accountPassword.set('');
      this.accountEmailError.set(
        error.status === 401 ? 'Senha incorreta ou sessão expirada.'
          : error.status === 409 ? 'Este e-mail já está cadastrado.'
            : error.status === 400 ? 'Confira o novo e-mail e sua senha.'
              : error.status === 429 ? 'Muitas tentativas. Aguarde e tente novamente.'
                : 'Não foi possível enviar a confirmação. Tente novamente.',
      );
    } finally {
      this.accountEmailSaving.set(false);
    }
  }

  async confirmAccountEmail(event: Event): Promise<void> {
    event.preventDefault();
    if (this.accountCodeSaving()) return;
    this.accountCodeError.set('');
    if (!this.signedInRestaurant()) {
      this.accountCodeError.set('Entre com sua conta para confirmar o e-mail.');
      return;
    }
    if (!/^\d{8}$/.test(this.accountEmailCode())) {
      this.accountCodeError.set('Informe o código de 8 dígitos.');
      return;
    }
    this.accountCodeSaving.set(true);
    try {
      await this.auth.confirmEmailChange(this.accountEmailCode());
      this.accountEmailCode.set('');
      this.toast.show('E-mail alterado com sucesso.', 'success');
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      this.accountCodeError.set(
        error.status === 400 ? 'Código inválido, expirado ou com tentativas esgotadas. Solicite outro.'
          : error.status === 409 ? 'Este e-mail já está cadastrado. Solicite outro código.'
            : error.status === 401 ? 'Sua sessão expirou. Entre novamente.'
              : error.status === 429 ? 'Muitas tentativas. Aguarde e tente novamente.'
                : 'Não foi possível confirmar o e-mail. Tente novamente.',
      );
    } finally {
      this.accountCodeSaving.set(false);
    }
  }

  async loadAnnouncements(): Promise<void> {
    this.announcementsOpened.set(true);
    this.announcementsError.set('');
    if (!this.signedInRestaurant()) {
      this.announcementsError.set('Entre com sua conta de restaurante para consultar os avisos.');
      return;
    }
    if (this.announcementsLoading()) return;
    const token = this.auth.accessToken();
    if (token) this.announcementLive.connect(token);
    this.announcementsLoading.set(true);
    try {
      this.announcements.set(await this.auth.listAnnouncements());
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      this.announcementsError.set(
        error.status === 401 || error.status === 403
          ? 'Sua sessão expirou. Entre novamente para consultar os avisos.'
          : 'Não foi possível carregar os avisos. Tente novamente.',
      );
    } finally {
      this.announcementsLoading.set(false);
      if (this.announcementsRefreshPending) {
        this.announcementsRefreshPending = false;
        void this.loadAnnouncements();
      }
    }
  }

  async markAnnouncementRead(id: string): Promise<void> {
    if (this.announcementReadingId()) return;
    this.announcementsError.set('');
    this.announcementReadingId.set(id);
    try {
      await this.auth.markAnnouncementRead(id);
      this.announcements.update((items) => items.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ));
      const current = this.selectedAnnouncement();
      if (current && !current.example && current.item.id === id) {
        this.selectedAnnouncement.set({ ...current, item: { ...current.item, readAt: new Date().toISOString() } });
      }
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      this.announcementsError.set('Não foi possível marcar o aviso como lido. Atualize e tente novamente.');
    } finally {
      this.announcementReadingId.set(null);
    }
  }

  openPrimaryAction(): void {
    switch (this.activeSection()) {
      case 'orders':
        this.openOrderDialog();
        break;
      case 'menu':
        this.openMenuDialog();
        break;
      case 'couriers':
        this.openCourierDialog();
        break;
    }
  }

  signOut(): void {
    this.announcementLive.disconnect();
    this.auth.logout();
  }

  toggleStoreOpen(): void {
    this.restaurantData.setStoreOpen(!this.storeOpen());
    this.toast.show(this.storeOpen() ? 'Loja aberta para novos pedidos.' : 'Loja pausada.', 'info');
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  orderStatusClass(status: OrderStatus): string {
    switch (status) {
      case 'Novo':
        return 'bg-brand/10 text-brand';
      case 'Em preparo':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200';
      case 'Pronto':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200';
      case 'Saiu para entrega':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200';
      case 'Cancelamento solicitado':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200';
      case 'Reembolso solicitado':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200';
      case 'Cancelado parcialmente':
        return 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200';
      case 'Concluído':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200';
      default:
        return 'bg-line text-muted';
    }
  }

  courierName(courierId: number | null): string {
    return this.couriers().find((courier) => courier.id === courierId)?.name ?? 'Não atribuído';
  }

  courierEarnings(courierId: number): number {
    const courier = this.couriers().find((entry) => entry.id === courierId);
    const completedJobs = this.restaurantData
      .storeDriverJobs()
      .filter((job) => job.courierId === courierId && job.status === 'Entregue');
    const value = courier?.payValue ?? 0;
    return courier?.payModel === '% por pedido'
      ? completedJobs.reduce((total, job) => total + (job.total * value) / 100, 0)
      : completedJobs.length * value;
  }

  queuePosition(courierId: number): number | null {
    const position = this.courierQueue().indexOf(courierId);
    return position < 0 ? null : position + 1;
  }

  courierJobs(courierId: number) {
    return this.restaurantData
      .storeDriverJobs()
      .filter((job) => job.courierId === courierId && job.status !== 'Entregue');
  }

  courierLoad(courierId: number): number {
    return this.courierJobs(courierId).reduce((total, job) => total + job.itemCount, 0);
  }

  courierCapacityLeft(courierId: number): number {
    return Math.max(0, this.maxItemsPerCourier() - this.courierLoad(courierId));
  }

  courierWaitingMinutes(courierId: number): number | null {
    const arrived = this.courierJobs(courierId)
      .filter((job) => job.status === 'Chegou à loja' && job.arrivedAt)
      .map((job) => new Date(job.arrivedAt!).getTime());
    return arrived.length
      ? Math.max(0, Math.floor((this.clock() - Math.min(...arrived)) / 60_000))
      : null;
  }

  elapsedSince(timestamp?: string): number | null {
    if (!timestamp) return null;
    const time = new Date(timestamp).getTime();
    return Number.isFinite(time) ? Math.max(0, Math.floor((this.clock() - time) / 60_000)) : null;
  }

  routeOrderIds(routeId: string): string[] {
    return this.restaurantData
      .storeDriverJobs()
      .filter((job) => job.routeId === routeId && job.status !== 'Entregue')
      .map((job) => job.orderId);
  }

  toggleRouteOrder(orderId: string, selected: boolean): void {
    this.routeOrderSelection.update((ids) =>
      selected ? [...new Set([...ids, orderId])] : ids.filter((id) => id !== orderId),
    );
  }

  assignSelectedOrders(): void {
    const courierId = Number(this.routeTargetCourierId());
    const courier = this.couriers().find((entry) => entry.id === courierId);
    const selected = this.assignableOrders().filter((order) =>
      this.routeOrderSelection().includes(order.id),
    );
    if (!courier?.active || !courier.online || !courier.atStoreSince || selected.length === 0) {
      this.toast.show('Selecione pedidos e um entregador ativo, online e registrado na loja.', 'warning');
      return;
    }
    const selectedIds = new Set(selected.map((order) => order.id));
    const currentLoad = this.restaurantData
      .storeDriverJobs()
      .filter(
        (job) =>
          job.courierId === courierId && job.status !== 'Entregue' && !selectedIds.has(job.orderId),
      )
      .reduce((total, job) => total + job.itemCount, 0);
    const selectedLoad = selected.reduce((total, order) => total + order.itemCount, 0);
    if (currentLoad + selectedLoad > this.maxItemsPerCourier()) {
      this.toast.show('A seleção ultrapassa a capacidade disponível desse motoboy.', 'warning');
      return;
    }
    selected.forEach((order) => {
      if (order.courierId !== courierId) {
        this.assignCourier(order.id, String(courierId), this.routeChangeReason().trim());
      }
    });
    this.routeOrderSelection.set([]);
    this.routeChangeReason.set('');
  }

  waitingMinutes(receivedAt: string): number {
    return Math.max(0, Math.floor((this.clock() - new Date(receivedAt).getTime()) / 60_000));
  }

  eventsForOrder(orderId: string) {
    return this.orderEvents().filter((event) => event.orderId === orderId);
  }

  setMaxItemsPerCourier(value: string): void {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) this.maxItemsPerCourier.set(parsed);
  }

  setPrepSla(value: string): void {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) this.prepSlaMinutes.set(parsed);
  }

  setTvStatusColor(status: TvStatusColor, color: string): void {
    this.restaurantData.setTvStatusColor(status, color);
  }

  courierIsOnline(courierId: number): boolean {
    return this.couriers().some(
      (courier) => courier.id === courierId && courier.active && courier.online,
    );
  }

  updateOrderStatus(orderId: string, status: OrderStatus): void {
    const sharedStatus = [
      'Novo',
      'Em preparo',
      'Pronto',
      'Entregador a caminho',
      'Pedido coletado',
      'Saiu para entrega',
      'Em entrega',
      'Concluído',
      'Cancelado',
    ].includes(status);
    if (sharedStatus) {
      this.restaurantData.updateHouseOrderStatus(orderId, status as HouseOrderStatus);
    } else {
      this.restaurantData.recordOrderEvent(orderId, status, 'Painel da loja');
    }
    if (status === 'Saiu para entrega') {
      this.restaurantData.updateStoreDriverJob(orderId, 'Em entrega');
    } else if (status === 'Concluído') {
      this.restaurantData.updateStoreDriverJob(orderId, 'Entregue');
    }
    if (status === 'Pronto') {
      const order = this.orders().find((entry) => entry.id === orderId);
      if (order?.channel === 'Loja própria' && order.fulfillment !== 'pickup' && !order.courierId) {
        this.assignNextCourier(orderId);
      }
    }
    this.toast.show(`Pedido #${orderId} atualizado para “${status}”.`, 'success');
  }

  resolveOrderRequest(orderId: string, accept: boolean): void {
    this.orders.update((orders) =>
      orders.map((order) => {
        if (order.id !== orderId) return order;
        if (order.status === 'Cancelamento solicitado') {
          return {
            ...order,
            status: accept ? 'Cancelado' : (order.previousStatus ?? 'Em preparo'),
            previousStatus: undefined,
          };
        }
        if (order.status === 'Reembolso solicitado') {
          return {
            ...order,
            status: accept ? 'Cancelado parcialmente' : (order.previousStatus ?? 'Concluído'),
            previousStatus: undefined,
          };
        }
        return order;
      }),
    );
    this.toast.show(
      `Solicitação do pedido #${orderId} ${accept ? 'aceita' : 'recusada'}.`,
      accept ? 'warning' : 'success',
    );
  }

  assignCourier(orderId: string, courierId: string, reason = ''): void {
    const order = this.orders().find((entry) => entry.id === orderId);
    if (!order) return;
    const courier = this.couriers().find((entry) => entry.id === Number(courierId));

    if (
      order?.channel === 'Loja própria' &&
      courierId &&
      (!courier?.active || !courier.online || !courier.atStoreSince)
    ) {
      this.toast.show('O motoboy precisa estar ativo, online e registrado na loja.', 'warning');
      return;
    }

    const parsedId = courierId ? Number(courierId) : null;
    const previousCourierId = order.courierId;
    if (parsedId === null) {
      this.restaurantData.assignStoreCourier(orderId, null);
      this.restaurantData.removeStoreDriverJob(orderId);
      this.toast.show(`Pedido #${orderId} removido da rota.`, 'info');
      return;
    }
    if (courier && parsedId !== null) {
      const activeLoad = this.restaurantData
        .storeDriverJobs()
        .filter(
          (job) =>
            job.courierId === parsedId && job.orderId !== orderId && job.status !== 'Entregue',
        )
        .reduce((total, job) => total + job.itemCount, 0);
      if (activeLoad + order.itemCount > this.restaurantData.maxItemsPerCourier()) {
        this.toast.show('Esse entregador atingiu a capacidade configurada.', 'warning');
        return;
      }
      this.restaurantData.assignStoreCourier(orderId, parsedId);
      this.restaurantData.upsertStoreDriverJob({
        orderId,
        courierId: courier.id,
        routeId:
          this.restaurantData
            .storeDriverJobs()
            .find(
              (job) =>
                job.courierId === courier.id &&
                job.orderId !== orderId &&
                job.status !== 'Entregue',
            )?.routeId ?? `ROTA-${orderId}`,
        itemCount: order.itemCount,
        customer: order.customer,
        phone: order.phone ?? 'Não informado',
        address: order.address ?? this.storeAddress(),
        area: order.address?.split('·').at(-1)?.trim() ?? 'Região da loja',
        items: order.items,
        paymentMethod: order.paymentMethod ?? 'Pix',
        total: order.total,
        deliveryCode: order.deliveryCode,
        status: 'Chegou à loja',
        assignedAt: new Date().toISOString(),
        arrivedAt: courier.atStoreSince,
      });
      this.restaurantData.recordOrderEvent(
        orderId,
        previousCourierId === null ? 'Atribuição manual' : 'Transferência manual',
        'Operação da loja',
        `De ${previousCourierId === null ? 'sem motoboy' : this.courierName(previousCourierId)} para ${courier.name}${reason ? ` · ${reason}` : ''}`,
      );
    }
    this.toast.show('Entregador atualizado no pedido.', 'success');
  }

  assignNextCourier(orderId: string): void {
    const order = this.orders().find((entry) => entry.id === orderId);
    if (!order) return;
    const courier = this.restaurantData.assignNextStoreCourier(orderId, order.itemCount);
    if (!courier) {
      this.toast.show('Nenhum entregador online com capacidade disponível.', 'warning');
      return;
    }
    const existingRoute = this.restaurantData
      .storeDriverJobs()
      .find((job) => job.courierId === courier.id && job.status !== 'Entregue')?.routeId;
    this.restaurantData.upsertStoreDriverJob({
      orderId,
      courierId: courier.id,
      routeId: existingRoute ?? `ROTA-${orderId}`,
      itemCount: order.itemCount,
      customer: order.customer,
      phone: order.phone ?? 'Não informado',
      address: order.address ?? this.storeAddress(),
      area: order.address?.split('·').at(-1)?.trim() ?? 'Região da loja',
      items: order.items,
      paymentMethod: order.paymentMethod ?? 'Pix',
      total: order.total,
      status: 'Chegou à loja',
      arrivedAt: courier.atStoreSince,
      deliveryCode: order.deliveryCode,
    });
    this.restaurantData.recordOrderEvent(
      orderId,
      'Atribuição automática',
      'Fila da loja',
      courier.name,
    );
    this.toast.show(`${courier.name} recebeu o próximo pedido da fila.`, 'success');
  }

  openExternalDispatch(orderId: string): void {
    const order = this.orders().find((entry) => entry.id === orderId);
    if (!order || order.channel !== 'Loja própria') return;
    if (!this.allowExternalCourier()) {
      this.toast.show('Ative a entrega externa nas configurações de despacho.', 'warning');
      return;
    }
    if (this.eligibleStoreCourierCount() > 0) {
      this.toast.show(
        'Há um motoboy da loja presente e com capacidade. Atribua-o antes de chamar um avulso.',
        'warning',
      );
      return;
    }

    const requestedTarget = this.externalCourierTargetId().trim();
    const nearby = this.restaurantData
      .externalCouriers()
      .filter((courier) => courier.online)
      .sort((left, right) => left.approximateDistanceKm - right.approximateDistanceKm)[0];
    const targetCourierId =
      requestedTarget === 'nearby'
        ? (nearby?.id ?? null)
        : requestedTarget === 'broadcast' || !requestedTarget
          ? null
          : requestedTarget;
    if (requestedTarget === 'nearby' && !nearby) {
      this.toast.show(
        'Nenhum avulso online próximo. Informe um ID ou envie para todos.',
        'warning',
      );
      return;
    }

    this.orders.update((orders) =>
      orders.map((entry) =>
        entry.id === orderId ? { ...entry, externalDispatch: 'available' } : entry,
      ),
    );
    this.restaurantData.openExternalOffer({
      orderId,
      storeName: this.storeName(),
      customer: order.customer,
      address: order.address ?? this.storeAddress(),
      area: order.address?.split('·').at(-1)?.trim() ?? 'Região da loja',
      items: order.items,
      deliveryFee: order.deliveryFee ?? 0,
      targetCourierId,
      deliveryCode: order.deliveryCode,
    });
    this.toast.show(
      targetCourierId
        ? `Pedido #${orderId} enviado para avulso ${targetCourierId}.`
        : `Pedido #${orderId} enviado para avulsos online.`,
      'info',
    );
  }

  acceptExternalDispatch(orderId: string): void {
    this.orders.update((orders) =>
      orders.map((order) =>
        order.id === orderId ? { ...order, externalDispatch: 'accepted' } : order,
      ),
    );
    this.restaurantData.updateExternalOffer(orderId, 'accepted', 'Entregador parceiro');
    this.toast.show(`Um entregador parceiro aceitou o pedido #${orderId}.`, 'success');
  }

  deleteOrder(orderId: string): void {
    this.orders.update((orders) => orders.filter((order) => order.id !== orderId));
    this.toast.show(`Pedido #${orderId} removido da lista local.`, 'info');
  }

  openOrderDialog(): void {
    this.orderDraft.set({
      customer: '',
      phone: '',
      address: '',
      deliveryFee: '0',
      fulfillment: 'delivery',
      paymentMethod: 'Pix',
      changeFor: '',
      scheduledAt: '',
      notes: '',
      channel: 'Loja própria',
    });
    this.manualOrderLines.set([{ menuItemId: null, quantity: 1 }]);
    this.prepareDialog('order');
  }

  updateOrderDraft(field: keyof OrderDraft, value: string): void {
    this.orderDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  addManualOrderLine(): void {
    this.manualOrderLines.update((lines) => [...lines, { menuItemId: null, quantity: 1 }]);
  }

  updateManualOrderLine(index: number, field: keyof ManualOrderLine, value: string): void {
    this.manualOrderLines.update((lines) =>
      lines.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        if (field === 'menuItemId') return { ...line, menuItemId: value ? Number(value) : null };
        return { ...line, quantity: Math.max(1, Number(value) || 1) };
      }),
    );
  }

  removeManualOrderLine(index: number): void {
    this.manualOrderLines.update((lines) => lines.filter((_, lineIndex) => lineIndex !== index));
    if (this.manualOrderLines().length === 0) {
      this.manualOrderLines.set([{ menuItemId: null, quantity: 1 }]);
    }
  }

  saveOrder(event: Event): void {
    event.preventDefault();
    const draft = this.orderDraft();
    const lines: HouseOrderLine[] = this.manualOrderLines().flatMap((line) => {
      const item = this.menuItems().find((entry) => entry.id === line.menuItemId);
      if (!item) return [];
      const unitPrice = item.channels['Loja própria'].price;
      return [
        {
          menuItemId: item.id,
          name: item.name,
          quantity: line.quantity,
          unitPrice,
          options: [],
          lineTotal: unitPrice * line.quantity,
        },
      ];
    });
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const deliveryFee = Number(draft.deliveryFee.replace(',', '.')) || 0;
    const total = subtotal + (draft.fulfillment === 'delivery' ? deliveryFee : 0);

    if (
      !draft.customer.trim() ||
      lines.length === 0 ||
      !draft.phone.trim() ||
      (draft.fulfillment === 'delivery' && !draft.address.trim()) ||
      subtotal <= 0 ||
      !Number.isFinite(total)
    ) {
      this.dialogError.set('Preencha cliente, telefone, entrega/endereço e valores válidos.');
      return;
    }

    const orderFields = {
      customer: draft.customer.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      fulfillment: draft.fulfillment,
      paymentMethod: draft.paymentMethod,
      changeFor: draft.paymentMethod === 'Dinheiro' ? Number(draft.changeFor) || null : null,
      scheduledAt: draft.scheduledAt || null,
      notes: draft.notes.trim(),
      lines,
      subtotal,
      deliveryFee: draft.fulfillment === 'delivery' ? deliveryFee : 0,
      items: lines.map((line) => `${line.quantity}x ${line.name}`).join(', '),
      total,
    };
    const id = this.restaurantData.placeHouseOrder(orderFields);
    const deliveryCode = this.orders().find((order) => order.id === id)?.deliveryCode;
    this.closeDialog();
    this.toast.show(
      deliveryCode
        ? `Pedido #${id} criado. Código de entrega: ${deliveryCode}. Compartilhe com o cliente.`
        : `Pedido #${id} criado.`,
      'success',
    );
  }

  openMenuDialog(item?: RestaurantMenuItem): void {
    this.editingMenuId.set(item?.id ?? null);
    this.menuDraft.set(
      item
        ? {
            name: item.name,
            category: item.category,
            description: item.description,
            imageUrl: item.imageUrl ?? '',
            modifierGroups: structuredClone(item.modifierGroups),
            ifoodPrice: String(item.channels.iFood.price),
            food99Price: String(item.channels['99Food'].price),
            housePrice: String(item.channels['Loja própria'].price),
          }
        : {
            name: '',
            category: 'Pratos',
            description: '',
            imageUrl: '',
            modifierGroups: [],
            ifoodPrice: '',
            food99Price: '',
            housePrice: '',
          },
    );
    this.prepareDialog('menu');
  }

  updateMenuDraft(field: keyof MenuDraft, value: string): void {
    this.menuDraft.update((draft) => ({ ...draft, [field]: value }));
  }

  addModifierGroup(): void {
    const group: MenuModifierGroup = {
      id: `modifier-group-${this.nextModifierId++}`,
      name: '',
      required: false,
      minSelect: 0,
      maxSelect: 1,
      options: [],
    };
    this.menuDraft.update((draft) => ({
      ...draft,
      modifierGroups: [...draft.modifierGroups, group],
    }));
  }

  updateModifierGroup(
    groupId: string,
    field: 'name' | 'required' | 'minSelect' | 'maxSelect',
    value: string | boolean,
  ): void {
    this.menuDraft.update((draft) => ({
      ...draft,
      modifierGroups: draft.modifierGroups.map((group) => {
        if (group.id !== groupId) return group;
        if (field === 'name') return { ...group, name: String(value) };
        if (field === 'required')
          return {
            ...group,
            required: Boolean(value),
            minSelect: value ? Math.max(group.minSelect, 1) : 0,
          };
        if (field === 'minSelect') return { ...group, minSelect: Number(value) };
        return { ...group, maxSelect: Number(value) };
      }),
    }));
  }

  addModifierOption(groupId: string): void {
    this.menuDraft.update((draft) => ({
      ...draft,
      modifierGroups: draft.modifierGroups.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              options: [
                ...group.options,
                { id: `modifier-option-${this.nextModifierId++}`, name: '', priceDelta: 0 },
              ],
            },
      ),
    }));
  }

  updateModifierOption(
    groupId: string,
    optionId: string,
    field: 'name' | 'priceDelta',
    value: string,
  ): void {
    this.menuDraft.update((draft) => ({
      ...draft,
      modifierGroups: draft.modifierGroups.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              options: group.options.map((option) =>
                option.id !== optionId
                  ? option
                  : {
                      ...option,
                      [field]: field === 'priceDelta' ? Number(value) || 0 : value,
                    },
              ),
            },
      ),
    }));
  }

  removeModifierGroup(groupId: string): void {
    this.menuDraft.update((draft) => ({
      ...draft,
      modifierGroups: draft.modifierGroups.filter((group) => group.id !== groupId),
    }));
  }

  onMenuImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.dialogError.set('Selecione um arquivo de imagem válido.');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.dialogError.set('A imagem deve ter no máximo 5 MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.menuDraft.update((draft) => ({ ...draft, imageUrl: String(reader.result ?? '') }));
      this.dialogError.set('');
    };
    reader.onerror = () => this.dialogError.set('Não foi possível ler a imagem selecionada.');
    reader.readAsDataURL(file);
  }

  saveMenuItem(event: Event): void {
    event.preventDefault();
    const draft = this.menuDraft();
    const prices = {
      iFood: Number(draft.ifoodPrice.replace(',', '.')),
      '99Food': Number(draft.food99Price.replace(',', '.')),
      'Loja própria': Number(draft.housePrice.replace(',', '.')),
    };

    const invalidGroup = draft.modifierGroups.find((group) => {
      const namedOptions = group.options.filter((option) => option.name.trim().length > 0);
      return (
        !group.name.trim() ||
        group.maxSelect < 1 ||
        group.minSelect < 0 ||
        group.minSelect > group.maxSelect ||
        (group.required && group.minSelect < 1) ||
        namedOptions.length < group.minSelect
      );
    });

    if (
      !draft.name.trim() ||
      !draft.category ||
      !draft.description.trim() ||
      invalidGroup ||
      Object.values(prices).some((price) => price <= 0 || !Number.isFinite(price))
    ) {
      this.dialogError.set(
        invalidGroup
          ? `Revise o grupo “${invalidGroup.name || 'sem nome'}” e suas opções.`
          : 'Informe nome, descrição, categoria e preços válidos para cada plataforma.',
      );
      return;
    }

    const editingId = this.editingMenuId();
    if (editingId !== null) {
      this.menuItems.update((items) =>
        items.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: draft.name.trim(),
                category: draft.category,
                description: draft.description.trim(),
                imageUrl: draft.imageUrl || undefined,
                modifierGroups: structuredClone(draft.modifierGroups),
                channels: {
                  iFood: { ...item.channels.iFood, price: prices.iFood },
                  '99Food': { ...item.channels['99Food'], price: prices['99Food'] },
                  'Loja própria': {
                    ...item.channels['Loja própria'],
                    price: prices['Loja própria'],
                  },
                },
              }
            : item,
        ),
      );
      this.toast.show('Item do cardápio atualizado.', 'success');
    } else {
      this.menuItems.update((items) => [
        {
          id: this.nextMenuId++,
          name: draft.name.trim(),
          category: draft.category,
          description: draft.description.trim(),
          imageUrl: draft.imageUrl || undefined,
          modifierGroups: structuredClone(draft.modifierGroups),
          channels: {
            iFood: { available: true, price: prices.iFood },
            '99Food': { available: true, price: prices['99Food'] },
            'Loja própria': { available: true, price: prices['Loja própria'] },
          },
          soldToday: 0,
        },
        ...items,
      ]);
      this.toast.show('Item adicionado ao cardápio.', 'success');
    }
    this.closeDialog();
  }

  toggleMenuAvailability(itemId: number, channel: MenuChannel): void {
    this.menuItems.update((items) =>
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              channels: {
                ...item.channels,
                [channel]: {
                  ...item.channels[channel],
                  available: !item.channels[channel].available,
                },
              },
            }
          : item,
      ),
    );
    const item = this.menuItems().find((entry) => entry.id === itemId);
    const available = item?.channels[channel].available;
    this.toast.show(
      `${item?.name ?? 'Item'} ${available ? 'disponível' : 'pausado'} em ${channel}.`,
      'info',
    );
  }

  deleteMenuItem(itemId: number): void {
    const item = this.menuItems().find((entry) => entry.id === itemId);
    this.menuItems.update((items) => items.filter((entry) => entry.id !== itemId));
    this.toast.show(item ? `${item.name} removido do cardápio.` : 'Item removido.', 'info');
  }

  openCourierDialog(courier?: Courier): void {
    this.editingCourierId.set(courier?.id ?? null);
    this.courierDraft.set(
      courier
        ? {
            name: courier.name,
            cpf: courier.cpf ?? '',
            birthDate: courier.birthDate ?? '',
            phone: courier.phone,
            email: courier.email ?? '',
            photoUrl: courier.photoUrl ?? '',
            payModel: courier.payModel ?? 'Fixo por entrega',
            payValue: String(courier.payValue ?? 8),
            pixKey: courier.pixKey ?? '',
            pixHolder: courier.pixHolder ?? courier.name,
          }
        : {
            name: '',
            cpf: '',
            birthDate: '',
            phone: '',
            email: '',
            photoUrl: '',
            payModel: 'Fixo por entrega',
            payValue: '8',
            pixKey: '',
            pixHolder: '',
          },
    );
    this.prepareDialog('courier');
  }

  updateCourierDraft(field: keyof CourierDraft, value: string): void {
    this.courierDraft.update((draft) => ({
      ...draft,
      [field]: field === 'payModel' ? (value as CourierDraft['payModel']) : value,
    }));
  }

  onCourierPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2_000_000) {
      this.dialogError.set('Selecione uma imagem de até 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.updateCourierDraft('photoUrl', String(reader.result ?? ''));
    reader.readAsDataURL(file);
  }

  saveCourier(event: Event): void {
    event.preventDefault();
    const draft = this.courierDraft();

    if (
      draft.name.trim().length < 3 ||
      draft.phone.trim().length < 8 ||
      draft.cpf.replace(/\D/g, '').length !== 11 ||
      !draft.email.includes('@') ||
      !draft.pixKey.trim() ||
      !draft.pixHolder.trim() ||
      Number(draft.payValue) <= 0
    ) {
      this.dialogError.set(
        'Preencha identificação, contato, remuneração e dados PIX corretamente.',
      );
      return;
    }

    const editingId = this.editingCourierId();
    if (editingId !== null) {
      this.couriers.update((couriers) =>
        couriers.map((courier) =>
          courier.id === editingId
            ? { ...courier, ...draft, payValue: Number(draft.payValue) }
            : courier,
        ),
      );
      this.toast.show('Cadastro do entregador atualizado.', 'success');
    } else {
      this.restaurantData.addStoreCourier({
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        cpf: draft.cpf.trim(),
        birthDate: draft.birthDate,
        email: draft.email.trim(),
        photoUrl: draft.photoUrl,
        payModel: draft.payModel,
        payValue: Number(draft.payValue),
        pixKey: draft.pixKey.trim(),
        pixHolder: draft.pixHolder.trim(),
        active: true,
        online: false,
      });
      this.toast.show('Entregador vinculado à loja.', 'success');
    }
    this.closeDialog();
  }

  toggleCourier(courierId: number): void {
    const current = this.couriers().find((courier) => courier.id === courierId);
    if (current?.active) this.restaurantData.setStoreCourierOnline(courierId, false);
    this.couriers.update((couriers) =>
      couriers.map((courier) =>
        courier.id === courierId
          ? { ...courier, active: !courier.active, online: !courier.active && courier.online }
          : courier,
      ),
    );
    const courier = this.couriers().find((item) => item.id === courierId);
    this.toast.show(courier?.active ? 'Entregador ativado.' : 'Entregador pausado.', 'info');
  }

  toggleCourierOnline(courierId: number): void {
    const current = this.couriers().find((courier) => courier.id === courierId);
    if (!current?.active) return;
    this.restaurantData.setStoreCourierOnline(courierId, !current.online);
    const courier = this.couriers().find((entry) => entry.id === courierId);
    this.toast.show(
      courier?.online ? `${courier.name} está online.` : `${courier?.name} ficou offline.`,
      'info',
    );
  }

  deleteCourier(courierId: number): void {
    this.restaurantData.removeStoreCourier(courierId);
    this.orders.update((orders) =>
      orders.map((order) =>
        order.courierId === courierId ? { ...order, courierId: null } : order,
      ),
    );
    this.toast.show('Entregador removido da loja.', 'info');
  }

  checkIntegration(integrationId: Integration['id']): void {
    if (this.pendingIntegration()) return;

    this.pendingIntegration.set(integrationId);
    setTimeout(() => {
      this.pendingIntegration.set(null);
      const name = this.integrations().find(
        (integration) => integration.id === integrationId,
      )?.name;
      this.toast.show(
        `${name}: faltam credenciais e um serviço backend seguro para validar a conexão real.`,
        'warning',
      );
    }, 650);
  }

  requestPayout(): void {
    if (this.payoutPending()) return;
    this.payoutPending.set(true);
    setTimeout(() => {
      this.payoutPending.set(false);
      this.payouts.update((payouts) => [
        {
          id: `TR-${208 + payouts.length + 1}`,
          date: 'Agora',
          amount: this.availableBalance(),
          destination: 'Asaas · final 4821',
          status: 'Processando',
        },
        ...payouts,
      ]);
      this.toast.show(
        'Solicitação demonstrativa registrada. Conecte o Asaas para transferências reais.',
        'info',
      );
    }, 700);
  }

  saveStoreSettings(): void {
    const name = this.storeNameDraft().trim();
    const address = this.storeAddressDraft().trim();

    if (name.length < 3 || address.length < 5) {
      this.toast.show('Revise o nome e o endereço da loja.', 'warning');
      return;
    }

    this.restaurantData.saveStore(name, address);
    this.toast.show('Dados da loja salvos nesta sessão.', 'success');
  }

  private prepareDialog(kind: Exclude<DialogKind, null>): void {
    this.dialogError.set('');
    this.dialog.set(kind);
  }

  closeDialog(): void {
    this.dialog.set(null);
    this.dialogError.set('');
  }
}
