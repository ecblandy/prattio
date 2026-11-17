import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'info' | 'warning' | 'error';

export interface AppToast {
  id: number;
  message: string;
  kind: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly toasts = signal<readonly AppToast[]>([]);

  show(message: string, kind: ToastKind = 'success', duration = 4500): void {
    const id = ++this.nextId;
    this.toasts.update((current) => [...current, { id, message, kind }]);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), duration),
    );
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }
}
