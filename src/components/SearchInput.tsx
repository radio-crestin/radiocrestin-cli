import React from 'react';
import { Box, Text, useStdout } from 'ink';

interface SearchInputProps {
  query: string;
  active: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({ query, active }) => {
  const { stdout } = useStdout();
  const terminalWidth = stdout?.columns || 80;

  if (!query) {
    return null;
  }

  return (
    <Box
      marginY={1}
      borderStyle="round"
      borderColor={active ? 'cyan' : 'gray'}
      paddingX={1}
      width={terminalWidth - 4}
    >
      <Text color="cyan">Search: </Text>
      <Text>{query}</Text>
      {active && <Text color="cyan">_</Text>}
    </Box>
  );
};
