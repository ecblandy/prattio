import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingIndicator } from './shared/ui/loading-indicator/loading-indicator';
import { ToastContainer } from './shared/ui/toast-container/toast-container';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingIndicator, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
