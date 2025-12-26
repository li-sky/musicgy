import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const CACHE_DIR = process.env.MUSIC_CACHE_DIR;

export interface SongMetadata {
  contentType: string;
  size: number;
}

export const storageService = {
  get isEnabled() {
    return !!CACHE_DIR;
  },

  getCachePath(songId: number) {
    if (!CACHE_DIR) return null;
    return path.join(CACHE_DIR, `${songId}.data`);
  },

  getMetadataPath(songId: number) {
    if (!CACHE_DIR) return null;
    return path.join(CACHE_DIR, `${songId}.json`);
  },

  async ensureCacheDir() {
    if (CACHE_DIR && !fs.existsSync(CACHE_DIR)) {
      await fs.promises.mkdir(CACHE_DIR, { recursive: true });
    }
  },

  exists(songId: number): boolean {
    const p = this.getCachePath(songId);
    const m = this.getMetadataPath(songId);
    return !!p && fs.existsSync(p) && !!m && fs.existsSync(m);
  },

  async getMetadata(songId: number): Promise<SongMetadata | null> {
    const p = this.getMetadataPath(songId);
    if (!p || !fs.existsSync(p)) return null;
    try {
      const data = await fs.promises.readFile(p, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
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

  async save(songId: number, stream: Readable | ReadableStream, contentType: string) {
    if (!CACHE_DIR) return;
    await this.ensureCacheDir();
    const p = this.getCachePath(songId);
    const m = this.getMetadataPath(songId);
    if (!p || !m) return;

    const tempPath = `${p}.tmp`;
    const fileStream = fs.createWriteStream(tempPath);

    try {
        if (stream instanceof Readable) {
             await pipeline(stream, fileStream);
        } else {
             // @ts-ignore
             await pipeline(Readable.fromWeb(stream), fileStream);
        }
        
        const size = (await fs.promises.stat(tempPath)).size;
        await fs.promises.rename(tempPath, p);
        
        // Save metadata
        await fs.promises.writeFile(m, JSON.stringify({ contentType, size }));
    } catch (e) {
        console.error(`Failed to save song ${songId}:`, e);
        if (fs.existsSync(tempPath)) await fs.promises.unlink(tempPath);
        throw e;
    }
  }
};
