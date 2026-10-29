import { parseServerMessage, type ClientMessage, type ServerMessage } from "./protocol";

export type ConnectionStatus = "connecting" | "open" | "reconnecting";

export interface SavedSession {
  code: string;
  playerId: string;
  token: string;
}

const SESSION_KEY = "bpp.session";

/** `ws(s)://host` → `ws(s)://host/v1/games/putt-party/ws`. */
export function socketUrl(realtimeBase: string): string {
  return `${realtimeBase.replace(/\/+$/, "")}/v1/games/putt-party/ws`;
}

export function loadSession(storage: Pick<Storage, "getItem"> = localStorage): SavedSession | null {
  try {
    const raw = JSON.parse(storage.getItem(SESSION_KEY) ?? "null") as Partial<SavedSession> | null;
    return raw && typeof raw.code === "string" && typeof raw.playerId === "string" && typeof raw.token === "string"
      ? { code: raw.code, playerId: raw.playerId, token: raw.token }
      : null;
  } catch {
    return null;
  }
}

function saveSession(session: SavedSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage can be unavailable (private mode); resume then only works within this page.
  }
}

/** Delay before reconnect attempt `n` (0-based): 0.5 s doubling to a 5 s cap. */
export const backoffMs = (attempt: number) => Math.min(5000, 500 * 2 ** attempt);

export const PING_INTERVAL_MS = 2000;

interface Handlers {
  onMessage(msg: ServerMessage): void;
  onStatus(status: ConnectionStatus): void;
  /** Round-trip time of a ping, in ms. */
  onPing(rttMs: number): void;
}

/**
 * Owns one WebSocket to the Putt Party server. Reconnects with backoff while mounted and,
 * when attached to a room, resumes the seat with the saved token (server keeps it for 5 minutes).
 * Pings every 2 s while open to measure round-trip time.
 */
export class PuttClient {
  private socket: WebSocket | null = null;
  private session: SavedSession | null;
  private attempt = 0;
  private retryTimer = 0;
  private pingTimer = 0;
  private disposed = false;
  private readonly url: string;
  private readonly handlers: Handlers;

  constructor(url: string, handlers: Handlers) {
    this.url = url;
    this.handlers = handlers;
    this.session = loadSession();
    this.open();
  }

  get attached(): boolean {
    return this.session !== null;
  }

  send(msg: ClientMessage): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(msg));
    return true;
  }

  /** Sends `leave` and forgets the seat so a reload no longer resumes it. */
  leave(): void {
    this.send({ type: "leave" });
    this.forget();
  }

  forget(): void {
    this.session = null;
    saveSession(null);
  }

  dispose(): void {
    this.disposed = true;
    clearTimeout(this.retryTimer);
    clearInterval(this.pingTimer);
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      socket.close(1000);
    }
  }

  private open(): void {
    if (this.disposed) return;
    this.handlers.onStatus(this.attempt === 0 ? "connecting" : "reconnecting");
    let socket: WebSocket;
    try {
      socket = new WebSocket(this.url);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      this.attempt = 0;
      this.handlers.onStatus("open");
      if (this.session) this.send({ type: "resume", ...this.session });
      const ping = () => this.send({ type: "ping", t: performance.now() });
      ping();
      this.pingTimer = window.setInterval(ping, PING_INTERVAL_MS);
    };
    socket.onmessage = (event) => {
      const msg = parseServerMessage(event.data);
      if (!msg) return;
      if (msg.type === "pong") {
        this.handlers.onPing(performance.now() - msg.t);
        return;
      }
      if (msg.type === "welcome") {
        this.session = { code: msg.code, playerId: msg.playerId, token: msg.token };
        saveSession(this.session);
      } else if (msg.type === "error" && msg.code === "resumeFailed") this.forget();
      this.handlers.onMessage(msg);
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      clearInterval(this.pingTimer);
      this.scheduleRetry();
    };
  }

  private scheduleRetry(): void {
    if (this.disposed) return;
    this.handlers.onStatus("reconnecting");
    this.retryTimer = window.setTimeout(() => this.open(), backoffMs(this.attempt++));
  }
}
