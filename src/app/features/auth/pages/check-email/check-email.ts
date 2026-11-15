import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-check-email',
  imports: [NgIcon, RouterLink],
  templateUrl: './check-email.html',
  styleUrl: './check-email.css',
})
export class CheckEmail {}
