import React from 'react';
import { Box, Text, useStdout } from 'ink';

export const Footer: React.FC = () => {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} width={terminalWidth - 4}>
      <Text dimColor>
        Press <Text color="cyan">?</Text> for help | <Text color="cyan">q</Text> to quit
      </Text>
    </Box>
  );
};
