import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, existsSync } from 'fs';
import { pipeline } from 'stream/promises';
import * as tar from 'tar';
import {
  getPlatformInfo,
  getMpvCacheDir,
  type PlatformInfo,
} from '../utils/platform.js';

const MPV_DOWNLOAD_URLS = {
  'win32-x64':
    'https://sourceforge.net/projects/mpv-player-windows/files/64bit/mpv-x86_64-20240923-git-f0acc74.7z/download',
  'darwin-x64':
    'https://laboratory.stolendata.net/~djinn/mpv_osx/mpv-latest.tar.gz',
  'darwin-arm64':
    'https://laboratory.stolendata.net/~djinn/mpv_osx/mpv-latest.tar.gz',
  'linux-x64':
    'https://github.com/mpv-player/mpv/releases/download/v0.38.0/mpv-x86_64-linux-gnu.tar.gz',
};

export async function downloadMpv(
  onProgress?: (progress: number) => void
): Promise<string> {
  const platformInfo = getPlatformInfo();
  const cacheDir = getMpvCacheDir();
  const downloadUrl = getMpvDownloadUrl(platformInfo);

  // Create cache directory
  await fs.mkdir(cacheDir, { recursive: true });

  const archivePath = path.join(
    cacheDir,
    `mpv-archive${getArchiveExtension(platformInfo)}`
  );
  const extractDir = path.join(cacheDir, 'extracted');

  // Download the archive
  const response = await axios({
    method: 'GET',
    url: downloadUrl,
    responseType: 'stream',
    onDownloadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = (progressEvent.loaded / progressEvent.total) * 100;
        onProgress(progress);
      }
    },
  });

  // Save to file
  const writer = createWriteStream(archivePath);
  await pipeline(response.data, writer);

  // Extract archive
  await extractArchive(archivePath, extractDir, platformInfo);

  // Find mpv binary
  const mpvPath = await findMpvBinary(extractDir, platformInfo);

  // Make executable on Unix systems
  if (platformInfo.platform !== 'win32') {
    await fs.chmod(mpvPath, 0o755);
  }

  // Clean up archive
  await fs.unlink(archivePath);

  return mpvPath;
}

function getMpvDownloadUrl(platformInfo: PlatformInfo): string {
  const key =
    `${platformInfo.platform}-${platformInfo.arch}` as keyof typeof MPV_DOWNLOAD_URLS;
  const url = MPV_DOWNLOAD_URLS[key];

  if (!url) {
    throw new Error(
      `No MPV download URL for platform: ${platformInfo.platform}-${platformInfo.arch}`
    );
  }

  return url;
}

function getArchiveExtension(platformInfo: PlatformInfo): string {
  return platformInfo.platform === 'win32' ? '.7z' : '.tar.gz';
}

async function extractArchive(
  archivePath: string,
  extractDir: string,
  platformInfo: PlatformInfo
): Promise<void> {
  await fs.mkdir(extractDir, { recursive: true });

  if (platformInfo.platform === 'win32') {
    // For Windows, we need to tell users to install MPV manually for now
    // TODO: Find a zip-based download or implement 7z extraction
    throw new Error(
      'Automatic MPV download is not yet supported on Windows.\n' +
        'Please install MPV manually:\n' +
        '  - Download from https://mpv.io/installation/\n' +
        '  - Or use chocolatey: choco install mpv\n' +
        '  - Or use scoop: scoop install mpv'
    );
  } else {
    // Extract tar.gz
    await tar.x({
      file: archivePath,
      cwd: extractDir,
    });
  }
}

async function findMpvBinary(
  extractDir: string,
  platformInfo: PlatformInfo
): Promise<string> {
  const binaryName = platformInfo.platform === 'win32' ? 'mpv.exe' : 'mpv';

  async function searchDir(dir: string): Promise<string | null> {
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

    return null;
  }

  const mpvPath = await searchDir(extractDir);

  if (!mpvPath) {
    throw new Error(
      `MPV binary not found in extracted archive at ${extractDir}`
    );
  }

  return mpvPath;
}

export function isMpvDownloaded(): boolean {
  const cacheDir = getMpvCacheDir();
  const extractDir = path.join(cacheDir, 'extracted');
  return existsSync(extractDir);
}
