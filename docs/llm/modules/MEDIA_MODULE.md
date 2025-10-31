# Media Module Documentation

## Overview

The **Media module** provides media processing and management utilities:

- **Image Processing**: Resize, crop, and optimize images
- **Thumbnails**: Generate thumbnails at multiple sizes
- **Video Processing**: Video transcoding and optimization
- **Video Segmentation**: Split videos into segments (HLS/DASH)
- **Link Previews**: Extract metadata and thumbnails from URLs
- **Media Providers**: Access media files with proper handling
- **Image Provider**: Specialized image fetching
- **Video Provider**: Specialized video fetching

---

## File Structure

```
media/
├── media.ts                          # Module exports
├── MediaTypes.ts                     # Media type definitions
├── MediaProvider.ts                  # Generic media provider
├── ImageProvider.ts                  # Image-specific provider
├── VideoProvider.ts                  # Video-specific provider
├── Thumbs/
│   ├── ImageResizer.ts              # Image resizing
│   └── ThumbnailProvider.ts          # Thumbnail generation
├── Video/
│   ├── VideoProcessor.ts             # Video processing
│   ├── VideoSegmenter.ts             # Video segmentation
│   └── VideoSegmenterFfmpeg.ts       # FFmpeg-based segmentation
└── Link/
    └── LinkPreviewProvider.ts        # URL metadata extraction
```

---

## API Reference

### ImageResizer

#### resizeImage()

```typescript
async resizeImage(
  image: Blob | File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  }
): Promise<Blob>;
```

Resizes an image to fit within dimensions.

**Example**:
```typescript
import { resizeImage } from '@homebase-id/js-lib/media';

const resized = await resizeImage(imageFile, {
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.85,
  format: 'jpeg'
});
```

---

### ThumbnailProvider

#### generateThumbnails()

```typescript
async generateThumbnails(
  image: Blob | File,
  sizes: number[]
): Promise<ThumbnailFile[]>;
```

Generates multiple thumbnail sizes.

**Example**:
```typescript
import { generateThumbnails } from '@homebase-id/js-lib/media';

const thumbnails = await generateThumbnails(imageFile, [200, 400, 800]);
```

---

### VideoProcessor

#### processVideo()

```typescript
async processVideo(
  video: File,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    bitrate?: number;
    format?: 'mp4' | 'webm';
  }
): Promise<Blob>;
```

Processes and optimizes a video.

---

### VideoSegmenter

#### segmentVideo()

```typescript
async segmentVideo(
  video: File,
  options?: {
    segmentDuration?: number;
    format?: 'hls' | 'dash';
  }
): Promise<VideoSegments>;
```

Segments a video for streaming.

---

### LinkPreviewProvider

#### getLinkPreview()

```typescript
async getLinkPreview(
  dotYouClient: DotYouClient,
  url: string
): Promise<LinkPreview>;
```

Extracts metadata and preview from a URL.

**Example**:
```typescript
import { getLinkPreview } from '@homebase-id/js-lib/media';

const preview = await getLinkPreview(client, 'https://example.com/article');
console.log('Title:', preview.title);
console.log('Description:', preview.description);
console.log('Image:', preview.imageUrl);
```

---

### ImageProvider

#### getImage()

```typescript
async getImage(
  dotYouClient: DotYouClient,
  fileId: string,
  size?: 'thumbnail' | 'preview' | 'full'
): Promise<Blob>;
```

Retrieves an image at specified size.

---

### VideoProvider

#### getVideo()

```typescript
async getVideo(
  dotYouClient: DotYouClient,
  fileId: string,
  quality?: 'low' | 'medium' | 'high'
): Promise<Blob>;
```

Retrieves a video at specified quality.

---

## Common Patterns

### Pattern 1: Generate and Upload Image with Thumbnails

```typescript
import { generateThumbnails } from '@homebase-id/js-lib/media';
import { uploadFile } from '@homebase-id/js-lib/core';

const thumbnails = await generateThumbnails(imageFile, [200, 400, 800]);

await uploadFile(client, instructions, metadata, [mainPayload], thumbnails);
```

---

### Pattern 2: Process Video Before Upload

```typescript
import { processVideo } from '@homebase-id/js-lib/media';

const optimized = await processVideo(videoFile, {
  maxWidth: 1920,
  maxHeight: 1080,
  bitrate: 5000000 // 5 Mbps
});

// Upload optimized video
await uploadVideo(client, optimized);
```

---

### Pattern 3: Link Preview for Social Post

```typescript
import { getLinkPreview } from '@homebase-id/js-lib/media';

const url = 'https://example.com/article'\;
const preview = await getLinkPreview(client, url);

// Include in post
await createPost(client, {
  text: 'Check this out!',
  link: url,
  linkPreview: preview
});
```

---

## Best Practices

### ✅ DO:

1. **Generate multiple thumbnail sizes**
   ```typescript
   const thumbnails = await generateThumbnails(image, [200, 400, 800, 1200]);
   ```

2. **Optimize images before upload**
   ```typescript
   const optimized = await resizeImage(image, { quality: 0.85 });
   ```

3. **Use appropriate formats**
   ```typescript
   // WebP for modern browsers
   const webp = await resizeImage(image, { format: 'webp' });
   ```

### ❌ DON'T:

1. **Don't upload full-resolution images without optimization**

2. **Don't skip thumbnail generation for images**

---

## Related Documentation

- [CORE_MODULE.md](./CORE_MODULE.md) - File upload operations
- [PUBLIC_MODULE.md](./PUBLIC_MODULE.md) - Post media handling

---

**Last Updated**: October 31, 2025  
**Module Path**: `packages/libs/js-lib/src/media/`
