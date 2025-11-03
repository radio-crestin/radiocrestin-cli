import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { EventEmitter } from 'events';

export interface PlayerState {
  playing: boolean;
  paused: boolean;
  volume: number;
  currentUrl: string | null;
  duration: number | null;
  position: number | null;
}

export class MpvPlayer extends EventEmitter {
  private mpvProcess: ChildProcess | null = null;
  private socket: net.Socket | null = null;
  private socketPath: string;
  private mpvPath: string;
  private commandId = 0;
  private pendingCommands: Map<number, { resolve: (value: any) => void; reject: (error: any) => void }> = new Map();
  private buffer = '';

  private state: PlayerState = {
    playing: false,
    paused: false,
    volume: 100,
    currentUrl: null,
    duration: null,
    position: null,
  };

  constructor(mpvPath: string) {
    super();
    this.mpvPath = mpvPath;
    this.socketPath = path.join(os.tmpdir(), `mpv-socket-${process.pid}`);
  }

  async start(): Promise<void> {
    // Start MPV process with IPC server
    this.mpvProcess = spawn(this.mpvPath, [
      '--no-video',
      '--no-terminal',
      '--idle=yes',
      `--input-ipc-server=${this.socketPath}`,
      '--input-media-keys=yes',
      '--volume=100',
    ]);

    this.mpvProcess.on('error', (error) => {
      console.error('MPV process error:', error);
      this.emit('error', error);
    });

    this.mpvProcess.on('exit', (code) => {
      console.error('MPV process exited with code:', code);
      this.emit('exit', code);
    });

    // Capture stderr for debugging
    if (this.mpvProcess.stderr) {
      this.mpvProcess.stderr.on('data', (data) => {
        console.error('MPV stderr:', data.toString());
      });
    }

    // Wait for socket to be created
    await this.waitForSocket();

    // Connect to IPC socket
    await this.connectSocket();

    // Set up property observers
    await this.setupObservers();
  }

  private async waitForSocket(maxAttempts = 50): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await fs.access(this.socketPath);
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    throw new Error('MPV socket creation timeout');
  }

  private async connectSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = net.connect(this.socketPath);

      this.socket.on('connect', () => {
        resolve();
      });

      this.socket.on('error', (error) => {
        reject(error);
      });

      this.socket.on('data', (data) => {
        this.handleSocketData(data);
      });

      this.socket.on('close', () => {
        this.emit('disconnected');
      });
    });
  }

  private handleSocketData(data: Buffer): void {
    this.buffer += data.toString();

    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);
        this.handleMessage(message);
      } catch (error) {
        // Ignore parse errors
      }
    }
  }

  private handleMessage(message: any): void {
    // Handle command responses
    if (message.request_id !== undefined) {
      const pending = this.pendingCommands.get(message.request_id);
      if (pending) {
        if (message.error === 'success') {
          pending.resolve(message.data);
        } else {
          pending.reject(new Error(message.error));
        }
        this.pendingCommands.delete(message.request_id);
      }
    }

    // Handle property change events
    if (message.event === 'property-change') {
      this.handlePropertyChange(message);
    }

    // Handle other events
    if (message.event) {
      this.emit('mpv-event', message);
    }
  }

  private handlePropertyChange(message: any): void {
    const { name, data } = message;

    switch (name) {
      case 'pause':
        this.state.paused = data;
        this.emit('pause-changed', data);
        break;
      case 'volume':
        this.state.volume = data;
        this.emit('volume-changed', data);
        break;
      case 'duration':
        this.state.duration = data;
        break;
      case 'time-pos':
        this.state.position = data;
        break;
    }
  }

  private async setupObservers(): Promise<void> {
    await this.observeProperty('pause');
    await this.observeProperty('volume');
    await this.observeProperty('duration');
    await this.observeProperty('time-pos');
  }

  private async sendCommand(command: string[]): Promise<any> {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    const requestId = this.commandId++;
    const request = {
      command: command,
      request_id: requestId,
    };

    return new Promise((resolve, reject) => {
      this.pendingCommands.set(requestId, { resolve, reject });

      this.socket!.write(JSON.stringify(request) + '\n');

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingCommands.has(requestId)) {
          this.pendingCommands.delete(requestId);
          reject(new Error('Command timeout'));
        }
      }, 5000);
    });
  }

  private async observeProperty(property: string): Promise<void> {
    const requestId = this.commandId++;
    const request = {
      command: ['observe_property', requestId, property],
      request_id: requestId,
    };

    this.socket!.write(JSON.stringify(request) + '\n');
  }

  async loadStream(url: string): Promise<void> {
    await this.sendCommand(['loadfile', url]);
    this.state.currentUrl = url;
    this.state.playing = true;
    this.state.paused = false;
    this.emit('stream-loaded', url);
  }

  async play(): Promise<void> {
    await this.setProperty('pause', false);
  }

  async pause(): Promise<void> {
    await this.setProperty('pause', true);
  }

  async togglePause(): Promise<void> {
    await this.sendCommand(['cycle', 'pause']);
  }

  async stop(): Promise<void> {
    await this.sendCommand(['stop']);
    this.state.playing = false;
    this.state.currentUrl = null;
  }

  async setVolume(volume: number): Promise<void> {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    await this.setProperty('volume', clampedVolume);
  }

  async adjustVolume(delta: number): Promise<void> {
    const newVolume = this.state.volume + delta;
    await this.setVolume(newVolume);
  }

  private async setProperty(property: string, value: any): Promise<void> {
    await this.sendCommand(['set_property', property, value]);
  }

  getState(): PlayerState {
    return { ...this.state };
  }

  async quit(): Promise<void> {
    try {
      await this.sendCommand(['quit']);
    } catch {
      // Ignore errors during quit
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }

    if (this.mpvProcess) {
      this.mpvProcess.kill();
      this.mpvProcess = null;
    }

    // Clean up socket file
    try {
      await fs.unlink(this.socketPath);
    } catch {
      // Ignore errors
    }
  }
}
