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


// Utility to open the IndexedDB database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("blob-storage", 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    store.put(blob, key);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getBlob(key: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readonly");
    const store = tx.objectStore("files");
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result instanceof Blob ? result : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteBlob(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    store.delete(key);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
