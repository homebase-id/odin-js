// Type declarations for the local no-op stub of @homebase-id/ffmpeg.
// Mirrors the surface of the real package (@ffmpeg/ffmpeg's FFmpeg class)
// that js-lib actually uses, so `tsc` passes without the auth-gated package.

export declare class FFmpeg {
  constructor();
  on(event: 'log', callback: (event: { message: string }) => void): void;
  load(config?: {
    coreURL?: string;
    wasmURL?: string;
    classWorkerURL?: string;
  }): Promise<boolean>;
  exec(args: string[], timeout?: number): Promise<number>;
  writeFile(path: string, data: Uint8Array | string): Promise<boolean>;
  readFile(path: string, encoding?: string): Promise<Uint8Array | string>;
}

declare const _default: { FFmpeg: typeof FFmpeg };
export default _default;
