import esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/cli.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/cli.js',
  external: [
    'ink',
    'react',
    'conf',
    'chalk',
    'ora',
    'axios',
    'extract-zip',
    'tar',
  ],
  banner: {
    js: '#!/usr/bin/env node\n',
  },
  sourcemap: true,
  minify: false,
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(buildOptions);
  console.log('Build complete!');
}
