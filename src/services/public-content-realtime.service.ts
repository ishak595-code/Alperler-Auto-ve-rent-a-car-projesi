import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { SUPABASE_PROJECT_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase.config';

type RealtimeState = 'IDLE' | 'CONNECTING' | 'LIVE' | 'RETRYING' | 'OFFLINE';
type ChangeHandler = (table: string) => void;

interface RealtimeMessage {
  topic?: string;
  event?: string;
  ref?: string | null;
  join_ref?: string | null;
  payload?: {
    status?: string;
    response?: unknown;
    data?: { table?: string; schema?: string; type?: string };
    table?: string;
    schema?: string;
    type?: string;
    [key: string]: unknown;
  };
}

const PUBLIC_CONTENT_TABLES = [
  'homepage_sections',
  'homepage_placements',
  'vehicles',
  'tours',
  'campaigns',
  'catalog_media',
  'media_assets',
  'site_config',
  'blog_posts',
  'faqs',
  'branches',
] as const;

@Injectable({ providedIn: 'root' })
export class PublicContentRealtimeService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly handlers = new Map<string, Set<ChangeHandler>>();
  private socket?: WebSocket;
  private heartbeatTimer?: number;
  private reconnectTimer?: number;
  private reconnectAttempt = 0;
  private sequence = 0;
  private intentionalClose = false;

  private readonly _state = signal<RealtimeState>('IDLE');
  readonly state = this._state.asReadonly();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
        this.shutdown();
      });
    }
  }

  watch(tables: readonly string[], handler: ChangeHandler): () => void {
    const normalized = [...new Set(tables.map((table) => table.trim()).filter(Boolean))];
    for (const table of normalized) {
      const set = this.handlers.get(table) ?? new Set<ChangeHandler>();
      set.add(handler);
      this.handlers.set(table, set);
    }

    this.ensureConnected();

    return () => {
      for (const table of normalized) {
        const set = this.handlers.get(table);
        if (!set) continue;
        set.delete(handler);
        if (set.size === 0) this.handlers.delete(table);
      }
      if (this.handlers.size === 0) this.shutdown();
    };
  }

  private readonly handleOnline = () => {
    if (this.handlers.size === 0) return;
    this.reconnectAttempt = 0;
    this.connect();
  };

  private readonly handleOffline = () => {
    this._state.set('OFFLINE');
    this.closeSocket(false);
  };

  private ensureConnected(): void {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this._state.set('OFFLINE');
      return;
    }
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    this.connect();
  }

  private connect(): void {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined' || this.handlers.size === 0) return;
    this.clearReconnectTimer();
    this.closeSocket(false);
    this.intentionalClose = false;
    this._state.set(this.reconnectAttempt > 0 ? 'RETRYING' : 'CONNECTING');

    const wsBase = SUPABASE_PROJECT_URL.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
    const socketUrl = `${wsBase}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_PUBLISHABLE_KEY)}&vsn=1.0.0`;
    const socket = new WebSocket(socketUrl);
    this.socket = socket;

    socket.onopen = () => this.join(socket);
    socket.onmessage = (event) => this.handleMessage(event.data);
    socket.onerror = () => {
      if (this.socket === socket && socket.readyState !== WebSocket.CLOSED) socket.close();
    };
    socket.onclose = () => {
      if (this.socket === socket) this.socket = undefined;
      this.stopHeartbeat();
      if (!this.intentionalClose && this.handlers.size > 0) this.scheduleReconnect();
    };
  }

  private join(socket: WebSocket): void {
    const ref = this.nextRef();
    socket.send(JSON.stringify({
      topic: 'realtime:public-content',
      event: 'phx_join',
      payload: {
        config: {
          broadcast: { ack: false, self: false },
          presence: { enabled: false },
          postgres_changes: PUBLIC_CONTENT_TABLES.map((table) => ({ event: '*', schema: 'public', table })),
          private: false,
        },
      },
      ref,
      join_ref: ref,
    }));
    this.startHeartbeat(socket);
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') return;
    let message: RealtimeMessage;
    try {
      message = JSON.parse(raw) as RealtimeMessage;
    } catch {
      return;
    }

    if (message.event === 'phx_reply' && message.payload?.status === 'ok') {
      this.reconnectAttempt = 0;
      this._state.set('LIVE');
      return;
    }

    if (message.event === 'phx_reply' && message.payload?.status === 'error') {
      this.forceReconnect();
      return;
    }

    if (message.event === 'phx_error' || message.event === 'phx_close') {
      this.forceReconnect();
      return;
    }

    if (message.event !== 'postgres_changes') return;
    const table = String(message.payload?.data?.table || message.payload?.table || '').trim();
    if (!table) return;
    this.emit(table);
  }

  private emit(table: string): void {
    const tableHandlers = this.handlers.get(table);
    if (tableHandlers) {
      for (const handler of [...tableHandlers]) handler(table);
    }
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      for (const handler of [...wildcardHandlers]) handler(table);
    }
  }

  private startHeartbeat(socket: WebSocket): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.socket !== socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: this.nextRef(), join_ref: null }));
    }, 25_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== undefined && typeof window !== 'undefined') {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private forceReconnect(): void {
    if (!this.socket) {
      this.scheduleReconnect();
      return;
    }
    this.intentionalClose = false;
    this.socket.close();
  }

  private scheduleReconnect(): void {
    if (typeof window === 'undefined' || this.reconnectTimer !== undefined || this.handlers.size === 0) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this._state.set('OFFLINE');
      return;
    }
    const delays = [1_000, 2_000, 5_000, 10_000, 20_000, 30_000];
    const delay = delays[Math.min(this.reconnectAttempt, delays.length - 1)];
    this.reconnectAttempt += 1;
    this._state.set('RETRYING');
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== undefined && typeof window !== 'undefined') {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private closeSocket(intentional: boolean): void {
    this.intentionalClose = intentional;
    const socket = this.socket;
    this.socket = undefined;
    this.stopHeartbeat();
    if (socket && socket.readyState !== WebSocket.CLOSED) socket.close();
  }

  private shutdown(): void {
    this.clearReconnectTimer();
    this.reconnectAttempt = 0;
    this.closeSocket(true);
    this._state.set('IDLE');
  }

  private nextRef(): string {
    this.sequence += 1;
    return String(this.sequence);
  }
}
