import { AxiosResponse } from 'axios';
import { DotYouClient } from '../DotYouClient';

import { EncryptedKeyHeader, KeyHeader } from './Drive/DriveTypes';
import { streamToByteArray } from './Upload/UploadHelpers';
import { cbcEncrypt, streamEncryptWithCbc, cbcDecrypt } from '../../helpers/AesEncrypt';
import {
  jsonStringify64,
  base64ToUint8Array,
  byteArrayToString,
  splitSharedSecretEncryptedKeyHeader,
  mergeByteArrays,
} from '../../helpers/DataUtil';
import { FileMetadata } from './File/DriveFileTypes';

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

export const encryptWithKeyheader = async <
  T extends Blob | Uint8Array,
  R = T extends Blob ? Blob : Uint8Array,
>(
  content: T,
  keyHeader: KeyHeader
): Promise<R> => {
  if (content instanceof File || content instanceof Blob) {
    const encryptedStream = await streamEncryptWithCbc(
      content.stream(),
      keyHeader.aesKey,
      keyHeader.iv
    );

    return new Blob([await streamToByteArray(encryptedStream, content.type)], {
      type: content.type,
    }) as R;
  }

  const cipher = await cbcEncrypt(content, keyHeader.iv, keyHeader.aesKey);
  return cipher as R;
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
    throw new Error('attempting to encrypt but missing the shared secret');
  }

  const content = new TextEncoder().encode(json);
  const cipher = await cbcEncrypt(content, iv, ss);
  return cipher;
};

/// Decryption
export const decryptJsonContent = async (
  fileMetaData: FileMetadata,
  keyheader: KeyHeader | undefined
): Promise<string> => {
  if (!keyheader || !fileMetaData.appData.jsonContent) return fileMetaData.appData.jsonContent;

  try {
    const cipher = base64ToUint8Array(fileMetaData.appData.jsonContent);
    return byteArrayToString(await decryptUsingKeyHeader(cipher, keyheader));
  } catch (err) {
    console.error('[DotYouCore-js]', 'Json Content Decryption failed', err);
    return '';
  }
};

export const decryptUsingKeyHeader = async (
  cipher: Uint8Array,
  keyHeader: KeyHeader
): Promise<Uint8Array> => await cbcDecrypt(cipher, keyHeader.iv, keyHeader.aesKey);

export const decryptBytesResponse = async (
  dotYouClient: DotYouClient,
  response: AxiosResponse<ArrayBuffer>,
  keyHeader: KeyHeader | EncryptedKeyHeader | undefined
): Promise<Uint8Array> => {
  const responseBa = new Uint8Array(response.data);

  if (keyHeader) {
    const decryptedKeyHeader =
      'encryptionVersion' in keyHeader
        ? await decryptKeyHeader(dotYouClient, keyHeader)
        : keyHeader;

    return decryptUsingKeyHeader(responseBa, decryptedKeyHeader);
  } else if (
    response.headers.payloadencrypted === 'True' &&
    response.headers.sharedsecretencryptedheader64
  ) {
    const encryptedKeyHeader = splitSharedSecretEncryptedKeyHeader(
      response.headers.sharedsecretencryptedheader64
    );
    const keyHeader = await decryptKeyHeader(dotYouClient, encryptedKeyHeader);

    return await decryptUsingKeyHeader(responseBa, keyHeader);
  } else {
    return responseBa;
  }
};

export const decryptChunkedBytesResponse = async (
  dotYouClient: DotYouClient,
  response: AxiosResponse<ArrayBuffer>,
  startOffset: number,
  chunkStart: number
) => {
  const responseBa = new Uint8Array(response.data);

  if (
    response.headers.payloadencrypted === 'True' &&
    response.headers.sharedsecretencryptedheader64
  ) {
    const encryptedKeyHeader = splitSharedSecretEncryptedKeyHeader(
      response.headers.sharedsecretencryptedheader64
    );
    const keyHeader = await decryptKeyHeader(dotYouClient, encryptedKeyHeader);
    const key = keyHeader.aesKey;
    const { iv, cipher } = await (async () => {
      const padding = new Uint8Array(16).fill(16);
      const encryptedPadding = (
        await cbcEncrypt(padding, responseBa.slice(responseBa.length - 16), key)
      ).slice(0, 16);

      if (chunkStart === 0) {
        //First block
        return { iv: keyHeader.iv, cipher: mergeByteArrays([responseBa, encryptedPadding]) };
      }

      // Center blocks
      return {
        iv: responseBa.slice(0, 16),
        cipher: mergeByteArrays([responseBa.slice(16), encryptedPadding]),
      };
    })();

    const decryptedBytes = await cbcDecrypt(cipher, iv, key);

    // Return without full block offset
    return decryptedBytes.slice(startOffset ? startOffset - 16 : 0);
  } else {
    return responseBa.slice(startOffset);
  }
};

export const decryptKeyHeader = async (
  dotYouClient: DotYouClient,
  encryptedKeyHeader: EncryptedKeyHeader
): Promise<KeyHeader> => {
  const ss = dotYouClient.getSharedSecret();
  if (!ss) throw new Error('attempting to decrypt but missing the shared secret');

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
