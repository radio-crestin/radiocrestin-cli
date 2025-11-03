import Conf from 'conf';

interface ConfigSchema {
  favorites: string[];
  lastPlayed: string | null;
  volume: number;
}

class FavoritesService {
  private config: Conf<ConfigSchema>;

  constructor() {
    this.config = new Conf<ConfigSchema>({
      projectName: 'radiocrestin-cli',
      defaults: {
        favorites: [],
        lastPlayed: null,
        volume: 75,
      },
    });
  }

  getFavorites(): string[] {
    return this.config.get('favorites');
  }

  isFavorite(stationSlug: string): boolean {
    return this.getFavorites().includes(stationSlug);
  }

  addFavorite(stationSlug: string): void {
    const favorites = this.getFavorites();
    if (!favorites.includes(stationSlug)) {
      this.config.set('favorites', [...favorites, stationSlug]);
    }
  }

  removeFavorite(stationSlug: string): void {
    const favorites = this.getFavorites();
    this.config.set(
      'favorites',
      favorites.filter((slug) => slug !== stationSlug)
    );
  }

  toggleFavorite(stationSlug: string): boolean {
    if (this.isFavorite(stationSlug)) {
      this.removeFavorite(stationSlug);
      return false;
    } else {
      this.addFavorite(stationSlug);
      return true;
    }
  }

  setLastPlayed(stationSlug: string): void {
    this.config.set('lastPlayed', stationSlug);
  }

  getLastPlayed(): string | null {
    return this.config.get('lastPlayed');
  }

  setVolume(volume: number): void {
    this.config.set('volume', Math.max(0, Math.min(100, volume)));
  }

  getVolume(): number {
    return this.config.get('volume');
  }
}

export const favoritesService = new FavoritesService();
