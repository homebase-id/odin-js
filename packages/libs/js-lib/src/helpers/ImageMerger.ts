import { base64ToUint8Array, uint8ArrayToBase64 } from './DataUtil';
import { EmbeddedThumb } from '../core/DriveData/File/DriveFileTypes';
const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;

const GRID_PIXEL_SIZE = 20;
const IMAGE_SIZE = GRID_PIXEL_SIZE / 2;
const MIME_TYPE = 'image/webp';

export const makeGrid = async (thumbs: EmbeddedThumb[]) => {
  if (typeof document === 'undefined')
    throw new Error('makeGrid is only supported in a browser environment');

  if (thumbs.length < 2) {
    throw new Error('Making grid of less than 2 images is not supported');
  }
  const blobs = thumbs.slice(0, 4).map((thumb) => {
    const buffer = base64ToUint8Array(thumb.content);
    return new OdinBlob([buffer], { type: thumb.contentType });
  });

  const imgs = await Promise.all(
    blobs.map(
      (imgBlob) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(imgBlob);
          reader.onload = () => {
            const img = new Image();
            if (!reader.result || typeof reader.result !== 'string') {
              reject();
              return;
            }
            img.src = reader.result;
            img.onload = () => {
              resolve(img);
            };
          };
        })
    )
  );

  const canvas = document.createElement('canvas');
  canvas.width = GRID_PIXEL_SIZE;
  canvas.height = imgs.length > 2 ? GRID_PIXEL_SIZE : GRID_PIXEL_SIZE / 2;

  const context2d = canvas.getContext('2d');
  if (!context2d) {
    throw new Error('grid failed');
  }

  context2d.drawImage(imgs[0], 0, 0, IMAGE_SIZE, IMAGE_SIZE);
  context2d.drawImage(imgs[1], IMAGE_SIZE * 1, 0, IMAGE_SIZE, IMAGE_SIZE);
  if (imgs[2]) {
    context2d.drawImage(imgs[2], 0, IMAGE_SIZE * 1, IMAGE_SIZE, IMAGE_SIZE);
  }
  if (imgs[3]) {
    context2d.drawImage(imgs[3], IMAGE_SIZE * 1, IMAGE_SIZE * 1, IMAGE_SIZE, IMAGE_SIZE);
  }

  return await new Promise<EmbeddedThumb>((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        blob.arrayBuffer().then((buffer) => {
          resolve({
            pixelWidth: GRID_PIXEL_SIZE,
            pixelHeight: imgs.length > 2 ? GRID_PIXEL_SIZE : GRID_PIXEL_SIZE / 2,
            contentType: MIME_TYPE,
            content: uint8ArrayToBase64(new Uint8Array(buffer)),
          });
        });
      },
      MIME_TYPE,
      10
    );
  });
};
