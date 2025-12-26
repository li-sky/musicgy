import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const CACHE_DIR = process.env.MUSIC_CACHE_DIR;

export const storageService = {
  get isEnabled() {
    return !!CACHE_DIR;
  },

  getCachePath(songId: number) {
    if (!CACHE_DIR) return null;
    return path.join(CACHE_DIR, `${songId}.mp3`); // Assuming mp3 for now, or we can detect
  },

  async ensureCacheDir() {
    if (CACHE_DIR && !fs.existsSync(CACHE_DIR)) {
      await fs.promises.mkdir(CACHE_DIR, { recursive: true });
    }
  },

  exists(songId: number): boolean {
    const p = this.getCachePath(songId);
    return !!p && fs.existsSync(p);
  },

  getReadStream(songId: number, options?: { start?: number; end?: number }) {
    const p = this.getCachePath(songId);
    if (!p || !fs.existsSync(p)) return null;
    return fs.createReadStream(p, options);
  },

  async getFileSize(songId: number): Promise<number> {
    const p = this.getCachePath(songId);
    if (!p || !fs.existsSync(p)) return 0;
    const stat = await fs.promises.stat(p);
    return stat.size;
  },

  async save(songId: number, stream: Readable | ReadableStream) {
    if (!CACHE_DIR) return;
    await this.ensureCacheDir();
    const p = this.getCachePath(songId);
    if (!p) return;

    // If already exists, maybe skip? For now, overwrite or assume check done before.
    // Actually, writing to a temp file and renaming is safer for concurrency.
    const tempPath = `${p}.tmp`;
    const fileStream = fs.createWriteStream(tempPath);

    try {
        if (stream instanceof Readable) {
             await pipeline(stream, fileStream);
        } else {
             // Web stream
             // @ts-ignore
             await pipeline(Readable.fromWeb(stream), fileStream);
        }
        await fs.promises.rename(tempPath, p);
    } catch (e) {
        console.error(`Failed to save song ${songId}:`, e);
        if (fs.existsSync(tempPath)) await fs.promises.unlink(tempPath);
        throw e;
    }
  }
};
