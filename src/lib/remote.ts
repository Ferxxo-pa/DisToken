// ── Phone Remote Control ────────────────────────────────────
// Uses BroadcastChannel API for same-origin tab communication.
// TV/kiosk tab acts as receiver, phone browser tab acts as sender.
// Shared via a simple room code in the URL.

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

const CHANNEL_PREFIX = 'distoken-remote-';

export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function createRemoteChannel(roomCode: string): BroadcastChannel {
  return new BroadcastChannel(CHANNEL_PREFIX + roomCode);
}

/** Host (TV/kiosk) side — listens for commands, sends state updates */
export class RemoteHost {
  private channel: BroadcastChannel;
  private onCommand: (cmd: RemoteCommand) => void;
  public roomCode: string;

  constructor(roomCode: string, onCommand: (cmd: RemoteCommand) => void) {
    this.roomCode = roomCode;
    this.onCommand = onCommand;
    this.channel = createRemoteChannel(roomCode);
    this.channel.onmessage = (e) => {
      const cmd = e.data as RemoteCommand;
      if (cmd.type === 'ping') {
        // Respond with current state — handled by caller
        this.onCommand(cmd);
      } else {
        this.onCommand(cmd);
      }
    };
  }

  sendState(state: RemoteState) {
    this.channel.postMessage({ type: 'pong', state } as RemoteCommand);
  }

  destroy() {
    this.channel.close();
  }
}

/** Client (phone) side — sends commands, receives state */
export class RemoteClient {
  private channel: BroadcastChannel;
  private onState: (state: RemoteState) => void;

  constructor(roomCode: string, onState: (state: RemoteState) => void) {
    this.onState = onState;
    this.channel = createRemoteChannel(roomCode);
    this.channel.onmessage = (e) => {
      const msg = e.data as RemoteCommand;
      if (msg.type === 'pong') {
        this.onState(msg.state);
      }
    };
    // Request initial state
    this.send({ type: 'ping' });
  }

  send(cmd: RemoteCommand) {
    this.channel.postMessage(cmd);
  }

  destroy() {
    this.channel.close();
  }
}
