import React from 'react';
import { Box, Text } from 'ink';

interface SearchInputProps {
  query: string;
  active: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({ query, active }) => {
  if (!active && !query) {
    return null;
  }

  return (
    <Box marginY={1} borderStyle="round" borderColor={active ? 'cyan' : 'gray'} paddingX={1}>
      <Text color="cyan">Search: </Text>
      <Text>{query}</Text>
      {active && <Text color="cyan">_</Text>}
    </Box>
  );
};
