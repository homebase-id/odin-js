// No-op stub for @homebase-id/ffmpeg.
//
// The real package is an auth-gated GitHub Packages dependency (npm.pkg.github.com)
// and is only pulled in lazily by js-lib via `await import('@homebase-id/ffmpeg')`
// when processing/segmenting video (HLS). For local dev without video we don't need
// it, but the vite dev server's dependency optimizer still tries to resolve the
// import at startup — so this stub exists purely to satisfy that resolution.
//
// If you actually need video processing, install the real package (its sources live
// in ../../ffmpeg-kit and ../../ffmpeg.wasm) and remove the node_modules/@homebase-id/ffmpeg
// symlink to this stub.

export class FFmpeg {
  constructor() {
    throw new Error(
      '@homebase-id/ffmpeg is stubbed out in this local dev setup; ' +
        'video processing is disabled. Install the real package to enable it.'
    );
  }
}

export default { FFmpeg };
