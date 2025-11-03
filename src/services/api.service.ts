import axios from 'axios';
import type { Station } from '../types/station.js';

const API_BASE_URL = 'https://api.radiocrestin.ro/api/v1';
const CACHE_DURATION = 10000; // 10 seconds

interface CacheEntry {
  data: Station[];
  timestamp: number;
}

let cache: CacheEntry | null = null;

function roundTimestampToTenSeconds(): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.floor(now / 10) * 10;
}

export async function fetchStations(): Promise<Station[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (cache && now - cache.timestamp < CACHE_DURATION) {
    return cache.data;
  }

  const timestamp = roundTimestampToTenSeconds();
  const url = `${API_BASE_URL}/stations?timestamp=${timestamp}`;

  try {
    const response = await axios.get(url);

    // The API returns a GraphQL response with structure: { data: { stations: [...] } }
    const stations = response.data?.data?.stations || [];

    if (!Array.isArray(stations)) {
      throw new Error('Invalid API response format');
    }

    // Update cache
    cache = {
      data: stations,
      timestamp: now,
    };

    return stations;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to fetch stations: ${error.message}`);
    }
    throw error;
  }
}

export function clearStationsCache(): void {
  cache = null;
}
