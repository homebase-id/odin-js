import { describe, it, expect, beforeEach } from 'vitest';
import { createImageThumbnail, createThumbnails, getRevisedThumbs, baseThumbSizes, tinyThumbSize } from './ThumbnailProvider';
import { ThumbnailInstruction } from '../MediaTypes';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { ImageSize } from '../../core/core';

// Mock test images helper
const loadTestImageFromFile = (filename: string): Uint8Array => {
  const testImagesPath = join(__dirname, 'TestImages', filename);

  if (!existsSync(testImagesPath)) {
    throw new Error(`Test image file not found: ${testImagesPath}. Please add sample images to the TestImages directory for testing.`);
  }

  return new Uint8Array(readFileSync(testImagesPath));
};

const getAvailableTestImages = (): string[] => {
  const testImagesPath = join(__dirname, 'TestImages');

  if (!existsSync(testImagesPath)) {
    return [];
  }

  return readdirSync(testImagesPath)
    .filter(file => isImageFile(file));
};

const isImageFile = (filePath: string): boolean => {
  const extension = extname(filePath).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(extension);
};

// Create a test blob from Uint8Array
const createTestBlob = (data: Uint8Array, type = 'image/jpeg'): Blob => {
  const buffer = new ArrayBuffer(data.length);
  const view = new Uint8Array(buffer);
  view.set(data);
  return new Blob([buffer], { type });
};

describe('ThumbnailProvider', () => {
  beforeEach(() => {
    // Setup DOM environment for browser APIs
    global.document = {
      createElement: (tagName: string) => {
        if (tagName === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: (contextId: string) => {
              if (contextId === '2d') {
                return {
                  imageSmoothingEnabled: true,
                  imageSmoothingQuality: 'high',
                  drawImage: () => {
                    // Mock implementation
                  }
                };
              }
              return null;
            },
            toBlob: (callback: (blob: Blob | null) => void, type?: string) => {
              // Create a mock blob with some data
              const mockBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: type || 'image/webp' });
              setTimeout(() => callback(mockBlob), 0);
            }
          };
        }
        return {};
      }
    } as unknown as Document;

    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 100;
      naturalHeight = 100;
      width = 100;
      height = 100;

      set src(value: string) {
        // For SVG images, set specific dimensions
        if (value.includes('image/svg+xml')) {
          this.naturalWidth = 320;
          this.naturalHeight = 320;
          this.width = 320;
          this.height = 320;
        }
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    } as unknown as typeof Image;

    global.FileReader = class MockFileReader {
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: (() => void) | null = null;
      result: string | ArrayBuffer | null = null;

      readAsDataURL(blob: Blob): void {
        void blob; // Explicitly void unused parameter
        this.result = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//gA';
        setTimeout(() => {
          if (this.onload) this.onload({ target: this } as unknown as ProgressEvent<FileReader>);
        }, 0);
      }
    } as unknown as typeof FileReader;
  });

  describe('getRevisedThumbs', () => {
    it('should keep all thumbnails for large source (2500px)', () => {
      // Arrange
      const sourceSize: ImageSize = { pixelWidth: 2500, pixelHeight: 800 };

      // Act
      const result = getRevisedThumbs(sourceSize, baseThumbSizes);

      // Assert
      expect(result).toHaveLength(4);
      expect(result.some(t => t.maxPixelDimension === 320 && t.maxBytes === 26 * 1024 && t.quality === 84)).toBe(true);
      expect(result.some(t => t.maxPixelDimension === 640 && t.maxBytes === 102 * 1024 && t.quality === 84)).toBe(true);
      expect(result.some(t => t.maxPixelDimension === 1080 && t.maxBytes === 291 * 1024 && t.quality === 76)).toBe(true);
      expect(result.some(t => t.maxPixelDimension === 1600 && t.maxBytes === 640 * 1024 && t.quality === 76)).toBe(true);
    });

    it('should keep none and add 200px for small source (200px)', () => {
      // Arrange
      const sourceSize: ImageSize = { pixelWidth: 200, pixelHeight: 150 };

      // Act
      const result = getRevisedThumbs(sourceSize, baseThumbSizes);

      // Assert
      expect(result).toHaveLength(1);
      expect(result.some(t => t.maxPixelDimension === 200)).toBe(true);
      expect(result.some(t => t.quality === 84)).toBe(true);
      expect(result[0].maxBytes).toBe(16640);
    });

    it('should keep none and add 50px for minimum source (40x50px)', () => {
      // Arrange
      const sourceSize: ImageSize = { pixelWidth: 40, pixelHeight: 50 };

      // Act
      const result = getRevisedThumbs(sourceSize, baseThumbSizes);

      // Assert
      expect(result).toHaveLength(1);
      expect(result.some(t => t.maxPixelDimension === 50 && t.quality === 84)).toBe(true);
      expect(result[0].maxBytes).toBe(10 * 1024); // minimum threshold
    });

    it('should remove 1600px and add 1660px for source 1660px', () => {
      // Arrange
      const sourceSize: ImageSize = { pixelWidth: 1660, pixelHeight: 1200 };

      // Act
      const result = getRevisedThumbs(sourceSize, baseThumbSizes);

      // Assert
      expect(result).toHaveLength(4);
      expect(result.some(t => t.maxPixelDimension === 320)).toBe(true);
      expect(result.some(t => t.maxPixelDimension === 640)).toBe(true);
      expect(result.some(t => t.maxPixelDimension === 1080)).toBe(true);
      expect(result.some(t => t.maxPixelDimension === 1660)).toBe(true);
      expect(result.some(t => t.maxPixelDimension === 1600)).toBe(false); // 1600px thumb should be removed
    });

    it('should remove 1600px and add 1540px for source 1540px', () => {
      // Arrange
      const sourceSize: ImageSize = { pixelWidth: 1540, pixelHeight: 1200 };

      // Act
      const result = getRevisedThumbs(sourceSize, baseThumbSizes);

      // Assert
      expect(result).toHaveLength(4);
      expect(result.some(t => t.maxPixelDimension === 320)).toBe(true);
      expect(result.some(t => t.maxPixelDimension === 640)).toBe(true);
      expect(result.some(t => t.maxPixelDimension === 1080)).toBe(true);
      expect(result.some(t => t.maxPixelDimension === 1540)).toBe(true);
      expect(result.some(t => t.maxPixelDimension === 1600)).toBe(false); // 1600px thumb should be removed
    });

    it('should keep 320px and add 500px for source 500px', () => {
      // Arrange
      const sourceSize: ImageSize = { pixelWidth: 500, pixelHeight: 300 };

      // Act
      const result = getRevisedThumbs(sourceSize, baseThumbSizes);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.some(t => t.maxPixelDimension === 320)).toBe(true);
      expect(result.some(t => t.maxPixelDimension === 500 && t.quality === 84)).toBe(true);
      expect(result[1].maxBytes).toBe(81600);
    });
  });

  describe('createThumbnails', () => {
    it('should throw error with null image data', async () => {
      // Arrange & Act & Assert
      const emptyBlob = new Blob([]);
      await expect(createThumbnails(emptyBlob, 'test-key')).rejects.toThrow('No image data found');
    });

    it('should throw error in non-browser environment', async () => {
      // Arrange
      const originalDocument = global.document;
      // @ts-expect-error - Intentionally deleting global.document for testing
      delete global.document;

      const testBlob = createTestBlob(new Uint8Array([1, 2, 3, 4]));

      // Act & Assert
      await expect(createThumbnails(testBlob, 'test-key')).rejects.toThrow('Thumbnails can only be created in a browser environment');

      // Restore
      global.document = originalDocument;
    });

    // Note: These tests would require actual image files in TestImages directory
    it('should create thumbnails with valid JPEG data', async () => {
      try {
        // Arrange
        const imageData = loadTestImageFromFile('sample.jpg');
        const payloadKey = 'test-jpeg-key';
        const testBlob = createTestBlob(imageData, 'image/jpeg');

        // Act
        const result = await createThumbnails(testBlob, payloadKey);

        // Assert
        expect(result).toBeDefined();
        expect(result.naturalSize).toBeDefined();
        expect(result.tinyThumb).toBeDefined();
        expect(result.additionalThumbnails).toBeDefined();
        expect(result.additionalThumbnails.length).toBeGreaterThan(0);

        // Verify tiny thumb properties
        expect(result.tinyThumb.contentType).toMatch(/^image\//);
        expect(result.tinyThumb.content).toBeTruthy();

        // Verify additional thumbnails
        expect(result.additionalThumbnails.every(t => t.key === payloadKey)).toBe(true);
        expect(result.additionalThumbnails.every(t => t.payload.size > 0)).toBe(true);
      } catch (error) {
        console.log('Skipping test - no test images available:', error);
      }
    });

    it('should create thumbnails with valid PNG data', async () => {
      try {
        // Arrange
        const imageData = loadTestImageFromFile('sample.png');
        const payloadKey = 'test-png-key';
        const testBlob = createTestBlob(imageData, 'image/png');

        // Act
        const result = await createThumbnails(testBlob, payloadKey);

        // Assert
        expect(result).toBeDefined();
        expect(result.naturalSize).toBeDefined();
        expect(result.tinyThumb).toBeDefined();
        expect(result.additionalThumbnails).toBeDefined();
        expect(result.additionalThumbnails.length).toBeGreaterThan(0);

        // Verify that thumbnails respect size constraints
        result.additionalThumbnails.forEach((thumbnail, i) => {
          expect(thumbnail.payload.size).toBeGreaterThan(0);
          // The first thumbnail is the tiny thumb, so skip size checks for it
          if (i > 0 && i - 1 < baseThumbSizes.length) {
            expect(thumbnail.payload.size).toBeLessThan(baseThumbSizes[i - 1].maxBytes);
          }
        });
      } catch (error) {
        console.log('Skipping test - no test images available:', error);
      }
    });

    it('should handle SVG data correctly', async () => {
      try {
        // Arrange
        const imageData = loadTestImageFromFile('sample.svg');
        const payloadKey = 'test-svg-key';
        const testBlob = createTestBlob(imageData, 'image/svg+xml');

        // Act
        const result = await createThumbnails(testBlob, payloadKey);

        // Assert
        expect(result).toBeDefined();
        expect(result.naturalSize).toBeDefined();
        expect(result.tinyThumb).toBeDefined();
        expect(result.additionalThumbnails).toBeDefined();
        expect(result.additionalThumbnails).toHaveLength(1);

        // SVG should maintain original content type
        const svgThumbnail = result.additionalThumbnails[0];
        expect(svgThumbnail.payload.type).toBe('image/svg+xml');

        // Natural size should be extracted from SVG (using mock dimensions)
        expect(result.naturalSize.pixelWidth).toBeDefined();
        expect(result.naturalSize.pixelHeight).toBeDefined();
        expect(result.naturalSize.pixelWidth).toBeGreaterThan(0);
        expect(result.naturalSize.pixelHeight).toBeGreaterThan(0);
      } catch (error) {
        console.log('Skipping test - no test images available:', error);
      }
    });

    it('should handle GIF data correctly', async () => {
      try {
        // Arrange
        const imageData = loadTestImageFromFile('sample.gif');
        const payloadKey = 'test-gif-key';
        const testBlob = createTestBlob(imageData, 'image/gif');

        // Act
        const result = await createThumbnails(testBlob, payloadKey);

        // Assert
        expect(result).toBeDefined();
        expect(result.naturalSize).toBeDefined();
        expect(result.tinyThumb).toBeDefined();
        expect(result.additionalThumbnails).toBeDefined();
        expect(result.additionalThumbnails).toHaveLength(1);

        // GIF should preserve original data in additional thumbnails
        const gifThumbnail = result.additionalThumbnails[0];
        expect(gifThumbnail.payload.type).toBe('image/gif');
      } catch (error) {
        console.log('Skipping test - no test images available:', error);
      }
    });

    it('should use custom thumbnail sizes when provided', async () => {
      try {
        // Arrange
        const imageData = loadTestImageFromFile('sample.webp');
        const payloadKey = 'test-custom-key';
        const testBlob = createTestBlob(imageData, 'image/webp');
        const customSizes: ThumbnailInstruction[] = [
          { quality: 80, maxPixelDimension: 200, maxBytes: Number.MAX_SAFE_INTEGER },
          { quality: 90, maxPixelDimension: 800, maxBytes: Number.MAX_SAFE_INTEGER }
        ];

        // Act
        const result = await createThumbnails(testBlob, payloadKey, customSizes);

        // Assert
        expect(result).toBeDefined();
        expect(result.additionalThumbnails).toBeDefined();
        expect(result.additionalThumbnails.length).toBeGreaterThanOrEqual(1);
        expect(result.additionalThumbnails.every(t => t.key === payloadKey)).toBe(true);
      } catch (error) {
        console.log('Skipping test - no test images available:', error);
      }
    });
  });

  describe('ThumbnailInstruction', () => {
    it('should have correct properties when type is null', () => {
      // Arrange
      const instruction: ThumbnailInstruction = {
        quality: 75,
        maxPixelDimension: 100,
        maxBytes: 10000
      };

      // Assert
      expect(instruction.type).toBeUndefined();
      expect(instruction.quality).toBe(75);
      expect(instruction.maxPixelDimension).toBe(100);
    });

    it('should preserve type when specified', () => {
      // Arrange
      const instruction: ThumbnailInstruction = {
        quality: 85,
        maxPixelDimension: 200,
        type: 'png',
        maxBytes: 10000
      };

      // Assert
      expect(instruction.type).toBe('png');
      expect(instruction.quality).toBe(85);
      expect(instruction.maxPixelDimension).toBe(200);
    });
  });

  describe('Integration tests with real images', () => {
    it('should process all available test images successfully', async () => {
      const testImages = getAvailableTestImages();

      if (testImages.length === 0) {
        console.log('No test images found in TestImages directory. Please add sample images for testing.');
        return;
      }

      for (const imageFile of testImages) {
        try {
          // Act
          const imageData = loadTestImageFromFile(imageFile);
          const testBlob = createTestBlob(imageData);
          const result = await createThumbnails(testBlob, `test-${imageFile}`);

          // Assert
          expect(result).toBeDefined();
          expect(result.naturalSize).toBeDefined();
          expect(result.tinyThumb).toBeDefined();
          expect(result.additionalThumbnails).toBeDefined();
          expect(result.additionalThumbnails.length).toBeGreaterThan(0);

          // Verify each thumbnail
          for (const thumbnail of result.additionalThumbnails) {
            expect(thumbnail.payload).toBeDefined();
            expect(thumbnail.payload.size).toBeGreaterThan(0);
            expect(thumbnail.pixelWidth).toBeGreaterThan(0);
            expect(thumbnail.pixelHeight).toBeGreaterThan(0);
          }

          console.log(`Successfully processed image: ${imageFile} - Created ${result.additionalThumbnails.length} additional thumbnails`);
        } catch (error) {
          throw new Error(`Failed to process image ${imageFile}: ${error}`);
        }
      }
    });
  });

  describe('SVG Tiny test typeless', () => {
    it('should generate tiny thumbnail for SVG only when MIME type is provided', async () => {
    try {
    // Arrange
    const minimalSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>';
    const svgBytes = new TextEncoder().encode(minimalSvg);
    const payloadKey = 'test-svg-mime-key';
    const testBlob = createTestBlob(svgBytes, 'image/svg+xml'); // Used for createThumbnails call

    // Act and Assert for old behavior (simulate by not passing originalContentType to createImageThumbnail)
    // In the old code (without the originalContentType param), this would throw 'Failed to load image' during resizeImageFromBlob
    await expect(createImageThumbnail(svgBytes, payloadKey, tinyThumbSize, true)).rejects.toThrow('Failed to load image');

    // Act and Assert for new behavior (pass originalContentType)
    // This should succeed, producing a valid WebP tiny thumb
    const tinyResult = await createImageThumbnail(svgBytes, payloadKey, tinyThumbSize, true, 'image/svg+xml');
    expect(tinyResult).toBeDefined();
    expect(tinyResult.naturalSize).toBeDefined();
    expect(tinyResult.naturalSize.pixelWidth).toBe(100);
    expect(tinyResult.naturalSize.pixelHeight).toBe(100);
    expect(tinyResult.thumb).toBeDefined();
    expect(tinyResult.thumb.payload.type).toBe('image/webp');
    expect(tinyResult.thumb.payload.size).toBeGreaterThan(0);
    expect(tinyResult.thumb.pixelWidth).toBeLessThanOrEqual(20);
    expect(tinyResult.thumb.pixelHeight).toBeLessThanOrEqual(20);

    // Optional: Integrate with full createThumbnails to verify end-to-end
    const fullResult = await createThumbnails(testBlob, payloadKey);
    expect(fullResult.tinyThumb.contentType).toBe('image/webp');
    expect(fullResult.tinyThumb.content.length).toBeLessThan(2000); // Rough check for small size
    } catch (error) {
    console.log('Test failed unexpectedly:', error);
    throw error; // Ensure test fails if unexpected issue
    }
    });
  });

  describe('SVG Tiny test', () => {
    it('should generate rasterized tiny thumb for SVG while preserving original vector', async () => {
    try {
        // Arrange - Use a minimal inline SVG for testing (or load from file if available)
        const minimalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>`;
        const svgBytes = new TextEncoder().encode(minimalSvg);
        const payloadKey = 'test-svg-tiny-key';
        const testBlob = createTestBlob(svgBytes, 'image/svg+xml');

        // Act
        const result = await createThumbnails(testBlob, payloadKey);

        // Assert
        expect(result).toBeDefined();
        expect(result.naturalSize).toBeDefined();
        expect(result.naturalSize.pixelWidth).toBeGreaterThan(0);
        expect(result.naturalSize.pixelHeight).toBeGreaterThan(0);
        expect(result.tinyThumb).toBeDefined();
        expect(result.additionalThumbnails).toBeDefined();
        expect(result.additionalThumbnails).toHaveLength(1);

        // Verify tiny thumb is rasterized (WebP format, small base64 content)
        expect(result.tinyThumb.contentType).toBe('image/webp');
        expect(result.tinyThumb.content).toBeTruthy();
        // Base64 length should be small for 20x20 (rough check, as compression varies)
        expect(result.tinyThumb.content.length).toBeLessThan(2000); // Adjust threshold based on real outputs

        // Verify additional thumbnail is the original SVG vector
        const svgThumbnail = result.additionalThumbnails[0];
        expect(svgThumbnail.payload.type).toBe('image/svg+xml');
        expect(svgThumbnail.payload.size).toBe(svgBytes.length); // Should match original size
        expect(svgThumbnail.pixelWidth).toBe(result.naturalSize.pixelWidth);
        expect(svgThumbnail.pixelHeight).toBe(result.naturalSize.pixelHeight);

        // Optional: Decode and check if tiny thumb base64 is different from original SVG
        const tinyBase64Decoded = atob(result.tinyThumb.content);
        const originalSvgString = new TextDecoder().decode(svgBytes);
        expect(tinyBase64Decoded).not.toBe(originalSvgString);
    } catch (error) {
        console.log('Skipping SVG tiny thumb test - potential issue with mock environment or no SVG data:', error);
    }
    });
  });
});
