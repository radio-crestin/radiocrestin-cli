import os from 'os';

export type Platform = 'win32' | 'darwin' | 'linux';
export type Arch = 'x64' | 'arm64';

export interface PlatformInfo {
  platform: Platform;
  arch: Arch;
}

export function getPlatformInfo(): PlatformInfo {
  const platform = process.platform as Platform;
  const arch = process.arch as Arch;

  if (!['win32', 'darwin', 'linux'].includes(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  if (!['x64', 'arm64'].includes(arch)) {
    throw new Error(`Unsupported architecture: ${arch}`);
  }

  return { platform, arch };
}

export function getMpvCacheDir(): string {
  const platform = process.platform;
  const homeDir = os.homedir();

  if (platform === 'win32') {
    return `${process.env.LOCALAPPDATA || `${homeDir}\\AppData\\Local`}\\radiocrestin-cli\\mpv`;
  } else if (platform === 'darwin') {
    return `${homeDir}/Library/Caches/radiocrestin-cli/mpv`;
  } else {
    return `${process.env.XDG_CACHE_HOME || `${homeDir}/.cache`}/radiocrestin-cli/mpv`;
  }
}
