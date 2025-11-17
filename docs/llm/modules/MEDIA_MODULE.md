# MEDIA Module Documentation

## Overview
The MEDIA module provides image and video processing, thumbnail generation, and media URL handling.

**All functions verified from actual source code.**

---

## Image Provider

- `getDecryptedThumbnailMeta(dotYouClient, targetDrive, fileId, options?)` - Get thumbnail metadata
- `getDecryptedImageUrl(...)` - Get decrypted image URL (alias for getDecryptedMediaUrl)
- `getDecryptedImageData(dotYouClient, targetDrive, fileId, options?)` - Get decrypted image data
- `getDecryptedImageMetadata(dotYouClient, targetDrive, fileId, options?)` - Get image metadata

---

## Video Provider

- `VideoContentType` = 'video/mp4'
- `getDecryptedVideoChunk(dotYouClient, targetDrive, fileId, chunkStart, chunkEnd, options?)` - Get video chunk
- `getDecryptedVideoUrl(...)` - Get decrypted video URL (alias for getDecryptedMediaUrl)

---

## Media Provider

- `getDecryptedMediaUrl(dotYouClient, targetDrive, fileId, key?, options?)` - Get decrypted media URL
- `getAnonymousDirectImageUrl(targetDrive, fileId, payloadKey?, size?)` - Get anonymous image URL

---

## Thumbnail Provider

- `baseThumbSizes` - Array of base thumbnail sizes (50x50, 200x200, 400x400, 800x800)
- `tinyThumbSize` - Tiny thumbnail size (10x10)
- `getRevisedThumbs(existingThumbs, newInstructions)` - Get revised thumbnails
- `createThumbnails(file, thumbnailInstructions)` - Create thumbnails from file
- `createImageThumbnail(image, size, pixelated?)` - Create single image thumbnail

---

## Video Processing

- `processVideoFile(file, onProgress?, options?)` - Process video file for upload

### Video Segmenter

- `getMp4Info(file)` - Get MP4 file information
- `getCodecFromMp4Info(info)` - Extract codec from MP4 info
- `segmentVideoFile(file, onProgress?, options?)` - Segment video file

### FFmpeg Segmenter

- `segmentVideoFileWithFfmpeg(file, onProgress?)` - Segment video using FFmpeg
- `getThumbnailWithFfmpeg(videoFile)` - Get thumbnail using FFmpeg

---

## Image Resizer

- `getTargetSize(originalWidth, originalHeight, targetSize)` - Calculate target dimensions
- `resizeImageFromBlob(blob, size, pixelated?)` - Resize image from blob

---

## Link Preview

- `getLinkPreview(dotYouClient, url)` - Get link preview data

### Link Preview Types
- `LinkPreview` interface (url, title, description, imageUrl, etc.)
- `LinkPreviewDescriptor` interface (extends LinkPreview without imageUrl)

---

## Media Types

- `ThumbnailMeta` type
- `MediaUploadMeta` interface
- `MediaUploadResult` interface
- `VideoUploadResult` interface
- `ImageUploadResult` interface
- `ImageMetadata` interface
- `BaseVideoMetadata` interface
- `PlainVideoMetadata` interface
- `SegmentedVideoMetadata` interface
- `HlsVideoMetadata` interface
- `ThumbnailInstruction` interface
- `MediaConfig` class

---

All exports verified from `packages/libs/js-lib/src/media/`.
