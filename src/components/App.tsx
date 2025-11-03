import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { StationList } from './StationList.js';
import { SearchInput } from './SearchInput.js';
import { NowPlaying } from './NowPlaying.js';
import { Help } from './Help.js';
import { Footer } from './Footer.js';
import { MpvPlayer } from '../services/player.service.js';
import { StreamService } from '../services/stream.service.js';
import { fetchStations } from '../services/api.service.js';
import { favoritesService } from '../services/favorites.service.js';
import type { Station } from '../types/station.js';

interface AppProps {
  player: MpvPlayer;
}

export const App: React.FC<AppProps> = ({ player }) => {
  const { exit } = useApp();
  const [stations, setStations] = useState<Station[]>([]);
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [paused, setPaused] = useState(false);
  const [volume, setVolume] = useState(100);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamService] = useState(() => new StreamService(player));

  // Load stations on mount
  useEffect(() => {
    const loadStations = async () => {
      try {
        setLoading(true);
        const data = await fetchStations();
        setStations(data);
        setFavorites(favoritesService.getFavorites());
        setVolume(favoritesService.getVolume());

        // Set player volume
        await player.setVolume(favoritesService.getVolume());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stations');
      } finally {
        setLoading(false);
      }
    };

    loadStations();

    // Set up player event listeners
    const handlePauseChanged = (isPaused: boolean) => {
      setPaused(isPaused);
    };

    const handleVolumeChanged = (newVolume: number) => {
      setVolume(newVolume);
      favoritesService.setVolume(newVolume);
    };

    player.on('pause-changed', handlePauseChanged);
    player.on('volume-changed', handleVolumeChanged);

    return () => {
      player.off('pause-changed', handlePauseChanged);
      player.off('volume-changed', handleVolumeChanged);
    };
  }, [player]);

  // Filter and sort stations
  useEffect(() => {
    let filtered = stations;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (station) =>
          station.title.toLowerCase().includes(query) ||
          station.description?.toLowerCase().includes(query)
      );
    }

    // Sort: favorites first, then by listeners
    filtered.sort((a, b) => {
      const aIsFav = favorites.includes(a.slug);
      const bIsFav = favorites.includes(b.slug);

      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;

      return b.total_listeners - a.total_listeners;
    });

    setFilteredStations(filtered);

    // Adjust selected index if needed
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [stations, searchQuery, favorites, selectedIndex]);

  // Keyboard input handler
  useInput((input, key) => {
    // Quit
    if (input === 'q' || (key.ctrl && input === 'c')) {
      handleQuit();
      return;
    }

    // Navigation
    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => Math.min(filteredStations.length - 1, prev + 1));
      return;
    }

    // Play selected station
    if (key.return) {
      handlePlayStation(filteredStations[selectedIndex]);
      return;
    }

    // Pause/Resume
    if (input === ' ') {
      handleTogglePause();
      return;
    }

    // Favorite
    if (input === 'f') {
      handleToggleFavorite();
      return;
    }

    // Volume
    if (input === '+' || input === '=') {
      handleVolumeUp();
      return;
    }

    if (input === '-' || input === '_') {
      handleVolumeDown();
      return;
    }

    // Mute
    if (input === 'm') {
      handleMute();
      return;
    }

    // Toggle help
    if (input === '?' || input === 'h') {
      setShowHelp((prev) => !prev);
      return;
    }

    // Search
    if (key.escape) {
      setSearchQuery('');
      setSearchActive(false);
      setShowHelp(false);
      return;
    }

    if (key.backspace || key.delete) {
      if (searchQuery.length > 0) {
        setSearchQuery((prev) => prev.slice(0, -1));
      }
      return;
    }

    // Alphanumeric input for search
    if (input && /^[a-zA-Z0-9 ]$/.test(input)) {
      setSearchActive(true);
      setSearchQuery((prev) => prev + input);
    }
  });

  const handlePlayStation = async (station: Station) => {
    if (!station) return;

    try {
      // If same station, just toggle pause
      if (currentStation?.slug === station.slug) {
        await handleTogglePause();
        return;
      }

      await streamService.playStation(station);
      setCurrentStation(station);
      setPaused(false);
      favoritesService.setLastPlayed(station.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play station');
    }
  };

  const handleTogglePause = async () => {
    if (!currentStation) return;

    try {
      await player.togglePause();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle pause');
    }
  };

  const handleToggleFavorite = () => {
    const station = filteredStations[selectedIndex];
    if (!station) return;

    const isFav = favoritesService.toggleFavorite(station.slug);
    setFavorites(favoritesService.getFavorites());
  };

  const handleVolumeUp = async () => {
    try {
      await player.adjustVolume(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust volume');
    }
  };

  const handleVolumeDown = async () => {
    try {
      await player.adjustVolume(-5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adjust volume');
    }
  };

  const handleMute = async () => {
    try {
      if (volume > 0) {
        await player.setVolume(0);
      } else {
        await player.setVolume(favoritesService.getVolume());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mute');
    }
  };

  const handleQuit = async () => {
    try {
      await player.quit();
    } catch {
      // Ignore errors during quit
    }
    exit();
  };

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="cyan">Loading stations...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">
          🎵 RadioCrestin.ro CLI Player
        </Text>
      </Box>

      <NowPlaying station={currentStation} paused={paused} volume={volume} />

      <SearchInput query={searchQuery} active={searchActive} />

      <Box flexGrow={1} flexDirection="column">
        {showHelp ? (
          <Help />
        ) : (
          <StationList
            stations={filteredStations}
            selectedIndex={selectedIndex}
            currentStationSlug={currentStation?.slug || null}
            favorites={favorites}
            hasStation={currentStation !== null}
            searchActive={searchActive || searchQuery.length > 0}
          />
        )}
      </Box>

      <Footer />
    </Box>
  );
};
