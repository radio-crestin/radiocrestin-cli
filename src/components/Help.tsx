import React from 'react';
import { Box, Text } from 'ink';

export const Help: React.FC = () => {
  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1} marginY={1} flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Keyboard Shortcuts
        </Text>
        <Text dimColor> (Press ? or Esc to close)</Text>
      </Box>
      <Box>
        <Text color="gray">↑/↓ or j/k</Text>
        <Text> - Navigate stations</Text>
      </Box>
      <Box>
        <Text color="gray">Enter</Text>
        <Text> - Play selected station</Text>
      </Box>
      <Box>
        <Text color="gray">Space</Text>
        <Text> - Pause/Resume</Text>
      </Box>
      <Box>
        <Text color="gray">f</Text>
        <Text> - Toggle favorite</Text>
      </Box>
      <Box>
        <Text color="gray">+/-</Text>
        <Text> - Volume up/down</Text>
      </Box>
      <Box>
        <Text color="gray">m</Text>
        <Text> - Mute/Unmute</Text>
      </Box>
      <Box>
        <Text color="gray">Type</Text>
        <Text> - Search stations</Text>
      </Box>
      <Box>
        <Text color="gray">? or h</Text>
        <Text> - Toggle this help</Text>
      </Box>
      <Box>
        <Text color="gray">Escape</Text>
        <Text> - Clear search / Close help</Text>
      </Box>
      <Box>
        <Text color="gray">q or Ctrl+C</Text>
        <Text> - Quit</Text>
      </Box>
    </Box>
  );
};
