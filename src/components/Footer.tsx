import React from 'react';
import { Box, Text } from 'ink';

export const Footer: React.FC = () => {
  return (
    <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
      <Text dimColor>
        Press <Text color="cyan">?</Text> for help | <Text color="cyan">q</Text> to quit
      </Text>
    </Box>
  );
};
