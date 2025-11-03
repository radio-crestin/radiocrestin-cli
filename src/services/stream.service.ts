import type { Station, StationStream } from '../types/station.js';
import type { MpvPlayer } from './player.service.js';

export class StreamService {
  private player: MpvPlayer;
  private currentStation: Station | null = null;
  private currentStreamIndex = 0;
  private retryAttempts = 0;
  private maxRetries = 3;

  constructor(player: MpvPlayer) {
    this.player = player;
  }

  async playStation(station: Station): Promise<void> {
    this.currentStation = station;
    this.currentStreamIndex = 0;
    this.retryAttempts = 0;

    const streams = this.getSortedStreams(station);

    if (streams.length === 0) {
      throw new Error(`No streams available for station: ${station.title}`);
    }

    await this.tryNextStream(streams);
  }

  private getSortedStreams(station: Station): StationStream[] {
    // Get station_streams and sort by order
    const streams = [...station.station_streams].sort((a, b) => a.order - b.order);

    // If no streams in station_streams, create fallback streams
    if (streams.length === 0) {
      const fallbackStreams: StationStream[] = [];

      if (station.stream_url) {
        fallbackStreams.push({
          id: 1,
          type: 'direct',
          stream_url: station.stream_url,
          order: 1,
        });
      }

      if (station.hls_stream_url) {
        fallbackStreams.push({
          id: 2,
          type: 'hls',
          stream_url: station.hls_stream_url,
          order: 2,
        });
      }

      if (station.proxy_stream_url) {
        fallbackStreams.push({
          id: 3,
          type: 'proxy',
          stream_url: station.proxy_stream_url,
          order: 3,
        });
      }

      return fallbackStreams;
    }

    return streams;
  }

  private async tryNextStream(streams: StationStream[]): Promise<void> {
    if (this.currentStreamIndex >= streams.length) {
      // All streams failed, retry from the beginning
      if (this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        this.currentStreamIndex = 0;
        await this.delay(1000 * this.retryAttempts); // Exponential backoff
        return this.tryNextStream(streams);
      } else {
        throw new Error('All streams failed after multiple retries');
      }
    }

    const stream = streams[this.currentStreamIndex];

    try {
      await this.player.loadStream(stream.stream_url);
      // Stream loaded successfully
      this.retryAttempts = 0;
    } catch (error) {
      // Stream failed, try next one
      this.currentStreamIndex++;
      return this.tryNextStream(streams);
    }
  }

  getCurrentStation(): Station | null {
    return this.currentStation;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async stop(): Promise<void> {
    await this.player.stop();
    this.currentStation = null;
    this.currentStreamIndex = 0;
    this.retryAttempts = 0;
  }
}
