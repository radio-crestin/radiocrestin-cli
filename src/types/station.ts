export interface StationStream {
  id?: number;
  type: string;
  stream_url: string;
  order: number;
}

export interface NowPlaying {
  song: {
    id: number;
    name: string;
    thumbnail_url: string | null;
  } | null;
  artist: {
    id: number;
    name: string;
    thumbnail_url: string | null;
  } | null;
}

export interface Uptime {
  is_up: boolean;
  latency_ms: number | null;
  timestamp: string;
}

export interface Station {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  stream_url: string;
  proxy_stream_url: string;
  hls_stream_url: string;
  station_streams: StationStream[];
  thumbnail_url: string | null;
  website: string | null;
  total_listeners: number;
  radio_crestin_listeners: number;
  now_playing: NowPlaying | null;
  uptime: Uptime;
}

export interface StationsResponse {
  data: Station[];
}
