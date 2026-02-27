// ── Phone Remote Control ────────────────────────────────────
// Uses PeerJS (WebRTC) for cross-device real-time communication.
// TV/kiosk = host (creates peer with room code as ID).
// Phone = client (connects to host peer ID).
// No backend, no accounts, free relay server.

import Peer, { DataConnection } from 'peerjs';

export type RemoteCommand =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle-play' }
  | { type: 'toggle-info' }
  | { type: 'toggle-shuffle' }
  | { type: 'toggle-fullscreen' }
  | { type: 'go-to'; index: number }
  | { type: 'set-speed'; speed: string }
  | { type: 'set-transition'; transition: string }
  | { type: 'set-bg'; mode: string }
  | { type: 'set-frame'; frame: string }
  | { type: 'toggle-dark' }
  | { type: 'set-custom-speed'; ms: number }
  | { type: 'ping' }
  | { type: 'pong'; state: RemoteState };

export interface RemoteState {
  currentIndex: number;
  total: number;
  isPlaying: boolean;
  currentName: string;
  currentCollection: string;
  currentImage: string;
  speed: string;
  walletAddress: string;
}

const PEER_PREFIX = 'distoken-';

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Host (TV/kiosk) side — listens for connections, receives commands, sends state */
export class RemoteHost {
  private peer: Peer;
  private connections: DataConnection[] = [];
  private onCommand: (cmd: RemoteCommand) => void;
  public roomCode: string;
  private _ready: Promise<void>;
  private _destroyed = false;

  constructor(roomCode: string, onCommand: (cmd: RemoteCommand) => void) {
    this.roomCode = roomCode;
    this.onCommand = onCommand;
    this.peer = new Peer(PEER_PREFIX + roomCode, {
      debug: 0,
    });

    this._ready = new Promise((resolve, reject) => {
      this.peer.on('open', () => resolve());
      this.peer.on('error', (err) => {
        console.warn('[RemoteHost] Peer error:', err.type, err.message);
        // If ID is taken, it means another host has this room code
        if (err.type === 'unavailable-id') {
          reject(new Error('Room code already in use'));
        }
      });
    });

    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        this.connections.push(conn);
        conn.on('data', (data) => {
          this.onCommand(data as RemoteCommand);
        });
        conn.on('close', () => {
          this.connections = this.connections.filter(c => c !== conn);
        });
      });
    });
  }

  get ready() {
    return this._ready;
  }

  sendState(state: RemoteState) {
    if (this._destroyed) return;
    const msg: RemoteCommand = { type: 'pong', state };
    this.connections.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
  }

  destroy() {
    this._destroyed = true;
    this.connections.forEach(c => c.close());
    this.peer.destroy();
  }
}

/** Client (phone) side — connects to host, sends commands, receives state */
export class RemoteClient {
  private peer: Peer;
  private conn: DataConnection | null = null;
  private onState: (state: RemoteState) => void;
  private onConnected: (() => void) | null = null;
  private onDisconnected: (() => void) | null = null;
  private _destroyed = false;
  private roomCode: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    roomCode: string,
    onState: (state: RemoteState) => void,
    opts?: { onConnected?: () => void; onDisconnected?: () => void }
  ) {
    this.roomCode = roomCode;
    this.onState = onState;
    this.onConnected = opts?.onConnected ?? null;
    this.onDisconnected = opts?.onDisconnected ?? null;

    // Client gets a random ID
    this.peer = new Peer(undefined as any, { debug: 0 });
    this.peer.on('open', () => {
      this.connectToHost();
    });
    this.peer.on('error', (err) => {
      console.warn('[RemoteClient] Peer error:', err.type, err.message);
      if (err.type === 'peer-unavailable') {
        // Host not found — retry
        this.scheduleReconnect();
      }
    });
  }

  private connectToHost() {
    if (this._destroyed) return;
    const conn = this.peer.connect(PEER_PREFIX + this.roomCode, { reliable: true });

    conn.on('open', () => {
      this.conn = conn;
      this.onConnected?.();
      // Request initial state
      conn.send({ type: 'ping' });
    });

    conn.on('data', (data) => {
      const msg = data as RemoteCommand;
      if (msg.type === 'pong') {
        this.onState(msg.state);
      }
    });

    conn.on('close', () => {
      this.conn = null;
      this.onDisconnected?.();
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    if (this._destroyed) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connectToHost();
    }, 3000);
  }

  send(cmd: RemoteCommand) {
    if (this.conn?.open) {
      this.conn.send(cmd);
    }
  }

  destroy() {
    this._destroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.conn?.close();
    this.peer.destroy();
  }
}
