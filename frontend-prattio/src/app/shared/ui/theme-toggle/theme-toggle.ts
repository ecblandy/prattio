import { Component, inject } from '@angular/core';
import { ThemeService } from '../../../core/theme/theme.service';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-theme-toggle',
  imports: [NgIcon],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.css',
  host: { class: 'inline-flex' },
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
}
