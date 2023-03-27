import { DotYouClient } from '../DotYouClient';
import { cbcDecrypt, cbcEncrypt } from '../helpers/AesEncrypt';
import { base64ToUint8Array, byteArrayToString, jsonStringify64 } from '../helpers/DataUtil';
import { EncryptedKeyHeader, FileMetadata, KeyHeader } from './DriveTypes';

/// Encryption
export const encryptKeyHeader = async (
  dotYouClient: DotYouClient,
  keyHeader: KeyHeader,
  transferIv: Uint8Array
): Promise<EncryptedKeyHeader> => {
  const ss = dotYouClient.getSharedSecret();
  if (!ss) {
    throw new Error('attempting to encrypt but missing the shared secret');
  }
  const combined = [...Array.from(keyHeader.iv), ...Array.from(keyHeader.aesKey)];
  const cipher = await cbcEncrypt(new Uint8Array(combined), transferIv, ss);

  return {
    iv: transferIv,
    encryptedAesKey: cipher,
    encryptionVersion: 1,
    type: 11,
  };
};

export const encryptWithKeyheader = async (
  content: Uint8Array | File,
  keyHeader: KeyHeader
): Promise<Uint8Array> => {
  if (content instanceof File) {
    throw new Error('Cannot upload a file with a key header');
    // const encryptedStream = await streamEncryptWithCbc(
    //   content.stream(),
    //   keyHeader.aesKey,
    //   keyHeader.iv
    // );
    // new File([encryptedStream], content.name, { type: content.type });
  }

  const cipher = await cbcEncrypt(content, keyHeader.iv, keyHeader.aesKey);
  return cipher;
};

export const encryptWithSharedSecret = async (
  dotYouClient: DotYouClient,
  o: unknown,
  iv: Uint8Array
): Promise<Uint8Array> => {
  //encrypt metadata with shared secret
  const ss = dotYouClient.getSharedSecret();
  const json = jsonStringify64(o);

  if (!ss) {
    throw new Error('attempting to decrypt but missing the shared secret');
  }

  const content = new TextEncoder().encode(json);
  const cipher = await cbcEncrypt(content, iv, ss);
  return cipher;
};

/// Decryption
export const decryptJsonContent = async <T>(
  fileMetaData: FileMetadata,
  keyheader: KeyHeader | undefined
): Promise<T> => {
  if (keyheader) {
    try {
      const cipher = base64ToUint8Array(fileMetaData.appData.jsonContent);
      const json = byteArrayToString(await decryptUsingKeyHeader(cipher, keyheader));

      return JSON.parse(json);
    } catch (err) {
      console.error('[DotYouCore-js]', 'Json Content Decryption failed. Trying to only parse JSON');
    }
  }

  return JSON.parse(fileMetaData.appData.jsonContent);
};

export const decryptUsingKeyHeader = async (
  cipher: Uint8Array,
  keyHeader: KeyHeader
): Promise<Uint8Array> => {
  return await cbcDecrypt(cipher, keyHeader.iv, keyHeader.aesKey);
};

export const decryptKeyHeader = async (
  dotYouClient: DotYouClient,
  encryptedKeyHeader: EncryptedKeyHeader
): Promise<KeyHeader> => {
  const ss = dotYouClient.getSharedSecret();
  if (!ss) {
    throw new Error('attempting to decrypt but missing the shared secret');
  }

  // Check if used params aren't still base64 encoded if so parse to bytearrays
  let encryptedAesKey = encryptedKeyHeader.encryptedAesKey;
  if (typeof encryptedKeyHeader.encryptedAesKey === 'string') {
    encryptedAesKey = base64ToUint8Array(encryptedKeyHeader.encryptedAesKey);
  }

  let receivedIv = encryptedKeyHeader.iv;
  if (typeof encryptedKeyHeader.iv === 'string') {
    receivedIv = base64ToUint8Array(encryptedKeyHeader.iv);
  }

  const bytes = await cbcDecrypt(encryptedAesKey, receivedIv, ss);
  const iv = bytes.subarray(0, 16);
  const aesKey = bytes.subarray(16);

  return {
    aesKey: aesKey,
    iv: iv,
  };
};
