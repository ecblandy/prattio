import { Component, inject } from '@angular/core';
import { ThemeToggle } from '../../../shared/ui/theme-toggle/theme-toggle';
import { BrandLogo } from '../../../shared/ui/brand-logo/brand-logo';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-layout',
  imports: [ThemeToggle, BrandLogo, RouterOutlet],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  protected readonly theme = inject(ThemeService);
}
