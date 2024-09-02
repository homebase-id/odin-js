import { mergeByteArrays } from './DataUtil';

const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;

export const streamToByteArray = async (stream: ReadableStream<Uint8Array>, mimeType: string) => {
  if (mimeType != null && typeof mimeType !== 'string') {
    throw new Error('Invalid mimetype, expected string.');
  }

  const chunks = [];
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (value) chunks.push(value);
    if (done) {
      return mergeByteArrays(chunks);
    }
  }
};

// Built purely for better support on react-native
export const getSecuredBlob = async (
  blobParts?: BlobPart[] | undefined,
  options?: BlobPropertyBag
) => {
  const returnBlob = new OdinBlob(blobParts, options);

  await new Promise<void>((resolve) => {
    if (!('written' in returnBlob)) resolve();

    const interval = setInterval(async () => {
      if ('written' in returnBlob && returnBlob.written) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });

  return returnBlob as Blob;
};
