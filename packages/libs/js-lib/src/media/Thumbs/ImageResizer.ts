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
  img: HTMLImageElement,
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

/**
 * Compress, resize or convert a blob type image
 *
 * @param {(File|Blob)} imgBlob The image blob file that will be manipulated.
 * @param {number} [quality=100] Image quality for conversion of jpeg and png formats. Default value is 100.
 * @param {(number | string)} [width=0] Desired image width. If empty will use original width. If "auto", will calculate based on height scale
 * @param {(number | string)} [height=0] Desired image height. If empty will use original width. If "auto", will calculate based on width scale
 * @param {string} [format=null] image format [png, webp, bmp, jpeg, gif]. If null will use original format
 * @returns {Promise} Returns promise with compressed, resized and converted image.
 */

export const resizeImageFromBlob = (
  imgBlob: Blob,
  quality = 100,
  width?: number,
  height?: number,
  format: 'png' | 'webp' | 'bmp' | 'jpeg' | 'gif' | null = null,
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

  return new Promise((resolve, reject) => {
    const outputFormat = format || 'webp';
    const mimeType = getMimeType(outputFormat);
    const imgQuality = quality < 1 ? quality : quality / 100;

    const reader = new FileReader();
    reader.readAsDataURL(imgBlob);
    reader.onload = () => {
      const img = new Image();
      if (!reader.result || typeof reader.result !== 'string') {
        reject(new Error('Failed to read image data'));
        return;
      }
      img.src = reader.result;
      img.onload = () => {
        const naturalSize = { width: img.naturalWidth, height: img.naturalHeight };
        const imageTargetSize = { width: width || naturalSize.width, height: height || naturalSize.height };
        const targetFinalSize = getTargetSize(img, imageTargetSize.width, imageTargetSize.height);

        // Check if we can return original image unmodified
        if (targetFinalSize.width === naturalSize.width &&
          targetFinalSize.height === naturalSize.height &&
          imgBlob.type === mimeType &&
          maxBytes && imgBlob.size <= maxBytes) {
          resolve({
            naturalSize,
            size: targetFinalSize,
            blob: imgBlob
          });
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetFinalSize.width;
        canvas.height = targetFinalSize.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // For tiny thumbs, apply some optimization (simplified version of quantization)
        if (isTinyThumb) {
          ctx.imageSmoothingEnabled = false;
          ctx.imageSmoothingQuality = 'low';
        } else {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }

        ctx.drawImage(img, 0, 0, targetFinalSize.width, targetFinalSize.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }

            resolve({
              naturalSize,
              size: targetFinalSize,
              blob: new Blob([blob], { type: mimeType })
            });
          },
          mimeType,
          imgQuality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read blob'));
    };
  });
};
