import { stringToUint8Array } from './DataUtil';

const reduceSha256Hash = async (buffer: Uint8Array) => {
  const hash = await crypto.subtle.digest('SHA-256', buffer);

  /// Reduce SHA256Hash to 128 bits
  const hashBuffer = new Uint8Array(hash);
  const reducedHashBuffer = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    reducedHashBuffer[i] = (hashBuffer[i] || 0) ^ (hashBuffer[i + 16] || 0);
  }

  return reducedHashBuffer;
};

const xorByteArrays = (a: Uint8Array, b: Uint8Array) => {
  if (!a || !b) {
    throw new Error('Both byte arrays must be non-empty');
  }
  const maxLength = Math.max(a.length, b.length);
  const resultBuffer = new Uint8Array(maxLength);

  for (let i = 0; i < maxLength; i++) {
    resultBuffer[i] = (a[i] || 0) ^ (b[i] || 0);
  }

  return resultBuffer;
};

const uint8ArrayToGuid = (buffer: Uint8Array) => {
  const byteArray = Array.from(buffer);

  // Set the version to 4 (random)
  byteArray[6] = (byteArray[6] & 0x0f) | 0x40;
  // Set the variant to RFC4122
  byteArray[8] = (byteArray[8] & 0x3f) | 0x80;

  // Convert to hex string with dashes
  const guidString = byteArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');

  // Insert dashes at appropriate positions
  return (
    guidString.substring(0, 8) +
    '-' +
    guidString.substring(8, 12) +
    '-' +
    guidString.substring(12, 16) +
    '-' +
    guidString.substring(16, 20) +
    '-' +
    guidString.substring(20)
  );
};

export const getNewXorId = async (a: string, b: string) => {
  if (!a || !b) {
    throw new Error('Both strings must be non-empty');
  }

  const bufferA = await reduceSha256Hash(stringToUint8Array(a.toLowerCase()));
  const bufferB = await reduceSha256Hash(stringToUint8Array(b.toLowerCase()));

  const xorBuffer = xorByteArrays(bufferA, bufferB);

  const conversationIdHashReduced = await reduceSha256Hash(xorBuffer);
  return uint8ArrayToGuid(conversationIdHashReduced);
};
