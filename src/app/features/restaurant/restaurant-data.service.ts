import { effect, Injectable, signal } from '@angular/core';

export type MenuChannel = 'iFood' | '99Food' | 'Loja própria';
export type FulfillmentMethod = 'delivery' | 'pickup';
export type PaymentMethod = 'Pix' | 'Crédito' | 'Débito' | 'Dinheiro';
export type HouseOrderStatus =
  | 'Novo'
  | 'Em preparo'
  | 'Pronto'
  | 'Entregador a caminho'
  | 'Pedido coletado'
  | 'Saiu para entrega'
  | 'Em entrega'
  | 'Concluído'
  | 'Cancelado';
export type OperationalOrderStatus =
  | HouseOrderStatus
  | 'Cancelamento solicitado'
  | 'Reembolso solicitado'
  | 'Cancelado parcialmente';
export type OperationalOrderChannel = 'iFood' | '99Food' | 'Loja própria';

export interface OrderTimelineEvent {
  id: string;
  orderId: string;
  type: string;
  occurredAt: string;
  actor: string;
  note?: string;
}

export interface RestaurantOrderRecord {
  id: string;
  customer: string;
  phone?: string;
  address?: string;
  fulfillment?: FulfillmentMethod;
  paymentMethod?: PaymentMethod;
  changeFor?: number | null;
  scheduledAt?: string | null;
  notes?: string;
  deliveryCode?: string;
  lines?: HouseOrderLine[];
  items: string;
  subtotal?: number;
  deliveryFee?: number;
  total: number;
  channel: OperationalOrderChannel;
  status: OperationalOrderStatus;
  time: string;
  receivedAt: string;
  courierId: number | null;
  externalDispatch: 'closed' | 'available' | 'accepted';
  previousStatus?: OperationalOrderStatus;
  itemCount: number;
}

export interface RestaurantTvOrder {
  id: string;
  customer: string;
  items: string;
  itemCount: number;
  lines: Array<{ name: string; quantity: number }>;
  total: number;
  channel: OperationalOrderChannel;
  status: OperationalOrderStatus;
  fulfillment?: FulfillmentMethod;
  receivedAt: string;
  scheduledAt?: string | null;
  courierId: number | null;
  courierName?: string;
  courierKind?: 'Loja' | 'Parceiro';
  routeId?: string;
  courierStatus?: 'A caminho da loja' | 'Chegou à loja' | 'Coletado' | 'Em entrega' | 'Entregue';
  assignedAt?: string;
  arrivedAt?: string;
  departedAt?: string;
  completedAt?: string;
  events: Array<{ type: string; occurredAt: string }>;
}

export function preparationDelayLevel(
  order: Pick<RestaurantTvOrder, 'status' | 'receivedAt' | 'events'>,
  now: number,
  slaMinutes: number,
  warningMinutes: number,
): 'on-time' | 'warning' | 'late' | 'unknown' {
  const timestamp =
    order.status === 'Em preparo'
      ? order.events.find((event) => event.type === 'Em preparo')?.occurredAt
      : ['Novo', 'Entregador a caminho'].includes(order.status)
        ? order.receivedAt
        : undefined;
  if (!timestamp) return 'unknown';
  const start = new Date(timestamp).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(now)) return 'unknown';
  const measured = Math.max(0, Math.floor((now - start) / 60_000));
  if (measured >= slaMinutes) return 'late';
  if (measured >= slaMinutes - warningMinutes) return 'warning';
  return 'on-time';
}

export type TvStatusColor = 'new' | 'prep' | 'ready' | 'issue';

export interface ChannelMenuState {
  available: boolean;
  price: number;
}

export interface MenuModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}
export interface MenuModifierGroup {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: MenuModifierOption[];
}
export interface RestaurantMenuItem {
  id: number;
  name: string;
  category: string;
  description: string;
  imageUrl?: string;
  modifierGroups: MenuModifierGroup[];
  channels: Record<MenuChannel, ChannelMenuState>;
  soldToday: number;
}
export interface HouseOrderLine {
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  options: string[];
  lineTotal: number;
}
export interface HouseOrderRequest {
  id: string;
  customer: string;
  phone: string;
  address: string;
  fulfillment: FulfillmentMethod;
  paymentMethod: PaymentMethod;
  changeFor: number | null;
  scheduledAt: string | null;
  notes: string;
  deliveryCode?: string;
  lines: HouseOrderLine[];
  items: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  channel: 'Loja própria';
  status: HouseOrderStatus;
  time: string;
  courierId: number | null;
  externalDispatch: 'closed' | 'available' | 'accepted';
}
export interface ExternalDeliveryOffer {
  orderId: string;
  storeName: string;
  storeAddress?: string;
  storeLatitude?: number;
  storeLongitude?: number;
  customer: string;
  address: string;
  area?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  items: string;
  deliveryFee: number;
  status: 'available' | 'accepted' | 'declined' | 'picked-up' | 'delivered';
  courierName?: string;
  targetCourierId?: string | null;
  deliveryCode?: string;
  customerRelayNumber?: string;
  storeRelayNumber?: string;
}
export interface ExternalCourierProfile {
  id: string;
  name: string;
  online: boolean;
  approximateDistanceKm: number;
  area: string;
}
export interface StoreCourierAccount {
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
  storeName?: string;
  storeAddress?: string;
  payModel?: 'Fixo por entrega' | '% por pedido';
  payValue?: number;
  pixKey?: string;
  pixHolder?: string;
  shiftStartedAt?: string;
  atStoreSince?: string;
}
export interface StoreDriverJob {
  orderId: string;
  courierId: number;
  routeId: string;
  itemCount: number;
  storeName?: string;
  storeAddress?: string;
  storeLatitude?: number;
  storeLongitude?: number;
  customer: string;
  phone: string;
  customerRelayNumber?: string;
  storeRelayNumber?: string;
  address: string;
  area?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  items: string;
  paymentMethod: PaymentMethod;
  total: number;
  status: 'A caminho da loja' | 'Chegou à loja' | 'Coletado' | 'Em entrega' | 'Entregue';
  assignedAt?: string;
  arrivedAt?: string;
  departedAt?: string;
  completedAt?: string;
  externalCourierId?: string;
  deliveryCode?: string;
  proofImage?: string;
}

function channelsFor(price: number): Record<MenuChannel, ChannelMenuState> {
  return {
    iFood: { available: true, price: Number((price * 1.12).toFixed(2)) },
    '99Food': { available: true, price: Number((price * 1.1).toFixed(2)) },
    'Loja própria': { available: true, price },
  };
}

function createItem(
  id: number,
  name: string,
  category: string,
  price: number,
  description: string,
  soldToday: number,
): RestaurantMenuItem {
  return {
    id,
    name,
    category,
    description,
    modifierGroups: [],
    channels: channelsFor(price),
    soldToday,
  };
}

function readValue(key: string): string | null {
  return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
}
function saveValue(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
}

@Injectable({ providedIn: 'root' })
export class RestaurantDataService {
  readonly storeName = signal(readValue('prattio.storeName') || 'Casa do Pátio');
  readonly storeAddress = signal(
    readValue('prattio.storeAddress') || 'Rua Harmonia, 214 · Vila Madalena',
  );
  readonly storeSlug = signal('casa-do-patio');
  readonly tvAccessCode = signal('PATIO-4821');
  readonly tvStatusColors = signal<Record<TvStatusColor, string>>({
    new: '#e69b18',
    prep: '#2b78a5',
    ready: '#16845a',
    issue: '#c34b45',
  });
  readonly storeOpen = signal(readValue('prattio.storeOpen') !== 'false');
  readonly houseOrders = signal<HouseOrderRequest[]>([]);
  readonly orders = signal<RestaurantOrderRecord[]>([
    {
      id: '2841',
      customer: 'Ana Martins',
      items: '2 itens',
      total: 89.9,
      channel: 'iFood',
      status: 'Novo',
      time: '12:42',
      receivedAt: new Date().toISOString(),
      courierId: null,
      externalDispatch: 'closed',
      itemCount: 2,
    },
    {
      id: '2840',
      customer: 'Bruno Costa',
      phone: '(11) 99999-2233',
      items: '3 itens',
      total: 132.5,
      channel: 'Loja própria',
      status: 'Em preparo',
      time: '12:36',
      receivedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
      courierId: null,
      externalDispatch: 'closed',
      itemCount: 3,
    },
    {
      id: '2839',
      customer: 'Juliana Alves',
      items: '1 item',
      total: 42,
      channel: '99Food',
      status: 'Cancelamento solicitado',
      previousStatus: 'Pronto',
      time: '12:21',
      receivedAt: new Date(Date.now() - 27 * 60_000).toISOString(),
      courierId: null,
      externalDispatch: 'closed',
      itemCount: 1,
    },
    {
      id: '2838',
      customer: 'Paulo Mendes',
      phone: '(11) 98888-1100',
      address: 'Rua Harmonia, 214',
      items: '4 itens',
      total: 186.7,
      channel: 'Loja própria',
      status: 'Saiu para entrega',
      time: '12:09',
      receivedAt: new Date(Date.now() - 39 * 60_000).toISOString(),
      courierId: 1,
      externalDispatch: 'closed',
      itemCount: 4,
    },
    {
      id: '2837',
      customer: 'Lara Souza',
      items: '2 itens',
      total: 68.9,
      channel: 'iFood',
      status: 'Reembolso solicitado',
      previousStatus: 'Concluído',
      time: '11:52',
      receivedAt: new Date(Date.now() - 56 * 60_000).toISOString(),
      courierId: null,
      externalDispatch: 'closed',
      itemCount: 2,
    },
  ]);
  readonly tvOrders = signal<RestaurantTvOrder[]>([]);
  readonly orderEvents = signal<OrderTimelineEvent[]>([]);
  readonly externalDeliveryOffers = signal<ExternalDeliveryOffer[]>([]);
  readonly externalCouriers = signal<ExternalCourierProfile[]>([
    {
      id: 'AV-1042',
      name: 'Rafael Santos',
      online: true,
      approximateDistanceKm: 0.8,
      area: 'Vila Madalena',
    },
    {
      id: 'AV-2087',
      name: 'Camila Rocha',
      online: true,
      approximateDistanceKm: 1.4,
      area: 'Pinheiros',
    },
  ]);
  readonly storeCouriers = signal<StoreCourierAccount[]>([
    {
      id: 1,
      name: 'João Ribeiro',
      phone: '(11) 98765-2201',
      active: true,
      online: true,
      kind: 'Loja',
      ordersToday: 12,
      cpf: '000.000.000-00',
      birthDate: '1990-04-12',
      email: 'joao@example.test',
      photoUrl: '/assets/images/courier-avatar-example.svg',
      storeName: 'Lanchonete Três Irmãs',
      storeAddress: 'Rua Cosme de Farias, 418 · Cosme de Farias, Salvador - BA',
      payModel: 'Fixo por entrega',
      payValue: 8,
      pixKey: 'joao@example.test',
      pixHolder: 'João Ribeiro',
      shiftStartedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
      atStoreSince: undefined,
    },
    {
      id: 2,
      name: 'Luan Ferreira',
      phone: '(11) 99142-8076',
      active: true,
      online: true,
      kind: 'Loja',
      ordersToday: 9,
      cpf: '000.000.000-00',
      birthDate: '1994-09-02',
      email: 'luan@example.test',
      photoUrl: '/assets/images/courier-avatar-example.svg',
      storeName: 'Cozinha do Alto',
      storeAddress: 'Rua Jaguarari, 112 · Cosme de Farias, Salvador - BA',
      payModel: 'Fixo por entrega',
      payValue: 8,
      pixKey: '11991428076',
      pixHolder: 'Luan Ferreira',
      shiftStartedAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
      atStoreSince: new Date(Date.now() - 20 * 60_000).toISOString(),
    },
    {
      id: 3,
      name: 'Denise Rocha',
      phone: '(11) 96320-1148',
      active: false,
      online: false,
      kind: 'Loja',
      ordersToday: 6,
      cpf: '000.000.000-00',
      birthDate: '1992-01-19',
      email: 'denise@example.test',
      photoUrl: '/assets/images/courier-avatar-example.svg',
      storeName: 'Casa do Dendê',
      storeAddress: 'Avenida Dom João VI, 421 · Brotas, Salvador - BA',
      payModel: '% por pedido',
      payValue: 10,
      pixKey: 'denise@example.test',
      pixHolder: 'Denise Rocha',
    },
  ]);
  readonly storeDriverJobs = signal<StoreDriverJob[]>([]);
  readonly courierQueue = signal<number[]>([1, 2, 3]);
  readonly maxItemsPerCourier = signal(8);
  readonly prepSlaMinutes = signal(25);
  readonly warningBeforeSlaMinutes = signal(5);
  readonly menuItems = signal<RestaurantMenuItem[]>([
    createItem(
      1,
      'Feijoada da casa',
      'Pratos',
      39.9,
      'Feijoada completa com arroz, couve, farofa e laranja.',
      18,
    ),
    createItem(
      2,
      'Parmegiana de frango',
      'Pratos',
      42.9,
      'Frango empanado, molho da casa, queijo e acompanhamento.',
      14,
    ),
    createItem(
      3,
      'Smash burger artesanal',
      'Lanches',
      32.9,
      'Pão brioche, carne smash, queijo e molho especial.',
      12,
    ),
    createItem(
      4,
      'Bowl da horta',
      'Pratos',
      29.9,
      'Folhas frescas, grãos, legumes e molho cítrico.',
      9,
    ),
    createItem(5, 'Suco natural 500 ml', 'Bebidas', 12, 'Suco natural preparado na hora.', 23),
    createItem(
      6,
      'Pudim de leite',
      'Sobremesas',
      11.9,
      'Pudim artesanal com calda de caramelo.',
      0,
    ),
    createItem(7, 'Água mineral', 'Bebidas', 5, 'Garrafa 500 ml.', 16),
    {
      ...createItem(8, 'Pizza família', 'Pizzas', 58, 'Pizza de 8 pedaços com massa artesanal.', 7),
      imageUrl: '/assets/images/prattio-images/light/og-image.png',
      modifierGroups: [
        {
          id: 'flavors',
          name: 'Escolha até 2 sabores',
          required: true,
          minSelect: 1,
          maxSelect: 2,
          options: [
            { id: 'calabresa', name: 'Calabresa', priceDelta: 0 },
            { id: 'marguerita', name: 'Marguerita', priceDelta: 0 },
            { id: 'frango-catupiry', name: 'Frango com catupiry', priceDelta: 4 },
            { id: 'quatro-queijos', name: 'Quatro queijos', priceDelta: 6 },
          ],
        },
        {
          id: 'extras',
          name: 'Bebidas e acompanhamentos',
          required: false,
          minSelect: 0,
          maxSelect: 3,
          options: [
            { id: 'coca-2l', name: 'Coca-Cola 2 L', priceDelta: 14 },
            { id: 'guarana-2l', name: 'Guaraná 2 L', priceDelta: 12 },
            { id: 'fries', name: 'Batata rústica', priceDelta: 18 },
          ],
        },
      ],
    },
  ]);
  private nextHouseOrderId = 9001;
  private readonly tvChannel: BroadcastChannel | null;
  private broadcastReady = false;

  constructor() {
    this.tvChannel =
      typeof window === 'undefined' || !('BroadcastChannel' in window)
        ? null
        : new BroadcastChannel('prattio-tv');
    if (this.tvChannel) {
      this.tvChannel.onmessage = ({ data }) => {
        if (data?.type === 'orders' && Array.isArray(data.orders)) {
          this.tvOrders.set(data.orders as RestaurantTvOrder[]);
        } else if (data?.type === 'colors' && data.colors) {
          this.tvStatusColors.set(data.colors as Record<TvStatusColor, string>);
        }
      };
    }
    this.seedDemoOperations();
    effect(() => {
      const projection = this.orders().map((order): RestaurantTvOrder => {
        const job = this.storeDriverJobs().find((entry) => entry.orderId === order.id);
        const courierId = job?.courierId ?? order.courierId;
        const storeCourier =
          courierId !== null && courierId > 0
            ? this.storeCouriers().find((entry) => entry.id === courierId)
            : undefined;
        const partner =
          courierId === -1
            ? this.externalDeliveryOffers().find((offer) => offer.orderId === order.id)
            : undefined;
        return {
          id: order.id,
          customer: order.customer,
          items: order.items,
          itemCount: order.itemCount,
          lines: order.lines?.map(({ name, quantity }) => ({ name, quantity })) ?? [],
          total: order.total,
          channel: order.channel,
          status: order.status,
          fulfillment: order.fulfillment,
          receivedAt: order.receivedAt,
          scheduledAt: order.scheduledAt,
          courierId,
          courierName: storeCourier?.name ?? partner?.courierName,
          courierKind: job?.courierId === -1 ? 'Parceiro' : storeCourier?.kind,
          routeId: job?.routeId,
          courierStatus: job?.status,
          assignedAt: job?.assignedAt,
          arrivedAt: job?.arrivedAt,
          departedAt: job?.departedAt,
          completedAt: job?.completedAt,
          events: this.orderEvents()
            .filter((event) => event.orderId === order.id)
            .map(({ type, occurredAt }) => ({ type, occurredAt })),
        };
      });
      this.tvOrders.set(projection);
      if (this.broadcastReady) this.tvChannel?.postMessage({ type: 'orders', orders: projection });
      this.broadcastReady = true;
    });
  }

  private seedDemoOperations(): void {
    const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
    const timeLabel = (minutes: number) =>
      new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(Date.now() - minutes * 60_000),
      );

    this.storeCouriers.update((couriers) =>
      couriers.map((courier) =>
        courier.id === 3
          ? {
              ...courier,
              active: true,
              online: true,
              shiftStartedAt: ago(60),
              atStoreSince: undefined,
            }
          : courier,
      ),
    );
    this.courierQueue.set([1, 2, 3]);

    const extraOrders: RestaurantOrderRecord[] = [
      {
        id: '2836',
        customer: 'Marina Lopes',
        phone: '(11) 98811-2030',
        address: 'Rua Harmonia, 214 · Vila Madalena',
        fulfillment: 'delivery',
        paymentMethod: 'Pix',
        items: '2 itens',
        lines: [],
        subtotal: 73.8,
        deliveryFee: 6,
        total: 79.8,
        deliveryCode: '3814',
        channel: 'Loja própria',
        status: 'Concluído',
        time: timeLabel(85),
        receivedAt: ago(85),
        courierId: 1,
        externalDispatch: 'closed',
        itemCount: 2,
      },
      {
        id: '2942',
        customer: 'Pedro Lima',
        phone: '(11) 99202-4411',
        address: 'Rua Aspicuelta, 322 · Vila Madalena',
        fulfillment: 'delivery',
        paymentMethod: 'Pix',
        items: '2 itens',
        lines: [],
        subtotal: 68.5,
        deliveryFee: 6,
        total: 74.5,
        deliveryCode: '6207',
        channel: 'Loja própria',
        status: 'Em entrega',
        time: timeLabel(22),
        receivedAt: ago(22),
        courierId: 3,
        externalDispatch: 'closed',
        itemCount: 2,
      },
      {
        id: '2924',
        customer: 'Bianca Freitas',
        phone: '(11) 99771-0088',
        address: 'Rua Harmonia, 214 · Vila Madalena',
        fulfillment: 'delivery',
        paymentMethod: 'Dinheiro',
        changeFor: 100,
        items: '2 itens',
        lines: [],
        subtotal: 58.8,
        deliveryFee: 7,
        total: 65.8,
        deliveryCode: '4832',
        channel: 'Loja própria',
        status: 'Pronto',
        time: timeLabel(8),
        receivedAt: ago(31),
        courierId: null,
        externalDispatch: 'available',
        itemCount: 2,
      },
      {
        id: '2925',
        customer: 'Carla Dias',
        phone: '(11) 99915-3202',
        address: 'Rua Aspicuelta, 450 · Vila Madalena',
        fulfillment: 'delivery',
        paymentMethod: 'Pix',
        items: '3 itens',
        lines: [],
        subtotal: 74,
        deliveryFee: 8,
        total: 82,
        deliveryCode: '8062',
        channel: 'Loja própria',
        status: 'Pronto',
        time: timeLabel(5),
        receivedAt: ago(28),
        courierId: null,
        externalDispatch: 'available',
        itemCount: 3,
      },
      {
        id: '2951',
        customer: 'Renata Alves',
        phone: '(11) 99991-7712',
        address: 'Rua Girassol, 418 · Vila Madalena',
        fulfillment: 'delivery',
        paymentMethod: 'Pix',
        items: '1 item',
        lines: [],
        subtotal: 58.9,
        deliveryFee: 7,
        total: 65.9,
        deliveryCode: '7482',
        channel: 'Loja própria',
        status: 'Em preparo',
        time: timeLabel(50),
        receivedAt: ago(50),
        courierId: null,
        externalDispatch: 'closed',
        itemCount: 1,
      },
    ];
    const existingIds = new Set(this.orders().map((order) => order.id));
    this.orders.update((orders) => [
      ...extraOrders.filter((order) => !existingIds.has(order.id)),
      ...orders.map((order) =>
        order.id === '2840'
          ? { ...order, courierId: 2, status: 'Entregador a caminho' as const }
          : order,
      ),
    ]);

    const createHouseOrder = (
      id: string,
      customer: string,
      phone: string,
      address: string,
      items: string,
      total: number,
      status: HouseOrderStatus,
      courierId: number | null,
      ageMinutes: number,
    ): HouseOrderRequest => ({
      id,
      customer,
      phone,
      address,
      fulfillment: 'delivery',
      paymentMethod: 'Pix',
      changeFor: null,
      scheduledAt: null,
      notes: '',
      lines: [],
      items,
      subtotal: total,
      deliveryFee: 0,
      total,
      channel: 'Loja própria',
      status,
      time: timeLabel(ageMinutes),
      courierId,
      externalDispatch: id === '2924' ? 'available' : 'closed',
      deliveryCode: this.orders().find((order) => order.id === id)?.deliveryCode,
    });
    this.houseOrders.set([
      createHouseOrder(
        '2838',
        'Paulo Mendes',
        '(11) 98888-1100',
        'Rua Harmonia, 214',
        '4 itens',
        186.7,
        'Saiu para entrega',
        1,
        39,
      ),
      createHouseOrder(
        '2840',
        'Bruno Costa',
        '(11) 99999-2233',
        'Rua Harmonia, 214',
        '3 itens',
        132.5,
        'Entregador a caminho',
        2,
        12,
      ),
      createHouseOrder(
        '2942',
        'Pedro Lima',
        '(11) 99202-4411',
        'Rua Aspicuelta, 322',
        '2 itens',
        74.5,
        'Em entrega',
        3,
        22,
      ),
      createHouseOrder(
        '2924',
        'Bianca Freitas',
        '(11) 99771-0088',
        'Rua Harmonia, 214',
        '2 itens',
        65.8,
        'Pronto',
        null,
        31,
      ),
      createHouseOrder(
        '2925',
        'Carla Dias',
        '(11) 99915-3202',
        'Rua Aspicuelta, 450 · Vila Madalena',
        '3 itens',
        82,
        'Pronto',
        null,
        28,
      ),
      createHouseOrder(
        '2951',
        'Renata Alves',
        '(11) 99991-7712',
        'Rua Girassol, 418 · Vila Madalena',
        '1 item',
        65.9,
        'Em preparo',
        null,
        50,
      ),
    ]);

    this.storeDriverJobs.set([
      {
        orderId: '2838',
        courierId: 1,
        routeId: 'ROTA-JOAO-01',
        itemCount: 4,
        customer: 'Paulo Mendes',
        phone: '(11) 98888-1100',
        address: 'Rua Harmonia, 214 · Vila Madalena',
        destinationLatitude: -23.5532,
        destinationLongitude: -46.6911,
        items: '4 itens',
        paymentMethod: 'Pix',
        total: 186.7,
        status: 'Em entrega',
        deliveryCode: '3814',
        assignedAt: ago(37),
        arrivedAt: ago(31),
        departedAt: ago(24),
      },
      {
        orderId: '2840',
        courierId: 2,
        routeId: 'ROTA-LUAN-02',
        itemCount: 3,
        customer: 'Bruno Costa',
        phone: '(11) 99999-2233',
        address: 'Rua Harmonia, 214 · Vila Madalena',
        destinationLatitude: -23.5532,
        destinationLongitude: -46.6911,
        items: '3 itens',
        paymentMethod: 'Pix',
        total: 132.5,
        status: 'A caminho da loja',
        deliveryCode: '5190',
        assignedAt: ago(10),
      },
      {
        orderId: '2942',
        courierId: 3,
        routeId: 'ROTA-DENISE-03',
        itemCount: 2,
        customer: 'Pedro Lima',
        phone: '(11) 99202-4411',
        address: 'Rua Aspicuelta, 322 · Vila Madalena',
        destinationLatitude: -23.5551,
        destinationLongitude: -46.6889,
        items: '2 itens',
        paymentMethod: 'Pix',
        total: 74.5,
        status: 'Em entrega',
        deliveryCode: '6207',
        assignedAt: ago(20),
        arrivedAt: ago(16),
        departedAt: ago(12),
      },
      {
        orderId: '2836',
        courierId: 1,
        routeId: 'ROTA-JOAO-ANTERIOR',
        itemCount: 2,
        customer: 'Marina Lopes',
        phone: '(11) 98811-2030',
        address: 'Rua Harmonia, 214 · Vila Madalena',
        destinationLatitude: -23.5532,
        destinationLongitude: -46.6911,
        items: '2 itens',
        paymentMethod: 'Pix',
        total: 79.8,
        status: 'Entregue',
        deliveryCode: '3814',
        assignedAt: ago(100),
        arrivedAt: ago(94),
        departedAt: ago(90),
        completedAt: ago(85),
      },
    ]);
    this.externalDeliveryOffers.set([
      {
        orderId: '2924',
        storeName: 'Lanchonete Três Irmãs',
        storeAddress: 'Rua Cosme de Farias, 418 · Cosme de Farias, Salvador - BA',
        storeLatitude: -12.9847,
        storeLongitude: -38.4909,
        customer: 'Bianca Freitas',
        address: 'Rua da Alegria, 48 · Cosme de Farias, Salvador - BA',
        area: 'Cosme de Farias',
        destinationLatitude: -12.9832,
        destinationLongitude: -38.486,
        items: '2 itens · 1 sacola',
        deliveryFee: 7,
        status: 'available',
        targetCourierId: 'AV-1042',
        deliveryCode: '4832',
      },
      {
        orderId: '2925',
        storeName: 'Cozinha do Alto',
        storeAddress: 'Rua Jaguarari, 112 · Cosme de Farias, Salvador - BA',
        storeLatitude: -12.9813,
        storeLongitude: -38.4886,
        customer: 'Carla Dias',
        address: 'Rua Teixeira Barros, 190 · Brotas, Salvador - BA',
        area: 'Brotas',
        destinationLatitude: -12.9918,
        destinationLongitude: -38.4948,
        items: '2 itens · 1 sacola',
        deliveryFee: 8,
        status: 'available',
        targetCourierId: null,
        deliveryCode: '8062',
      },
      {
        orderId: '2926',
        storeName: 'Casa do Dendê',
        storeAddress: 'Rua Thomaz Gonzaga, 67 · Cosme de Farias, Salvador - BA',
        storeLatitude: -12.9862,
        storeLongitude: -38.4872,
        customer: 'Joana Ribeiro',
        address: 'Avenida Dom João VI, 421 · Brotas, Salvador - BA',
        area: 'Brotas',
        destinationLatitude: -12.9865,
        destinationLongitude: -38.4964,
        items: '1 item · 1 sacola',
        deliveryFee: 9,
        status: 'available',
        targetCourierId: null,
        deliveryCode: '7314',
      },
    ]);
    this.orderEvents.set([
      {
        id: 'demo-2838-ready',
        orderId: '2838',
        type: 'Pronto',
        actor: 'Demonstração',
        occurredAt: ago(39),
      },
      {
        id: 'demo-2838-assigned',
        orderId: '2838',
        type: 'Motoboy atribuído',
        actor: 'Demonstração',
        occurredAt: ago(37),
      },
      {
        id: 'demo-2838-out',
        orderId: '2838',
        type: 'Saiu para entrega',
        actor: 'Demonstração',
        occurredAt: ago(24),
      },
      {
        id: 'demo-2840-prep',
        orderId: '2840',
        type: 'Em preparo',
        actor: 'Demonstração',
        occurredAt: ago(9),
      },
      {
        id: 'demo-2840-assigned',
        orderId: '2840',
        type: 'Motoboy atribuído',
        actor: 'Demonstração',
        occurredAt: ago(10),
      },
      {
        id: 'demo-2924-ready',
        orderId: '2924',
        type: 'Pronto',
        actor: 'Demonstração',
        occurredAt: ago(8),
      },
      {
        id: 'demo-2951-prep',
        orderId: '2951',
        type: 'Em preparo',
        actor: 'Demonstração',
        occurredAt: ago(40),
      },
    ]);
  }

  setTvStatusColor(status: TvStatusColor, color: string): void {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    this.tvStatusColors.update((colors) => ({ ...colors, [status]: color }));
    this.tvChannel?.postMessage({ type: 'colors', colors: this.tvStatusColors() });
  }

  updateHouseOrderStatus(orderId: string, status: HouseOrderStatus): void {
    this.houseOrders.update((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    );
    this.orders.update((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    );
    this.recordOrderEvent(orderId, status, 'App Prattio');
  }

  assignStoreCourier(orderId: string, courierId: number | null): void {
    this.houseOrders.update((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, courierId } : order)),
    );
    this.orders.update((orders) =>
      orders.map((order) => (order.id === orderId ? { ...order, courierId } : order)),
    );
    this.recordOrderEvent(orderId, 'Motoboy atribuído', 'Operação da loja');
  }

  setStoreCourierOnline(courierId: number, online: boolean): void {
    const now = new Date().toISOString();
    this.storeCouriers.update((couriers) =>
      couriers.map((courier) => {
        if (courier.id !== courierId || !courier.active) return courier;
        return online
          ? { ...courier, online: true, shiftStartedAt: courier.shiftStartedAt ?? now }
          : { ...courier, online: false, shiftStartedAt: undefined, atStoreSince: undefined };
      }),
    );
    this.courierQueue.update((queue) => {
      const next = online
        ? [...new Set([...queue, courierId])]
        : queue.filter((id) => id !== courierId);
      return next.sort((leftId, rightId) => {
        const left = this.storeCouriers().find((courier) => courier.id === leftId);
        const right = this.storeCouriers().find((courier) => courier.id === rightId);
        return (
          (left?.shiftStartedAt ?? '').localeCompare(right?.shiftStartedAt ?? '') ||
          leftId - rightId
        );
      });
    });
  }

  setStoreCourierAtStore(courierId: number, atStore: boolean): void {
    const courier = this.storeCouriers().find((entry) => entry.id === courierId);
    if (!courier?.active || !courier.online) return;
    const now = new Date().toISOString();
    const arrivingJobs = atStore
      ? this.storeDriverJobs().filter(
          (job) => job.courierId === courierId && job.status === 'A caminho da loja',
        )
      : [];
    this.storeCouriers.update((couriers) =>
      couriers.map((entry) =>
        entry.id === courierId
          ? {
              ...entry,
              atStoreSince: atStore ? (entry.atStoreSince ?? now) : undefined,
            }
          : entry,
      ),
    );
    if (!atStore) return;
    this.storeDriverJobs.update((jobs) =>
      jobs.map((job) =>
        job.courierId === courierId && job.status === 'A caminho da loja'
          ? { ...job, status: 'Chegou à loja', arrivedAt: now }
          : job,
      ),
    );
    arrivingJobs.forEach((job) =>
      this.recordOrderEvent(job.orderId, 'Motoboy chegou à loja', courier.name),
    );
  }

  setExternalCourierOnline(courierId: string, online: boolean): void {
    this.externalCouriers.update((couriers) =>
      couriers.map((courier) => (courier.id === courierId ? { ...courier, online } : courier)),
    );
  }

  recordOrderEvent(orderId: string, type: string, actor: string, note?: string): void {
    this.orderEvents.update((events) => [
      {
        id: `${orderId}-${Date.now()}-${events.length}`,
        orderId,
        type,
        occurredAt: new Date().toISOString(),
        actor,
        note,
      },
      ...events,
    ]);
  }

  assignNextStoreCourier(orderId: string, itemCount: number): StoreCourierAccount | null {
    const queue = [...this.courierQueue()].sort((leftId, rightId) => {
      const left = this.storeCouriers().find((courier) => courier.id === leftId);
      const right = this.storeCouriers().find((courier) => courier.id === rightId);
      return (
        (left?.shiftStartedAt ?? '').localeCompare(right?.shiftStartedAt ?? '') || leftId - rightId
      );
    });
    if (queue.length === 0) return null;
    const jobs = this.storeDriverJobs();
    const maxItems = this.maxItemsPerCourier();

    for (const courierId of queue) {
      const courier = this.storeCouriers().find((entry) => entry.id === courierId);
      if (!courier?.active || !courier.online || !courier.atStoreSince) continue;
      const load = jobs
        .filter((job) => job.courierId === courierId && job.status !== 'Entregue')
        .reduce((total, job) => total + job.itemCount, 0);
      if (load + itemCount > maxItems) continue;

      this.assignStoreCourier(orderId, courierId);
      return courier;
    }
    return null;
  }

  addStoreCourier(
    courier: Omit<StoreCourierAccount, 'id' | 'ordersToday' | 'kind'>,
  ): StoreCourierAccount {
    const id = Math.max(0, ...this.storeCouriers().map((entry) => entry.id)) + 1;
    const created: StoreCourierAccount = { ...courier, id, kind: 'Loja', ordersToday: 0 };
    this.storeCouriers.update((couriers) => [...couriers, created]);
    this.courierQueue.update((queue) => [...queue, id]);
    return created;
  }

  removeStoreCourier(courierId: number): void {
    this.storeCouriers.update((couriers) => couriers.filter((courier) => courier.id !== courierId));
    this.courierQueue.update((queue) => queue.filter((id) => id !== courierId));
  }

  saveStore(name: string, address: string): void {
    this.storeName.set(name);
    this.storeAddress.set(address);
    saveValue('prattio.storeName', name);
    saveValue('prattio.storeAddress', address);
  }

  setStoreOpen(open: boolean): void {
    this.storeOpen.set(open);
    saveValue('prattio.storeOpen', String(open));
  }

  private generateDeliveryCode(): string {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return String(bytes[0] % 10_000).padStart(4, '0');
  }

  placeHouseOrder(
    order: Omit<
      HouseOrderRequest,
      'id' | 'channel' | 'status' | 'time' | 'courierId' | 'externalDispatch' | 'deliveryCode'
    >,
  ): string {
    const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(),
    );
    const id = String(this.nextHouseOrderId++);
    const deliveryCode = order.fulfillment === 'delivery' ? this.generateDeliveryCode() : undefined;
    this.houseOrders.update((orders) => [
      {
        ...order,
        id,
        deliveryCode,
        channel: 'Loja própria',
        status: 'Novo',
        time,
        courierId: null,
        externalDispatch: 'closed',
      },
      ...orders,
    ]);
    this.orders.update((orders) => [
      {
        ...order,
        id,
        deliveryCode,
        channel: 'Loja própria',
        status: 'Novo',
        time,
        receivedAt: new Date().toISOString(),
        courierId: null,
        externalDispatch: 'closed',
        itemCount: order.lines.reduce((total, line) => total + line.quantity, 0),
      },
      ...orders,
    ]);
    this.recordOrderEvent(id, 'Pedido recebido', order.customer);
    if (deliveryCode) this.recordOrderEvent(id, 'Código de entrega gerado', 'Prattio');
    return id;
  }

  openExternalOffer(offer: Omit<ExternalDeliveryOffer, 'status'>): void {
    this.externalDeliveryOffers.update((offers) => {
      if (offers.some((entry) => entry.orderId === offer.orderId)) {
        return offers.map((entry) =>
          entry.orderId === offer.orderId ? { ...entry, ...offer, status: 'available' } : entry,
        );
      }
      return [{ ...offer, status: 'available' }, ...offers];
    });
    this.orders.update((orders) =>
      orders.map((order) =>
        order.id === offer.orderId ? { ...order, externalDispatch: 'available' } : order,
      ),
    );
    this.recordOrderEvent(offer.orderId, 'Oferta externa publicada', 'Operação da loja');
  }

  updateExternalOffer(
    orderId: string,
    status: ExternalDeliveryOffer['status'],
    courierName?: string,
  ): void {
    this.externalDeliveryOffers.update((offers) =>
      offers.map((offer) =>
        offer.orderId === orderId ? { ...offer, status, courierName } : offer,
      ),
    );
    this.orders.update((orders) =>
      orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              externalDispatch:
                status === 'available'
                  ? 'available'
                  : status === 'accepted'
                    ? 'accepted'
                    : status === 'declined'
                      ? 'closed'
                      : order.externalDispatch,
            }
          : order,
      ),
    );
    this.recordOrderEvent(orderId, `Entrega externa: ${status}`, courierName ?? 'Operação da loja');
  }

  upsertStoreDriverJob(job: StoreDriverJob): void {
    const previous = this.storeDriverJobs().find((entry) => entry.orderId === job.orderId);
    const courier =
      job.courierId > 0
        ? this.storeCouriers().find((entry) => entry.id === job.courierId)
        : undefined;
    const next = {
      ...job,
      assignedAt: job.assignedAt ?? previous?.assignedAt ?? new Date().toISOString(),
      arrivedAt:
        job.arrivedAt ??
        previous?.arrivedAt ??
        (job.status === 'Chegou à loja' ? courier?.atStoreSince : undefined),
    };
    this.storeDriverJobs.update((jobs) => [
      next,
      ...jobs.filter((entry) => entry.orderId !== next.orderId),
    ]);
    this.recordOrderEvent(
      next.orderId,
      `Tarefa de entrega: ${next.status}`,
      next.courierId === -1 ? 'Entregador parceiro' : next.customer,
    );
  }

  updateStoreDriverJob(
    orderId: string,
    status: StoreDriverJob['status'],
    proofImage?: string,
  ): void {
    const now = new Date().toISOString();
    this.storeDriverJobs.update((jobs) =>
      jobs.map((job) =>
        job.orderId === orderId
          ? {
              ...job,
              status,
              arrivedAt: status === 'Chegou à loja' ? (job.arrivedAt ?? now) : job.arrivedAt,
              departedAt: status === 'Em entrega' ? (job.departedAt ?? now) : job.departedAt,
              completedAt: status === 'Entregue' ? (job.completedAt ?? now) : job.completedAt,
              proofImage: proofImage ?? job.proofImage,
            }
          : job,
      ),
    );
    this.recordOrderEvent(orderId, `Courier: ${status}`, 'App Prattio Entregas');
  }

  removeStoreDriverJob(orderId: string, actor = 'Operação da loja'): void {
    const job = this.storeDriverJobs().find((entry) => entry.orderId === orderId);
    if (!job) return;
    this.storeDriverJobs.update((jobs) => jobs.filter((entry) => entry.orderId !== orderId));
    const courierName =
      job.courierId === -1
        ? 'Entregador parceiro'
        : (this.storeCouriers().find((courier) => courier.id === job.courierId)?.name ?? 'Motoboy');
    this.recordOrderEvent(
      orderId,
      'Pedido removido da rota',
      actor,
      `${courierName} · ${job.routeId}`,
    );
  }
}
