import { inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'theme';
  private readonly router = inject(Router, { optional: true });

  readonly isDark = signal(false);
  readonly isCourierBrand = signal(false);

  /** Chamado uma vez na inicialização da aplicação. */
  init(): void {
    const saved = localStorage.getItem(this.storageKey) as ThemeMode | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : systemPrefersDark;

    this.apply(dark);
    this.router?.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const path = event.urlAfterRedirects.split(/[?#]/, 1)[0];
        this.isCourierBrand.set(path === '/courier' || path === '/auth/motoboy-signup');
        this.updateFavicon(this.isDark());
      }
    });
  }

  toggle(): void {
    const next = !this.isDark();
    this.apply(next);
    localStorage.setItem(this.storageKey, next ? 'dark' : 'light');
  }

  private apply(dark: boolean): void {
    this.isDark.set(dark);
    document.documentElement.classList.toggle('dark', dark);

    this.updateFavicon(dark);
  }

  private updateFavicon(dark: boolean): void {
    const root = this.isCourierBrand()
      ? '/assets/images/prattio-motoboy-imagens-v2'
      : '/assets/images/prattio-images';
    const directory = this.isCourierBrand() ? (dark ? 'escuro' : 'claro') : (dark ? 'dark' : 'light');
    const svgName = dark ? 'favicon-dark.svg' : 'favicon.svg';
    const icoName = dark ? 'favicon-dark.ico' : 'favicon.ico';

    document
      .getElementById('app-favicon-svg')
      ?.setAttribute('href', `${root}/${directory}/${svgName}`);
    document
      .getElementById('app-favicon-ico')
      ?.setAttribute('href', `${root}/${directory}/${icoName}`);
  }
}
