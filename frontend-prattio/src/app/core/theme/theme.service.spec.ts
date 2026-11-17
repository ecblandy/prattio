import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeService } from './theme.service';

@Component({ template: '' })
class TestPage {}

describe('ThemeService courier branding', () => {
  let theme: ThemeService;
  let router: Router;
  let svg: HTMLLinkElement;
  let ico: HTMLLinkElement;

  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    svg = document.createElement('link');
    svg.id = 'app-favicon-svg';
    ico = document.createElement('link');
    ico.id = 'app-favicon-ico';
    document.head.append(svg, ico);
    TestBed.configureTestingModule({
      providers: [provideRouter([
        { path: 'courier', component: TestPage },
        { path: 'auth/motoboy-signup', component: TestPage },
        { path: 'restaurant', component: TestPage },
      ])],
    });
    theme = TestBed.inject(ThemeService);
    router = TestBed.inject(Router);
    theme.init();
  });

  afterEach(() => {
    svg.remove();
    ico.remove();
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
    vi.unstubAllGlobals();
  });

  it('switches courier favicons with the route and theme, then restores the main brand', async () => {
    await router.navigateByUrl('/courier?courierId=1');
    expect(theme.isCourierBrand()).toBe(true);
    expect(svg.getAttribute('href')).toBe('/assets/images/prattio-motoboy-imagens-v2/claro/favicon.svg');
    expect(ico.getAttribute('href')).toBe('/assets/images/prattio-motoboy-imagens-v2/claro/favicon.ico');
    theme.toggle();
    expect(svg.getAttribute('href')).toBe('/assets/images/prattio-motoboy-imagens-v2/escuro/favicon-dark.svg');
    await router.navigateByUrl('/auth/motoboy-signup');
    expect(theme.isCourierBrand()).toBe(true);
    await router.navigateByUrl('/restaurant');
    expect(theme.isCourierBrand()).toBe(false);
    expect(svg.getAttribute('href')).toBe('/assets/images/prattio-images/dark/favicon-dark.svg');
    expect(ico.getAttribute('href')).toBe('/assets/images/prattio-images/dark/favicon-dark.ico');
  });
});
