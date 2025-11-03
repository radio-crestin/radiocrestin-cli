import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type { Station } from '../types/station.js';

interface NowPlayingProps {
  station: Station | null;
  paused: boolean;
  volume: number;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({ station, paused, volume }) => {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;

  if (!station) {
    return (
      <Box borderStyle="round" borderColor="gray" paddingX={1} marginY={1} width={terminalWidth - 4}>
        <Text color="gray">No station playing - Press Enter to select a station</Text>
      </Box>
    );
  }

  const nowPlayingText =
    station.now_playing?.song?.name && station.now_playing?.artist?.name
      ? `${station.now_playing.artist.name} - ${station.now_playing.song.name}`
      : station.now_playing?.song?.name ||
        station.now_playing?.artist?.name ||
        'Unknown';

  const statusIcon = paused ? '⏸' : '♪';
  const statusText = paused ? 'Paused' : 'Playing';

  // Create volume bar
  const volumeBars = Math.round(volume / 10);
  const volumeBar = '█'.repeat(volumeBars) + '░'.repeat(10 - volumeBars);

  // Truncate now playing text to fit terminal width
  const maxNowPlayingWidth = terminalWidth - 10;
  const truncatedNowPlaying =
    nowPlayingText.length > maxNowPlayingWidth
      ? nowPlayingText.slice(0, maxNowPlayingWidth - 3) + '...'
      : nowPlayingText;

  return (
    <Box
      borderStyle="round"
      borderColor={paused ? 'yellow' : 'green'}
      paddingX={1}
      marginY={1}
      flexDirection="column"
      width={terminalWidth - 4}
    >
      <Box>
        <Text color={paused ? 'yellow' : 'green'} bold>
          {statusIcon} {statusText}:{' '}
        </Text>
        <Text color="cyan" bold>
          {station.title}
        </Text>
      </Box>
      <Box>
        <Text color="magenta">{truncatedNowPlaying}</Text>
      </Box>
      <Box>
        <Text color="gray">Volume: </Text>
        <Text color="cyan">{volumeBar}</Text>
        <Text color="gray"> {volume}%</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor color="gray">
          Listeners: {station.total_listeners} | Status:{' '}
          {station.uptime.is_up ? (
            <Text color="green">Online</Text>
          ) : (
            <Text color="red">Offline</Text>
          )}
        </Text>
      </Box>
    </Box>
  );
};
