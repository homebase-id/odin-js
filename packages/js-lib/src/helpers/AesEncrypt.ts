import { mergeByteArrays } from './DataUtil';

const importKey = async (key: Uint8Array) => {
  return crypto.subtle.importKey(
    'raw',
    key,
    {
      name: 'AES-CBC',
    },
    false,
    ['encrypt', 'decrypt']
  );
};

const innerEncrypt = async (iv: Uint8Array, key: CryptoKey, data: Uint8Array) => {
  const cipher = await crypto.subtle.encrypt(
    {
      name: 'AES-CBC',
      iv: iv,
    },
    key, //from generateKey or importKey above
    data //ArrayBuffer of data you want to encrypt
  );

  return new Uint8Array(cipher);
};

const innerDecrypt = async (iv: Uint8Array, key: CryptoKey, data: Uint8Array) => {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-CBC',
      iv: iv,
    },
    key, //from generateKey or importKey above
    data //ArrayBuffer of data you want to encrypt
  );

  return new Uint8Array(decrypted);
};

export const cbcEncrypt = async (
  data: Uint8Array,
  iv: Uint8Array,
  key: Uint8Array
): Promise<Uint8Array> => {
  const importedKey = await importKey(key);
  return await innerEncrypt(iv, importedKey, data);
};

export const cbcDecrypt = async (
  cipher: Uint8Array,
  iv: Uint8Array,
  key: Uint8Array
): Promise<Uint8Array> => {
  const importedKey = await importKey(key);
  return await innerDecrypt(iv, importedKey, cipher);
};

export const streamEncryptWithCbc = async (
  dataStream: ReadableStream<Uint8Array>,
  key: Uint8Array,
  iv: Uint8Array
) => {
  const subtleKey = await importKey(key);
  const BLOCK_SIZE = 16;

  function encryptStream() {
    let lastBlock: Uint8Array | undefined;
    let lastPadding: Uint8Array | undefined;

    return new TransformStream<Uint8Array, Uint8Array>(
      {
        // Assumed that each chunk (apart from last one) is a multiple of 16 bytes
        async transform(chunk, controller) {
          // Encrypt with iv or previous block as iv
          const encrypted = await innerEncrypt(lastBlock || iv, subtleKey, chunk);

          // Get padding
          lastPadding = encrypted.slice(encrypted.length - BLOCK_SIZE);

          // Remove padding
          const removedPadding = encrypted.slice(0, encrypted.length - BLOCK_SIZE);

          // Get last block
          lastBlock = removedPadding.slice(removedPadding.length - BLOCK_SIZE);

          controller.enqueue(removedPadding);
        },
        async flush(controller) {
          // Re-add last padding to have a clear end of the stream
          controller.enqueue(lastPadding);
          controller.terminate();
        },
      },
      undefined,
      { highWaterMark: 64 } // Highwatermark should set the chunkSize to a multiple of 16 bytes
    );
  }

  return dataStream.pipeThrough(encryptStream());
};

export const streamDecryptWithCbc = async (
  dataStream: ReadableStream<Uint8Array>,
  key: Uint8Array,
  iv: Uint8Array
) => {
  const subtleKey = await importKey(key);

  const padding = new Uint8Array(16).fill(16);
  const BLOCK_SIZE = 16;

  function decryptStream() {
    let lastBlock: Uint8Array | undefined;

    return new TransformStream<Uint8Array, Uint8Array>(
      {
        // Assumed that each chunk (apart from last one) is a multiple of 16 bytes
        async transform(chunk, controller) {
          const encryptedPadding = (
            await innerEncrypt(chunk.slice(chunk.length - 16), subtleKey, padding)
          ).slice(0, 16);

          let decrypted: Uint8Array | undefined;
          try {
            decrypted = await innerDecrypt(
              lastBlock || iv,
              subtleKey,
              mergeByteArrays([chunk, encryptedPadding])
            );
          } catch {
            // Will fail if it contains the last block, so try again without padding
            decrypted = await innerDecrypt(lastBlock || iv, subtleKey, chunk);
          }

          // Get last block
          lastBlock = chunk.slice(chunk.length - BLOCK_SIZE);

          controller.enqueue(decrypted);
        },
        async flush(controller) {
          controller.terminate();
        },
      },
      undefined,
      { highWaterMark: 64 } // Highwatermark should set the chunkSize to a multiple of 16 bytes
    );
  }

  return dataStream.pipeThrough(decryptStream());
};
