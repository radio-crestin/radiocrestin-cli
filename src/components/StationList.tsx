import React, { useMemo } from 'react';
import { Box, Text, useStdout } from 'ink';
import type { Station } from '../types/station.js';

interface StationListProps {
  stations: Station[];
  selectedIndex: number;
  currentStationSlug: string | null;
  favorites: string[];
}

export const StationList: React.FC<StationListProps> = ({
  stations,
  selectedIndex,
  currentStationSlug,
  favorites,
}) => {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;
  const terminalHeight = stdout?.rows || 24;

  // Calculate available height for station list
  // Account for: header (3), now playing (6), search (3), footer (3), margins
  const listHeight = Math.max(5, terminalHeight - 15);

  // Calculate visible window
  const { startIndex, endIndex } = useMemo(() => {
    const halfWindow = Math.floor(listHeight / 2);
    let start = Math.max(0, selectedIndex - halfWindow);
    let end = Math.min(stations.length, start + listHeight);

    // Adjust if we're at the end
    if (end - start < listHeight) {
      start = Math.max(0, end - listHeight);
    }

    return { startIndex: start, endIndex: end };
  }, [selectedIndex, listHeight, stations.length]);

  const visibleStations = stations.slice(startIndex, endIndex);

  if (stations.length === 0) {
    return (
      <Box marginY={1}>
        <Text color="yellow">No stations found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginY={1} width={terminalWidth - 4}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Stations ({stations.length})
        </Text>
        {stations.length > listHeight && (
          <Text dimColor color="gray">
            {' '}
            - Showing {startIndex + 1}-{endIndex} of {stations.length}
          </Text>
        )}
      </Box>

      {visibleStations.map((station, index) => {
        const actualIndex = startIndex + index;
        const isSelected = actualIndex === selectedIndex;
        const isPlaying = station.slug === currentStationSlug;
        const isFavorite = favorites.includes(station.slug);

        const nowPlayingText =
          station.now_playing?.song?.name && station.now_playing?.artist?.name
            ? `${station.now_playing.artist.name} - ${station.now_playing.song.name}`
            : station.now_playing?.song?.name ||
              station.now_playing?.artist?.name ||
              'No info';

        // Calculate available width for now playing text
        const prefix = `${isSelected ? '▶ ' : '  '}${isFavorite ? '⭐ ' : ''}${isPlaying ? '♪ ' : ''}`;
        const stationTitle = station.title;
        const listeners = ` (${station.total_listeners} listeners) - `;
        const usedWidth = prefix.length + stationTitle.length + listeners.length;
        const availableWidth = Math.max(20, terminalWidth - usedWidth - 10);

        const truncatedNowPlaying =
          nowPlayingText.length > availableWidth
            ? nowPlayingText.slice(0, availableWidth - 3) + '...'
            : nowPlayingText;

        return (
          <Box key={station.id} width={terminalWidth - 4}>
            <Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
              {isSelected ? '▶ ' : '  '}
              {isFavorite ? '⭐ ' : ''}
              {isPlaying ? '♪ ' : ''}
              <Text color={isPlaying ? 'green' : isSelected ? 'cyan' : 'white'}>
                {station.title}
              </Text>
              <Text color="gray"> ({station.total_listeners} listeners)</Text>
              {' - '}
              <Text color="magenta" dimColor>
                {truncatedNowPlaying}
              </Text>
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
