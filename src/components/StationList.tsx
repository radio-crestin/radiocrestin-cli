import React from 'react';
import { Box, Text } from 'ink';
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
  if (stations.length === 0) {
    return (
      <Box marginY={1}>
        <Text color="yellow">No stations found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginY={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Stations ({stations.length})
        </Text>
      </Box>

      {stations.map((station, index) => {
        const isSelected = index === selectedIndex;
        const isPlaying = station.slug === currentStationSlug;
        const isFavorite = favorites.includes(station.slug);

        const nowPlayingText =
          station.now_playing?.song?.name && station.now_playing?.artist?.name
            ? `${station.now_playing.artist.name} - ${station.now_playing.song.name}`
            : station.now_playing?.song?.name ||
              station.now_playing?.artist?.name ||
              'No info';

        return (
          <Box key={station.id}>
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
                {nowPlayingText.slice(0, 50)}
                {nowPlayingText.length > 50 ? '...' : ''}
              </Text>
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
