import { Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

import { ToastKind, ToastService } from '../../../core/notifications/toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [NgIcon],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.css',
})
export class ToastContainer {
  protected readonly toastService = inject(ToastService);

  protected iconFor(kind: ToastKind): string {
    switch (kind) {
      case 'success':
        return 'lucideCircleCheck';
      case 'warning':
      case 'error':
        return 'lucideTriangleAlert';
      default:
        return 'lucideInfo';
    }
  }

  protected dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
