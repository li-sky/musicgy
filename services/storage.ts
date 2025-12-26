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

    const tempPath = `${p}.${Math.random().toString(36).substring(7)}.tmp`;
    
    try {
        // Use Bun.write if available for maximum performance and stability with Web Streams
        // @ts-ignore
        if (typeof Bun !== 'undefined') {
            // @ts-ignore
            await Bun.write(tempPath, stream);
        } else {
            // Fallback for Node.js
            const fileStream = fs.createWriteStream(tempPath);
            if (stream instanceof Readable) {
                await pipeline(stream, fileStream);
            } else {
                // @ts-ignore
                await pipeline(Readable.fromWeb(stream), fileStream);
            }
        }
        
        if (!fs.existsSync(tempPath)) {
            throw new Error(`Temp file ${tempPath} not found after write`);
        }

        const size = (await fs.promises.stat(tempPath)).size;
        
        // Double check if target already exists (another task might have finished)
        if (fs.existsSync(p)) {
            await fs.promises.unlink(tempPath).catch(() => {});
            return;
        }

        await fs.promises.rename(tempPath, p);
        
        // Save metadata
        await fs.promises.writeFile(m, JSON.stringify({ contentType, size }));
    } catch (e: any) {
        // Ignore "Controller is already closed" as it usually means the stream finished 
        // but the polyfill tried to close it again.
        if (e?.message?.includes('already closed')) {
            if (fs.existsSync(tempPath)) {
                const size = (await fs.promises.stat(tempPath)).size;
                if (size > 0) {
                   await fs.promises.rename(tempPath, p);
                   await fs.promises.writeFile(m, JSON.stringify({ contentType, size }));
                   return;
                }
            }
        }
        
        console.error(`Failed to save song ${songId}:`, e);
        if (fs.existsSync(tempPath)) await fs.promises.unlink(tempPath).catch(() => {});
        throw e;
    }
  }
};
