import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Layout } from './layout';
import { ThemeService } from '../../../core/theme/theme.service';

describe('Layout', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Layout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the courier icon only for the courier brand and follows the theme', () => {
    const theme = TestBed.inject(ThemeService);
    theme.isCourierBrand.set(true);
    fixture.detectChanges();
    const icon: HTMLImageElement = fixture.nativeElement.querySelector('img[alt="Prattio Motoboy"]');
    expect(icon.getAttribute('src')).toContain('/claro/icon.svg');
    theme.isDark.set(true);
    fixture.detectChanges();
    expect(icon.getAttribute('src')).toContain('/escuro/icon.svg');
    theme.isCourierBrand.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-brand-logo')).toBeTruthy();
  });
});
