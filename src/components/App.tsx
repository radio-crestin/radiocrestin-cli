import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp, useStdin } from 'ink';
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
  const { stdin, setRawMode } = useStdin();
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

  // Refs for accessing latest values in event handlers
  const filteredStationsRef = useRef<Station[]>([]);
  const currentStationRef = useRef<Station | null>(null);
  const streamServiceRef = useRef(streamService);

  // Update refs when values change
  useEffect(() => {
    filteredStationsRef.current = filteredStations;
  }, [filteredStations]);

  useEffect(() => {
    currentStationRef.current = currentStation;
  }, [currentStation]);

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
        setError(
          err instanceof Error ? err.message : 'Failed to load stations'
        );
      } finally {
        setLoading(false);
      }
    };

    loadStations();

    // Set up metadata refresh interval aligned to 10s cache boundaries
    let metadataInterval: NodeJS.Timeout | undefined;
    let initialTimeout: NodeJS.Timeout | undefined;

    const scheduleNextRefresh = () => {
      // Calculate time until next 10-second boundary
      const now = Date.now();
      const nextSlot = Math.ceil(now / 10000) * 10000;
      const delay = nextSlot - now;

      initialTimeout = setTimeout(() => {
        // Refresh metadata at the boundary
        (async () => {
          try {
            const data = await fetchStations();
            setStations(data);
          } catch {
            // Silently fail metadata refresh to avoid disrupting user experience
          }
        })();

        // Schedule recurring refresh every 10 seconds
        metadataInterval = setInterval(async () => {
          try {
            const data = await fetchStations();
            setStations(data);
          } catch {
            // Silently fail metadata refresh to avoid disrupting user experience
          }
        }, 10000);
      }, delay);
    };

    scheduleNextRefresh();

    // Set up player event listeners
    const handlePauseChanged = (isPaused: boolean) => {
      setPaused(isPaused);
    };

    const handleVolumeChanged = (newVolume: number) => {
      setVolume(newVolume);
      favoritesService.setVolume(newVolume);
    };

    const handleNextStation = async () => {
      const filtered = filteredStationsRef.current;
      const current = currentStationRef.current;

      if (filtered.length === 0) return;

      // Find current station in filtered list
      const currentIndex = current
        ? filtered.findIndex((s) => s.slug === current.slug)
        : -1;

      const nextIndex =
        currentIndex >= 0 ? (currentIndex + 1) % filtered.length : 0;

      // Update selected index and play the station
      setSelectedIndex(nextIndex);
      const nextStation = filtered[nextIndex];

      try {
        await streamServiceRef.current.playStation(nextStation);
        setCurrentStation(nextStation);
        setPaused(false);
        favoritesService.setLastPlayed(nextStation.slug);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to play station'
        );
      }
    };

    const handlePrevStation = async () => {
      const filtered = filteredStationsRef.current;
      const current = currentStationRef.current;

      if (filtered.length === 0) return;

      // Find current station in filtered list
      const currentIndex = current
        ? filtered.findIndex((s) => s.slug === current.slug)
        : -1;

      const prevIndex =
        currentIndex >= 0
          ? (currentIndex - 1 + filtered.length) % filtered.length
          : 0;

      // Update selected index and play the station
      setSelectedIndex(prevIndex);
      const prevStation = filtered[prevIndex];

      try {
        await streamServiceRef.current.playStation(prevStation);
        setCurrentStation(prevStation);
        setPaused(false);
        favoritesService.setLastPlayed(prevStation.slug);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to play station'
        );
      }
    };

    player.on('pause-changed', handlePauseChanged);
    player.on('volume-changed', handleVolumeChanged);
    player.on('next-station', handleNextStation);
    player.on('prev-station', handlePrevStation);

    return () => {
      if (initialTimeout) clearTimeout(initialTimeout);
      if (metadataInterval) clearInterval(metadataInterval);
      player.off('pause-changed', handlePauseChanged);
      player.off('volume-changed', handleVolumeChanged);
      player.off('next-station', handleNextStation);
      player.off('prev-station', handlePrevStation);
    };
  }, [player]);

  // Enable mouse support
  useEffect(() => {
    if (setRawMode) {
      setRawMode(true);
    }

    if (!stdin) return;

    // Enable mouse tracking
    process.stdout.write('\x1b[?1000h'); // Enable mouse button tracking
    process.stdout.write('\x1b[?1002h'); // Enable mouse motion tracking
    process.stdout.write('\x1b[?1015h'); // Enable urxvt mouse mode
    process.stdout.write('\x1b[?1006h'); // Enable SGR mouse mode

    const handleMouseData = (data: Buffer) => {
      const str = data.toString();

      // Parse SGR mouse events: ESC[<button;x;y;M or m
      // eslint-disable-next-line no-control-regex
      const sgrMatch = str.match(/\x1b\[<(\d+);(\d+);(\d+)([Mm])/);
      if (sgrMatch) {
        const button = parseInt(sgrMatch[1]);
        const action = sgrMatch[4];

        // Mouse wheel up: button 64, Mouse wheel down: button 65
        if (action === 'M') {
          if (button === 64) {
            // Scroll up
            setSelectedIndex((prev) => Math.max(0, prev - 1));
          } else if (button === 65) {
            // Scroll down
            setSelectedIndex((prev) =>
              Math.min(filteredStations.length - 1, prev + 1)
            );
          }
        }
      }
    };

    stdin.on('data', handleMouseData);

    return () => {
      // Disable mouse tracking
      process.stdout.write('\x1b[?1000l');
      process.stdout.write('\x1b[?1002l');
      process.stdout.write('\x1b[?1015l');
      process.stdout.write('\x1b[?1006l');

      stdin.off('data', handleMouseData);

      if (setRawMode) {
        setRawMode(false);
      }
    };
  }, [stdin, setRawMode, filteredStations.length]);

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

    // Sort: favorites first, then by order, then alphabetically
    filtered.sort((a, b) => {
      const aIsFav = favorites.includes(a.slug);
      const bIsFav = favorites.includes(b.slug);

      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;

      // Sort by order field
      if (a.order !== b.order) {
        return a.order - b.order;
      }

      // For equal order values, sort alphabetically by title
      return a.title.localeCompare(b.title);
    });

    setFilteredStations(filtered);

    // Adjust selected index if needed
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [stations, searchQuery, favorites, selectedIndex]);

  // Keyboard input handler
  useInput((input, key) => {
    // Ctrl+C to quit (always available)
    if (key.ctrl && input === 'c') {
      handleQuit();
      return;
    }

    // Escape (always available) - clear search/help
    if (key.escape) {
      setSearchQuery('');
      setSearchActive(false);
      setShowHelp(false);
      return;
    }

    // Arrow key navigation (always available)
    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) =>
        Math.min(filteredStations.length - 1, prev + 1)
      );
      return;
    }

    // Play selected station (always available)
    if (key.return) {
      handlePlayStation(filteredStations[selectedIndex]);
      return;
    }

    // Backspace/Delete for search (always available)
    if (key.backspace || key.delete) {
      if (searchQuery.length > 0) {
        setSearchQuery((prev) => {
          const newQuery = prev.slice(0, -1);
          if (newQuery.length === 0) {
            setSearchActive(false);
          }
          return newQuery;
        });
      }
      return;
    }

    // When search is active, disable all letter shortcuts and capture input
    if (searchActive) {
      // Alphanumeric input for search
      if (input && /^[a-zA-Z0-9 ]$/.test(input)) {
        setSearchQuery((prev) => prev + input);
      }
      return;
    }

    // Below shortcuts only work when search is NOT active

    // Quit with 'q' (only when not searching)
    if (input === 'q') {
      handleQuit();
      return;
    }

    // vim-style navigation (only when not searching)
    if (input === 'k') {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (input === 'j') {
      setSelectedIndex((prev) =>
        Math.min(filteredStations.length - 1, prev + 1)
      );
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

    // Alphanumeric input for search (when search is not active)
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

    favoritesService.toggleFavorite(station.slug);
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
      <Box>
        <Text bold color="green">
          🎵 RadioCrestin.ro Player
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
