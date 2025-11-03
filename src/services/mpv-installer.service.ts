import { execSync } from 'child_process';
import path from 'path';
import { getPlatformInfo, getMpvCacheDir } from '../utils/platform.js';
import { downloadMpv, isMpvDownloaded } from './mpv-downloader.service.js';
import fs from 'fs/promises';

export async function getMpvPath(
  onDownloadProgress?: (progress: number) => void
): Promise<string> {
  // 1. Check for system MPV
  const systemMpv = findSystemMpv();
  if (systemMpv) {
    return systemMpv;
  }

  // 2. Check for cached MPV
  const cachedMpv = await findCachedMpv();
  if (cachedMpv) {
    return cachedMpv;
  }

  // 3. Download MPV
  const downloadedMpv = await downloadMpv(onDownloadProgress);
  return downloadedMpv;
}

function findSystemMpv(): string | null {
  try {
    const platform = process.platform;
    const command = platform === 'win32' ? 'where mpv' : 'which mpv';

    const result = execSync(command, { encoding: 'utf-8' }).trim();

    if (result) {
      // On Windows, 'where' might return multiple paths, take the first one
      const mpvPath = result.split('\n')[0].trim();
      return mpvPath;
    }
  } catch {
    // Command failed, MPV not in PATH
  }

  return null;
}

async function findCachedMpv(): Promise<string | null> {
  if (!isMpvDownloaded()) {
    return null;
  }

  const platformInfo = getPlatformInfo();
  const cacheDir = getMpvCacheDir();
  const extractDir = path.join(cacheDir, 'extracted');
  const binaryName = platformInfo.platform === 'win32' ? 'mpv.exe' : 'mpv';

  async function searchDir(dir: string): Promise<string | null> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isFile() && entry.name === binaryName) {
          return fullPath;
        }

        if (entry.isDirectory()) {
          const found = await searchDir(fullPath);
          if (found) return found;
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return null;
  }

  return searchDir(extractDir);
}

export async function ensureMpvInstalled(
  onProgress?: (message: string, progress?: number) => void
): Promise<string> {
  const onDownloadProgress = (progress: number) => {
    if (onProgress) {
      onProgress(`Downloading MPV (${Math.round(progress)}%)...`, progress);
    }
  };

  if (onProgress) {
    onProgress('Checking for MPV installation...');
  }

  const mpvPath = await getMpvPath(onDownloadProgress);

  if (onProgress) {
    onProgress('MPV ready!', 100);
  }

  return mpvPath;
}
