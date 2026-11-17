import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

const mock = vi.hoisted(() => {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const socket = {
    active: false,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => handlers.set(event, handler)),
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
  };
  return { handlers, socket, io: vi.fn(() => socket) };
});

vi.mock('socket.io-client', () => ({ io: mock.io }));

import { AnnouncementLiveService } from './announcement-live.service';

describe('AnnouncementLiveService', () => {
  beforeEach(() => {
    mock.handlers.clear();
    mock.socket.active = false;
    vi.clearAllMocks();
    TestBed.configureTestingModule({});
  });

  it('reuses an active connection and retries one that has stopped', () => {
    const service = TestBed.inject(AnnouncementLiveService);
    service.connect('test-token');
    expect(mock.io).toHaveBeenCalledOnce();
    expect(mock.io).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api/socket.io',
      transports: ['websocket'],
      auth: { token: 'test-token' },
    }));
    mock.socket.active = true;
    service.connect('test-token');
    expect(mock.io).toHaveBeenCalledOnce();
    expect(mock.socket.connect).toHaveBeenCalledTimes(1);
    mock.socket.active = false;
    service.connect('test-token');
    expect(mock.socket.connect).toHaveBeenCalledTimes(2);
    service.disconnect();
    expect(mock.socket.removeAllListeners).toHaveBeenCalledOnce();
    expect(mock.socket.disconnect).toHaveBeenCalledOnce();
  });

  it('reports connection status and accepts only valid read event shapes', () => {
    const service = TestBed.inject(AnnouncementLiveService);
    const reads: string[] = [];
    service.readEvents.subscribe((id) => reads.push(id));
    service.connect('test-token');
    mock.handlers.get('connect')?.();
    expect(service.status()).toBe('connected');
    mock.handlers.get('announcement:read')?.({ id: 'notice-id' });
    mock.handlers.get('announcement:read')?.({ id: 123 });
    expect(reads).toEqual(['notice-id']);
    mock.handlers.get('connect_error')?.();
    expect(service.status()).toBe('disconnected');
  });
});
