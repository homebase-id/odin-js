# Documentation: `processVideoFile`

## Background and Evolution of the Approach

Initially, we implemented a custom video playback solution that involved the following steps:

1. Fetching video data in chunks.
2. Decrypting the fetched data.
3. Manually feeding the decrypted data into a Media Source Extensions (MSE) video blob for playback.

To support this, the `processVideoFile` function was designed to modify the original MP4 container into a fragmented MP4 format. This allowed for progressive playback, enabling the video to start playing while subsequent chunks were still downloading.

While this approach worked in principle, it introduced significant challenges:

- **Playback Issues**: Many browsers struggled with the custom fragmented MP4 files due to insufficient metadata or compatibility issues with `mp4box`-generated fragments.
- **Inconsistency Across Platforms**: These issues resulted in unreliable playback behavior, especially in browsers with stricter MP4 playback requirements.

## The Current Approach

To overcome these challenges, we transitioned to a more standardized and robust solution leveraging **HTTP Live Streaming (HLS)**, while optimizing the fragmentation to use a single `.ts` file. Here's how the current approach works:

1. Using `ffmpeg`, the MP4 file is fragmented and encrypted into a single `.ts` file. Instead of generating multiple `.ts` media segments, this single file uses byte-range fragmentation, where start-stop pointers define each "segment."
2. The HLS playlist (`.m3u8`) references these byte ranges, allowing playback as if it were segmented while keeping all data in one file.
3. The playlist also includes encryption metadata (a key and IV) that compatible HLS players can use to decrypt and play the video seamlessly.

### Advantages of the Current Approach

- **Standards Compliance**: HLS is widely supported across browsers and devices, ensuring consistent playback.
- **Simplified Decryption**: Decryption is handled natively by HLS-compatible players, removing the need for custom logic to manage encrypted chunks.
- **Full File Usability**: By maintaining a single `.ts` file, the video remains playable even when downloaded in full, without requiring HLS-specific handling.
- **Improved Reliability**: By adhering to an industry-standard streaming protocol, the playback issues and incompatibilities of the custom fragmented MP4 approach have been resolved.

## Summary

The `processVideoFile` function is now optimized to produce HLS-compatible, byte-range-fragmented `.ts` files. This enables secure, reliable streaming with minimal custom logic while maintaining file versatility.

## Code references:

On web, the code (here)[./VideoSegmenterFfmpeg.ts] in the js-lib triggers the HLS encoding by using (ffmpeg-wasm)[https://github.com/homebase-id/ffmpeg.wasm], which is a fork of (ffmpegwasm/ffmpeg.wasm)[https://github.com/ffmpegwasm/ffmpeg.wasm] without any functional changes. Just a different approach to loading and parsing the source files so it plays along in the js-lib packaging;

On react-native the (RNVideoPSegmenter.ts)[https://github.com/homebase-id/homebase-id-app/blob/main/packages/mobile/src/provider/video/RNVideoSegmenter.ts] uses the (arthenica/ffmpeg-kit)[https://github.com/arthenica/ffmpeg-kit] package to run the HLS encoding.
