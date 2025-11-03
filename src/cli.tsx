import { render } from 'ink';
import ora from 'ora';
import chalk from 'chalk';
import { App } from './components/App.js';
import { MpvPlayer } from './services/player.service.js';
import { ensureMpvInstalled } from './services/mpv-installer.service.js';
import { favoritesService } from './services/favorites.service.js';

async function main() {
  let spinner: ReturnType<typeof ora> | null = null;

  try {
    // Show loading spinner while setting up MPV
    spinner = ora({
      text: 'Checking for MPV installation...',
      color: 'cyan',
    }).start();

    const mpvPath = await ensureMpvInstalled((message) => {
      if (spinner) {
        spinner.text = message;
      }
    });

    spinner.succeed(chalk.green('MPV ready!'));
    spinner = null;

    // Create and start player with saved volume
    const savedVolume = favoritesService.getVolume();
    const player = new MpvPlayer(mpvPath, savedVolume);

    // Show starting message
    spinner = ora({
      text: 'Starting player...',
      color: 'cyan',
    }).start();

    await player.start();

    spinner.succeed(chalk.green('Player started!'));
    spinner = null;

    // Render the Ink app
    const { waitUntilExit } = render(<App player={player} />, {
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
    });

    // Wait for app to exit
    await waitUntilExit();

    // Cleanup
    await player.quit();
    process.exit(0);
  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red('Failed to start player'));
    }

    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);

    console.error(
      chalk.yellow('\nTroubleshooting:'),
      '\n- Ensure you have a stable internet connection',
      '\n- Try running with elevated permissions',
      '\n- Check if MPV is installed correctly: mpv --version',
      '\n- Report issues at: https://github.com/iosifnicolae2/radiocrestin-cli/issues'
    );

    process.exit(1);
  }
}

main();
