import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

import { ThemeToggle } from '../../shared/ui/theme-toggle/theme-toggle';

@Component({
  selector: 'app-not-found',
  imports: [NgIcon, RouterLink, ThemeToggle],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound {}
