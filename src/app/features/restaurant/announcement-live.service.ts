import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class AnnouncementLiveService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private readonly reads = new Subject<string>();
  private readonly connections = new Subject<void>();
  readonly readEvents = this.reads.asObservable();
  readonly connected = this.connections.asObservable();
  readonly status = signal<'idle' | 'connecting' | 'connected' | 'disconnected'>('idle');

  connect(token: string): void {
    if (this.socket && this.token === token) {
      if (!this.socket.active) {
        this.status.set('connecting');
        this.socket.connect();
      }
      return;
    }
    this.disconnect();
    this.token = token;
    this.status.set('connecting');
    const socket = io({
      path: `${API_BASE_URL}/socket.io`,
      transports: ['websocket'],
      auth: { token },
      autoConnect: false,
    });
    this.socket = socket;
    socket.on('connect', () => {
      this.status.set('connected');
      this.connections.next();
    });
    socket.on('announcement:read', (payload: unknown) => {
      if (typeof payload === 'object' && payload !== null && 'id' in payload &&
          typeof payload.id === 'string') {
        this.reads.next(payload.id);
      }
    });
    socket.on('connect_error', () => this.status.set('disconnected'));
    socket.on('disconnect', () => this.status.set('disconnected'));
    socket.connect();
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.token = null;
    this.status.set('idle');
  }
}
