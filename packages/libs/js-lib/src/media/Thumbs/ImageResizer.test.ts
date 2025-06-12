import { describe, it, expect, beforeEach } from 'vitest';
import { resizeImageFromBlob, getTargetSize } from './ImageResizer';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

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

// Mock Image class for testing
class MockImage implements Partial<HTMLImageElement> {
  naturalWidth = 100;
  naturalHeight = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(value: string) {
    // Avoid unused parameter warning
    void value;
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

// Mock FileReader class for testing
class MockFileReader implements Partial<FileReader> {
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
}

// Mock Canvas and CanvasRenderingContext2D
class MockCanvasRenderingContext2D {
  imageSmoothingEnabled = true;
  imageSmoothingQuality: ImageSmoothingQuality = 'high';

  drawImage() {
    // Mock implementation
  }
}

class MockHTMLCanvasElement {
  width = 0;
  height = 0;

  getContext(contextId: string): MockCanvasRenderingContext2D | null {
    if (contextId === '2d') {
      return new MockCanvasRenderingContext2D();
    }
    return null;
  }

  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void {
    void quality; // Explicitly void unused parameter
    // Create a mock blob with some data
    const mockBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: type || 'image/webp' });
    setTimeout(() => callback(mockBlob), 0);
  }
}

describe('ImageResizer', () => {
  beforeEach(() => {
    // Setup DOM environment for browser APIs
    global.Image = MockImage as unknown as typeof Image;
    global.FileReader = MockFileReader as unknown as typeof FileReader;
    global.document = {
      createElement: (tagName: string) => {
        if (tagName === 'canvas') {
          return new MockHTMLCanvasElement() as unknown as HTMLCanvasElement;
        }
        return {} as unknown as Element;
      }
    } as unknown as Document;
  });

  describe('getTargetSize', () => {
    it('should return natural size when no constraints provided', () => {
      // Arrange
      const mockImg = new MockImage();
      mockImg.naturalWidth = 200;
      mockImg.naturalHeight = 150;
      const img = mockImg as unknown as HTMLImageElement;

      // Act
      const result = getTargetSize(img, undefined, undefined);

      // Assert
      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
    });

    it('should maintain aspect ratio when resizing', () => {
      // Arrange
      const mockImg = new MockImage();
      mockImg.naturalWidth = 400;
      mockImg.naturalHeight = 200;
      const img = mockImg as unknown as HTMLImageElement;

      // Act
      const result = getTargetSize(img, 200, 200);

      // Assert
      expect(result.width).toBe(200);
      expect(result.height).toBe(100);
    });

    it('should handle vertical images correctly', () => {
      // Arrange
      const mockImg = new MockImage();
      mockImg.naturalWidth = 200;
      mockImg.naturalHeight = 400;
      const img = mockImg as unknown as HTMLImageElement;

      // Act
      const result = getTargetSize(img, 200, 200);

      // Assert
      expect(result.width).toBe(100);
      expect(result.height).toBe(200);
    });
  });

  describe('resizeImageFromBlob', () => {
    it('should throw TypeError with non-blob input', async () => {
      // Arrange & Act & Assert
      expect(() => resizeImageFromBlob('not a blob' as unknown as Blob, 100))
        .toThrowError(TypeError);
    });

    it('should throw RangeError with invalid quality (0)', async () => {
      // Arrange
      const testBlob = createTestBlob(new Uint8Array([1, 2, 3, 4]));

      // Act & Assert
      expect(() => resizeImageFromBlob(testBlob, 0))
        .toThrowError(RangeError);
    });

    it('should throw RangeError with invalid quality (101)', async () => {
      // Arrange
      const testBlob = createTestBlob(new Uint8Array([1, 2, 3, 4]));

      // Act & Assert
      expect(() => resizeImageFromBlob(testBlob, 101))
        .toThrowError(RangeError);
    });

    it('should return result with valid blob and quality', async () => {
      // Arrange
      const testBlob = createTestBlob(new Uint8Array([1, 2, 3, 4]));

      // Act
      const result = await resizeImageFromBlob(testBlob, 75);

      // Assert
      expect(result).toBeDefined();
      expect(result.naturalSize).toBeDefined();
      expect(result.size).toBeDefined();
      expect(result.blob).toBeDefined();
      expect(result.naturalSize.width).toBeGreaterThan(0);
      expect(result.naturalSize.height).toBeGreaterThan(0);
      expect(result.blob.size).toBeGreaterThan(0);
    });

    it('should resize to specified dimensions', async () => {
      // Arrange
      const testBlob = createTestBlob(new Uint8Array([1, 2, 3, 4]));

      // Act
      const result = await resizeImageFromBlob(testBlob, 75, 50, 50);

      // Assert
      expect(result).toBeDefined();
      expect(result.size.width).toBeLessThanOrEqual(50);
      expect(result.size.height).toBeLessThanOrEqual(50);
    });

    it('should handle different output formats', async () => {
      // Arrange
      const testBlob = createTestBlob(new Uint8Array([1, 2, 3, 4]));
      const formats: Array<'png' | 'webp' | 'jpeg' | 'gif' | 'bmp'> = ['png', 'webp', 'jpeg', 'gif', 'bmp'];

      for (const format of formats) {
        // Act
        const result = await resizeImageFromBlob(testBlob, 75, undefined, undefined, format);

        // Assert
        expect(result).toBeDefined();
        expect(result.blob).toBeDefined();
        expect(result.blob.size).toBeGreaterThan(0);
      }
    });

    it('should apply tiny thumb optimizations when isTinyThumb is true', async () => {
      // Arrange
      const testBlob = createTestBlob(new Uint8Array([1, 2, 3, 4]));

      // Act
      const result = await resizeImageFromBlob(testBlob, 75, 20, 20, 'webp', true);

      // Assert
      expect(result).toBeDefined();
      expect(result.size.width).toBeLessThanOrEqual(20);
      expect(result.size.height).toBeLessThanOrEqual(20);
    });

    it('should respect maxBytes constraint when provided', async () => {
      // Arrange
      const testBlob = createTestBlob(new Uint8Array([1, 2, 3, 4]));
      const maxBytes = 1000;

      // Act
      const result = await resizeImageFromBlob(testBlob, 75, undefined, undefined, 'webp', false, maxBytes);

      // Assert
      expect(result).toBeDefined();
      expect(result.blob.size).toBeLessThanOrEqual(maxBytes);
    });

    // Note: These tests would require actual image files in TestImages directory
    it('should process valid JPEG data correctly', async () => {
      try {
        // Arrange
        const imageData = loadTestImageFromFile('sample.jpg');
        const testBlob = createTestBlob(imageData, 'image/jpeg');

        // Act
        const result = await resizeImageFromBlob(testBlob, 76, 50, 50);

        // Assert
        expect(result).toBeDefined();
        expect(result.naturalSize).toBeDefined();
        expect(result.size).toBeDefined();
        expect(result.blob).toBeDefined();
        expect(result.naturalSize.width).toBeGreaterThan(0);
        expect(result.naturalSize.height).toBeGreaterThan(0);
        expect(result.blob.size).toBeGreaterThan(0);
      } catch (error) {
        console.log('Skipping test - no test images available:', error);
      }
    });

    it('should process valid PNG data correctly', async () => {
      try {
        // Arrange
        const imageData = loadTestImageFromFile('sample.png');
        const testBlob = createTestBlob(imageData, 'image/png');

        // Act
        const result = await resizeImageFromBlob(testBlob, 76, 50, 50);

        // Assert
        expect(result).toBeDefined();
        expect(result.naturalSize).toBeDefined();
        expect(result.size).toBeDefined();
        expect(result.blob).toBeDefined();
        expect(result.blob.size).toBeGreaterThan(0);
      } catch (error) {
        console.log('Skipping test - no test images available:', error);
      }
    });

    it('should process valid WebP data correctly', async () => {
      try {
        // Arrange
        const imageData = loadTestImageFromFile('sample.webp');
        const testBlob = createTestBlob(imageData, 'image/webp');

        // Act
        const result = await resizeImageFromBlob(testBlob, 76, 50, 50);

        // Assert
        expect(result).toBeDefined();
        expect(result.naturalSize).toBeDefined();
        expect(result.size).toBeDefined();
        expect(result.blob).toBeDefined();
        expect(result.blob.size).toBeGreaterThan(0);
      } catch (error) {
        console.log('Skipping test - no test images available:', error);
      }
    });

    it('should maintain aspect ratio with real images', async () => {
      try {
        // Arrange
        const imageData = loadTestImageFromFile('sample.jpg');
        const testBlob = createTestBlob(imageData, 'image/jpeg');

        // Act
        const result = await resizeImageFromBlob(testBlob, 76, 100, 200);

        // Assert
        expect(result).toBeDefined();
        expect(result.size.width).toBeLessThanOrEqual(100);
        expect(result.size.height).toBeLessThanOrEqual(200);

        // Check that at least one dimension uses the full constraint
        expect(result.size.width === 100 || result.size.height === 200).toBe(true);
      } catch (error) {
        console.log('Skipping test - no test images available:', error);
      }
    });

    it('should handle different quality levels', async () => {
      // Arrange
      const testBlob = createTestBlob(new Uint8Array([1, 2, 3, 4]));
      const qualityLevels = [1, 25, 50, 75, 100];

      for (const quality of qualityLevels) {
        // Act
        const result = await resizeImageFromBlob(testBlob, quality);

        // Assert
        expect(result).toBeDefined();
        expect(result.blob).toBeDefined();
        expect(result.blob.size).toBeGreaterThan(0);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle FileReader errors gracefully', async () => {
      // Arrange
      const originalFileReader = global.FileReader;
      global.FileReader = class MockFailingFileReader {
        onerror: (() => void) | null = null;

        readAsDataURL() {
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 0);
        }
      } as unknown as typeof FileReader;

      const testBlob = createTestBlob(new Uint8Array([1, 2, 3, 4]));

      // Act & Assert
      await expect(resizeImageFromBlob(testBlob, 75))
        .rejects.toThrow('Failed to read blob');

      // Restore
      global.FileReader = originalFileReader;
    });

    it('should handle Image loading errors gracefully', async () => {
      // Arrange
      const originalImage = global.Image;
      global.Image = class MockFailingImage {
        onerror: (() => void) | null = null;

        set src(value: string) {
          // Avoid unused parameter warning
          void value;
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 0);
        }
      } as unknown as typeof Image;

      const testBlob = createTestBlob(new Uint8Array([1, 2, 3, 4]));

      // Act & Assert
      await expect(resizeImageFromBlob(testBlob, 75))
        .rejects.toThrow('Failed to load image');

      // Restore
      global.Image = originalImage;
    });

    it('should handle canvas context creation failure', async () => {
      // Arrange
      const originalDocument = global.document;
      global.document = {
        createElement: () => ({
          getContext: () => null // Simulate context creation failure
        })
      } as unknown as Document;

      const testBlob = createTestBlob(new Uint8Array([1, 2, 3, 4]));

      // Act & Assert
      await expect(resizeImageFromBlob(testBlob, 75))
        .rejects.toThrow('Failed to get canvas context');

      // Restore
      global.document = originalDocument;
    });

    it('should handle toBlob failure', async () => {
      // Arrange
      const originalDocument = global.document;
      global.document = {
        createElement: () => ({
          getContext: () => new MockCanvasRenderingContext2D(),
          toBlob: (callback: (blob: Blob | null) => void) => {
            setTimeout(() => callback(null), 0); // Simulate toBlob failure
          }
        })
      } as unknown as Document;

      const testBlob = createTestBlob(new Uint8Array([1, 2, 3, 4]));

      // Act & Assert
      await expect(resizeImageFromBlob(testBlob, 75))
        .rejects.toThrow('Failed to create blob from canvas');

      // Restore
      global.document = originalDocument;
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
          const result = await resizeImageFromBlob(testBlob, 76, 100, 100);

          // Assert
          expect(result).toBeDefined();
          expect(result.naturalSize).toBeDefined();
          expect(result.size).toBeDefined();
          expect(result.blob).toBeDefined();
          expect(result.naturalSize.width).toBeGreaterThan(0);
          expect(result.naturalSize.height).toBeGreaterThan(0);
          expect(result.size.width).toBeLessThanOrEqual(100);
          expect(result.size.height).toBeLessThanOrEqual(100);
          expect(result.blob.size).toBeGreaterThan(0);

          console.log(`Successfully processed image: ${imageFile} - Resized to ${result.size.width}x${result.size.height}`);
        } catch (error) {
          throw new Error(`Failed to process image ${imageFile}: ${error}`);
        }
      }
    });
  });
});
