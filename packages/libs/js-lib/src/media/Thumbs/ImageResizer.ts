/**
 * Code origniates from: https://github.com/alefduarte/image-resize-compress
 * All Licensing reserved to the author @alefduarte
 *
 * Code was integrated directly to allow modification to the return value to return
 * the natural sizing of the image as well. This also allows us to only include what we need,
 * as the original library isn't exported as indivual modules
 */

/**
 * @typedef {Object} Size
 * @property {number} width - Image width
 * @property {number} height - Image height
 */

/**
 * returns the mime type given a string
 *
 * @param {string} format - image format [png, webp, bmp, jpeg, gif].
 * @returns {string} returns mime type - if no valid format returns jpeg
 */
const getMimeType = (format: 'png' | 'webp' | 'bmp' | 'jpeg' | 'gif' | null) => {
  if (format === 'png') {
    return 'image/png';
  }
  if (format === 'webp') {
    return 'image/webp';
  }
  if (format === 'bmp') {
    return 'image/bmp';
  }
  if (format === 'gif') {
    return 'image/gif';
  }
  return 'image/jpeg';
};

/**
 * Get the width and height of image
 *
 * @param {Object} img - Image file for width and height reference
 * @param {number} img.naturalHeight - Original image height.
 * @param {number} img.naturalWidth - Original image width.
 * @param {(number | string)} maxWidth - Desired image width. If string will calculate based on height scale
 * @param {(number | string)} maxHeight - Desired image height. If string will calculate based on width scale
 * @returns {Size} Returns the image width and height
 */

export const getTargetSize = (
  img: { naturalWidth: number; naturalHeight: number },
  maxWidth: number | undefined,
  maxHeight: number | undefined
) => {
  const { naturalWidth, naturalHeight } = img;

  if (!maxWidth || !maxHeight) return { width: naturalWidth, height: naturalHeight };

  const originalAspectRatio = naturalWidth / naturalHeight;
  const targetAspectRatio = maxWidth / maxHeight;

  let outputWidth, outputHeight;

  if (originalAspectRatio > targetAspectRatio) {
    outputWidth = Math.min(naturalWidth, maxWidth);
    outputHeight = outputWidth / originalAspectRatio;
  } else {
    outputHeight = Math.min(naturalHeight, maxHeight);
    outputWidth = outputHeight * originalAspectRatio;
  }

  return { width: Math.ceil(outputWidth), height: Math.ceil(outputHeight) };
};

type ImageFormat = 'png' | 'webp' | 'bmp' | 'jpeg' | 'gif';
type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export interface DecodedImage {
  source: CanvasImageSource;
  naturalWidth: number;
  naturalHeight: number;
  /** Frees the decoded bitmap; call it once done drawing */
  close: () => void;
}

const loadImageElement = (imgBlob: Blob): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(imgBlob);
    reader.onload = () => {
      const img = new Image();
      if (!reader.result || typeof reader.result !== 'string') {
        reject(new Error('Failed to read image data'));
        return;
      }
      img.src = reader.result;
      img.onload = () => resolve(img);
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read blob'));
    };
  });

/**
 * Decode an image blob, honouring EXIF orientation. Uses createImageBitmap where available
 * (it also works in a worker), else an image element.
 */
export const decodeImage = async (imgBlob: Blob): Promise<DecodedImage> => {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(imgBlob, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        naturalWidth: bitmap.width,
        naturalHeight: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Not decodable as a bitmap (e.g. SVG in Chrome): fall back to an image element
    }
  }
  const img = await loadImageElement(imgBlob);
  return {
    source: img,
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    close: () => undefined,
  };
};

const createCanvas = (width: number, height: number): AnyCanvas => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

/** Shrinks a canvas to nothing so iOS can reclaim its memory straight away */
export const releaseCanvas = (canvas: AnyCanvas) => {
  canvas.width = 0;
  canvas.height = 0;
};

/**
 * Draw an image onto a new canvas of the given size
 */
export const drawImageToCanvas = (
  image: DecodedImage,
  size: { width: number; height: number },
  isTinyThumb: boolean = false
): AnyCanvas => {
  const canvas = createCanvas(size.width, size.height);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new Error('Failed to get canvas context');

  // For tiny thumbs, apply some optimization (simplified version of quantization)
  if (isTinyThumb) {
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = 'low';
  } else {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  ctx.drawImage(image.source, 0, 0, size.width, size.height);
  return canvas;
};

const canvasToBlob = async (canvas: AnyCanvas, mimeType: string, quality: number): Promise<Blob> => {
  const blob =
    'convertToBlob' in canvas
      ? await canvas.convertToBlob({ type: mimeType, quality })
      : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));
  if (!blob) throw new Error('Failed to create blob from canvas');
  return blob.type ? blob : new Blob([blob], { type: mimeType });
};

let webpEncodeSupport: Promise<boolean> | undefined;
/**
 * Whether this browser can encode webp; Safari can't and silently returns png instead.
 * Detected once and cached.
 */
export const canEncodeWebp = (): Promise<boolean> =>
  (webpEncodeSupport ??= (async () => {
    const canvas = createCanvas(1, 1);
    try {
      return (await canvasToBlob(canvas, 'image/webp', 0.8)).type === 'image/webp';
    } catch {
      return false;
    } finally {
      releaseCanvas(canvas);
    }
  })());

/**
 * Encode a canvas in the given format and quality (1-100).
 * Webp is encoded as jpeg where the browser can't encode webp, as its png fallback ignores quality.
 */
export const encodeCanvas = async (
  canvas: AnyCanvas,
  format: ImageFormat,
  quality: number
): Promise<Blob> => {
  const outputFormat = format === 'webp' && !(await canEncodeWebp()) ? 'jpeg' : format;
  return canvasToBlob(canvas, getMimeType(outputFormat), quality < 1 ? quality : quality / 100);
};

/**
 * Compress, resize or convert a blob type image
 *
 * @param {(File|Blob)} imgBlob The image blob file that will be manipulated.
 * @param {number} [quality=100] Image quality for conversion of jpeg and png formats. Default value is 100.
 * @param {(number | string)} [width=0] Desired image width. If empty will use original width. If "auto", will calculate based on height scale
 * @param {(number | string)} [height=0] Desired image height. If empty will use original width. If "auto", will calculate based on width scale
 * @param {string} [format=null] image format [png, webp, bmp, jpeg, gif]. If null will use webp (jpeg where the browser can't encode webp)
 * @returns {Promise} Returns promise with compressed, resized and converted image.
 */

export const resizeImageFromBlob = (
  imgBlob: Blob,
  quality = 100,
  width?: number,
  height?: number,
  format: ImageFormat | null = null,
  isTinyThumb: boolean = false,
  maxBytes?: number
): Promise<{
  naturalSize: { width: number; height: number };
  size: { width: number; height: number };
  blob: Blob;
}> => {
  if (!(imgBlob instanceof Blob)) {
    throw new TypeError(`Expected blob or file! ${typeof imgBlob} given!`);
  }
  if (quality <= 0 || quality > 100) {
    throw new RangeError('Quality must be between 1 and 100!');
  }

  return (async () => {
    const outputFormat = format || 'webp';
    const image = await decodeImage(imgBlob);
    try {
      const naturalSize = { width: image.naturalWidth, height: image.naturalHeight };
      const imageTargetSize = { width: width || naturalSize.width, height: height || naturalSize.height };
      const targetFinalSize = getTargetSize(image, imageTargetSize.width, imageTargetSize.height);

      // Check if we can return original image unmodified
      if (targetFinalSize.width === naturalSize.width &&
        targetFinalSize.height === naturalSize.height &&
        imgBlob.type === getMimeType(outputFormat) &&
        maxBytes && imgBlob.size <= maxBytes) {
        return { naturalSize, size: targetFinalSize, blob: imgBlob };
      }

      const canvas = drawImageToCanvas(image, targetFinalSize, isTinyThumb);
      try {
        return { naturalSize, size: targetFinalSize, blob: await encodeCanvas(canvas, outputFormat, quality) };
      } finally {
        releaseCanvas(canvas);
      }
    } finally {
      image.close();
    }
  })();
};
