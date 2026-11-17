import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private delayTimer: ReturnType<typeof setTimeout> | null = null;

  readonly visible = signal(false);

  begin(delay = 180): void {
    this.clearTimer();
    this.delayTimer = setTimeout(() => this.visible.set(true), delay);
  }

  finish(): void {
    this.clearTimer();
    this.visible.set(false);
  }

  private clearTimer(): void {
    if (this.delayTimer) clearTimeout(this.delayTimer);
    this.delayTimer = null;
  }
}
