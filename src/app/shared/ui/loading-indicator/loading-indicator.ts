import { Component, DestroyRef, inject } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { NgIcon } from '@ng-icons/core';

import { LoadingService } from '../../../core/loading/loading.service';

@Component({
  selector: 'app-loading-indicator',
  imports: [NgIcon],
  templateUrl: './loading-indicator.html',
  styleUrl: './loading-indicator.css',
})
export class LoadingIndicator {
  protected readonly loading = inject(LoadingService);

  constructor() {
    const router = inject(Router);
    const destroyRef = inject(DestroyRef);

    router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationStart ||
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError,
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((event) => {
        if (event instanceof NavigationStart) this.loading.begin();
        else this.loading.finish();
      });
  }
}
