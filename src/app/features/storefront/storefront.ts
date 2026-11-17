import { Component, computed, inject, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

import { ThemeService } from '../../core/theme/theme.service';
import { ToastService } from '../../core/notifications/toast.service';
import { ThemeToggle } from '../../shared/ui/theme-toggle/theme-toggle';
import {
  FulfillmentMethod,
  HouseOrderLine,
  MenuModifierGroup,
  MenuModifierOption,
  PaymentMethod,
  RestaurantDataService,
  RestaurantMenuItem,
  RestaurantOrderRecord,
} from '../restaurant/restaurant-data.service';

interface CartLine extends HouseOrderLine {
  key: string;
}

@Component({
  selector: 'app-storefront',
  imports: [NgIcon, ThemeToggle],
  templateUrl: './storefront.html',
  styleUrl: './storefront.css',
})
export class Storefront {
  protected readonly restaurant = inject(RestaurantDataService);
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private nextLineId = 0;

  readonly cart = signal<CartLine[]>([]);
  readonly customerName = signal('');
  readonly customerPhone = signal('');
  readonly customerAddress = signal('');
  readonly fulfillment = signal<FulfillmentMethod>('delivery');
  readonly paymentMethod = signal<PaymentMethod>('Pix');
  readonly changeFor = signal('');
  readonly scheduledAt = signal('');
  readonly notes = signal('');
  readonly checkoutOpen = signal(false);
  readonly orderConfirmation = signal<RestaurantOrderRecord | null>(null);
  readonly selectedProduct = signal<RestaurantMenuItem | null>(null);
  readonly optionSelection = signal<Record<string, string[]>>({});
  readonly productQuantity = signal(1);
  readonly productNote = signal('');
  readonly selectionError = signal('');
  readonly minimumOrder = 20;
  readonly deliveryFee = 6.9;

  readonly categories = computed(() => [
    'Todos',
    ...new Set(this.availableProducts().map((item) => item.category)),
  ]);
  readonly selectedCategory = signal('Todos');
  readonly availableProducts = computed(() =>
    this.restaurant
      .menuItems()
      .filter((item) => item.channels['Loja própria'].available)
      .filter(
        (item) => this.selectedCategory() === 'Todos' || item.category === this.selectedCategory(),
      ),
  );
  readonly cartCount = computed(() =>
    this.cart().reduce((count, line) => count + line.quantity, 0),
  );
  readonly subtotal = computed(() =>
    this.cart().reduce((total, line) => total + line.lineTotal, 0),
  );
  readonly total = computed(
    () => this.subtotal() + (this.fulfillment() === 'delivery' ? this.deliveryFee : 0),
  );
  readonly meetsMinimum = computed(
    () => this.fulfillment() === 'pickup' || this.subtotal() >= this.minimumOrder,
  );
  readonly configuredUnitPrice = computed(() => {
    const item = this.selectedProduct();
    if (!item) return 0;
    const selectedIds = Object.values(this.optionSelection()).flat();
    const extras = item.modifierGroups
      .flatMap((group) => group.options)
      .filter((option) => selectedIds.includes(option.id))
      .reduce((sum, option) => sum + option.priceDelta, 0);
    return item.channels['Loja própria'].price + extras;
  });

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  quantityForItem(itemId: number): number {
    return this.cart()
      .filter((line) => line.menuItemId === itemId)
      .reduce((total, line) => total + line.quantity, 0);
  }

  openProduct(item: RestaurantMenuItem): void {
    if (!this.restaurant.storeOpen()) {
      this.toast.show('A loja está pausada e não pode receber pedidos agora.', 'warning');
      return;
    }
    this.selectedProduct.set(item);
    this.optionSelection.set({});
    this.productQuantity.set(1);
    this.productNote.set('');
    this.selectionError.set('');
  }

  closeProduct(): void {
    this.selectedProduct.set(null);
    this.selectionError.set('');
  }

  changeProductQuantity(delta: number): void {
    this.productQuantity.update((quantity) => Math.max(1, quantity + delta));
  }

  optionSelected(groupId: string, optionId: string): boolean {
    return this.optionSelection()[groupId]?.includes(optionId) ?? false;
  }

  toggleOption(group: MenuModifierGroup, option: MenuModifierOption): void {
    this.optionSelection.update((selection) => {
      const current = selection[group.id] ?? [];
      if (current.includes(option.id)) {
        return { ...selection, [group.id]: current.filter((id) => id !== option.id) };
      }
      if (current.length >= group.maxSelect) {
        this.selectionError.set(
          `Escolha no máximo ${group.maxSelect} opção(ões) em “${group.name}”.`,
        );
        return selection;
      }
      this.selectionError.set('');
      return { ...selection, [group.id]: [...current, option.id] };
    });
  }

  addConfiguredProduct(): void {
    const item = this.selectedProduct();
    if (!item) return;

    const missingGroup = item.modifierGroups.find((group) => {
      const count = this.optionSelection()[group.id]?.length ?? 0;
      return count < group.minSelect;
    });
    if (missingGroup) {
      this.selectionError.set(
        `Selecione pelo menos ${missingGroup.minSelect} opção(ões) em “${missingGroup.name}”.`,
      );
      return;
    }

    const selectedIds = Object.values(this.optionSelection()).flat();
    const selectedOptions = item.modifierGroups
      .flatMap((group) => group.options)
      .filter((option) => selectedIds.includes(option.id));
    const unitPrice = this.configuredUnitPrice();
    const lineTotal = unitPrice * this.productQuantity();
    const optionNames = [...selectedOptions.map((option) => option.name)];
    if (this.productNote().trim()) optionNames.push(`Obs.: ${this.productNote().trim()}`);
    const key = `${item.id}-${selectedIds.slice().sort().join('.')}-${this.productNote().trim()}-${++this.nextLineId}`;

    this.cart.update((lines) => [
      ...lines,
      {
        key,
        menuItemId: item.id,
        name: item.name,
        quantity: this.productQuantity(),
        unitPrice,
        options: optionNames,
        lineTotal,
      },
    ]);
    this.closeProduct();
    this.toast.show(`${item.name} adicionado à sacola.`, 'success');
  }

  setQuantity(key: string, quantity: number): void {
    this.cart.update((lines) =>
      quantity <= 0
        ? lines.filter((line) => line.key !== key)
        : lines.map((line) =>
            line.key === key ? { ...line, quantity, lineTotal: line.unitPrice * quantity } : line,
          ),
    );
  }

  submitOrder(event: Event): void {
    event.preventDefault();
    if (!this.restaurant.storeOpen()) {
      this.toast.show('A loja está pausada e não pode receber pedidos agora.', 'warning');
      return;
    }
    if (!this.customerName().trim() || this.customerPhone().replace(/\D/g, '').length < 10) {
      this.toast.show('Informe seu nome e um telefone válido.', 'warning');
      return;
    }
    if (this.fulfillment() === 'delivery' && this.customerAddress().trim().length < 8) {
      this.toast.show('Informe o endereço completo para entrega.', 'warning');
      return;
    }
    if (!this.meetsMinimum()) {
      this.toast.show(
        `O pedido mínimo para entrega é ${this.formatCurrency(this.minimumOrder)}.`,
        'warning',
      );
      return;
    }
    if (this.cart().length === 0) {
      this.toast.show('Adicione ao menos um item ao carrinho.', 'warning');
      return;
    }

    const lines: HouseOrderLine[] = this.cart().map(({ key: _key, ...line }) => line);
    const items = lines
      .map(
        (line) =>
          `${line.quantity}x ${line.name}${line.options.length ? ` (${line.options.join(', ')})` : ''}`,
      )
      .join('; ');
    const orderId = this.restaurant.placeHouseOrder({
      customer: this.customerName().trim(),
      phone: this.customerPhone().trim(),
      address:
        this.fulfillment() === 'delivery' ? this.customerAddress().trim() : 'Retirada no balcão',
      fulfillment: this.fulfillment(),
      paymentMethod: this.paymentMethod(),
      changeFor: this.paymentMethod() === 'Dinheiro' ? Number(this.changeFor()) || null : null,
      scheduledAt: this.scheduledAt() || null,
      notes: this.notes().trim(),
      lines,
      items,
      subtotal: this.subtotal(),
      deliveryFee: this.fulfillment() === 'delivery' ? this.deliveryFee : 0,
      total: this.total(),
    });
    this.orderConfirmation.set(
      this.restaurant.orders().find((order) => order.id === orderId) ?? null,
    );
    this.cart.set([]);
    this.checkoutOpen.set(false);
    this.toast.show('Pedido enviado para a loja. A confirmação aparecerá em seguida.', 'success');
  }

  closeOrderConfirmation(): void {
    this.orderConfirmation.set(null);
  }
}
