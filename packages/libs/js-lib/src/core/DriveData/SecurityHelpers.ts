import { AxiosResponse } from 'axios';
import { DotYouClient } from '../DotYouClient';

import { cbcEncrypt, streamEncryptWithCbc, cbcDecrypt } from '../../helpers/AesEncrypt';
import {
  jsonStringify64,
  base64ToUint8Array,
  toUint8Array,
  byteArrayToString,
  splitSharedSecretEncryptedKeyHeader,
  mergeByteArrays,
} from '../../helpers/DataUtil';
import { EncryptedKeyHeader, FileMetadata, KeyHeader } from './File/DriveFileTypes';
import { getSecuredBlob, streamToByteArray } from '../../helpers/BlobHelpers';
import { zkUnseal } from '../../auth/providers/ZeroKnowledgeKeys';
const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;

/// Encryption
export const encryptKeyHeader = async (
  dotYouClient: DotYouClient,
  keyHeader: KeyHeader,
  transferIv: Uint8Array
): Promise<EncryptedKeyHeader> => {
  const ss = dotYouClient.getSharedSecret();
  if (!ss) throw new Error('attempting to encrypt but missing the shared secret');

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
  R = T extends Blob ? Blob : T extends typeof OdinBlob ? typeof OdinBlob : Uint8Array,
>(
  content: T,
  keyHeader: KeyHeader
): Promise<R> => {
  if (content instanceof File || content instanceof Blob || content instanceof OdinBlob) {
    try {
      const encryptedStream = await streamEncryptWithCbc(
        content.stream(),
        keyHeader.aesKey,
        keyHeader.iv
      );

      return new OdinBlob([await streamToByteArray(encryptedStream, content.type)], {
        type: content.type,
      }) as R;
    } catch (ex) {
      const customContent = content as unknown;
      if (
        customContent &&
        typeof customContent === 'object' &&
        'encrypt' in customContent &&
        customContent.encrypt &&
        typeof customContent.encrypt === 'function'
      ) {
        try {
          return (await customContent.encrypt(keyHeader.aesKey, keyHeader.iv)) as R;
        } catch (ex) {
          console.warn('Stream & custom encryption failed', ex);
        }
      }

      console.warn('fallback to full encryption', ex);
      const contentAsArray = new Uint8Array(await content.arrayBuffer());
      return (await getSecuredBlob(
        [await cbcEncrypt(contentAsArray, keyHeader.iv, keyHeader.aesKey)],
        {
          type: content.type,
        }
      )) as R;
    }
  }

  return (await cbcEncrypt(content, keyHeader.iv, keyHeader.aesKey)) as R;
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
  if (
    !keyheader ||
    !fileMetaData.appData.content ||
    typeof fileMetaData.appData.content === 'object'
  )
    return fileMetaData.appData.content;

  try {
    const cipher = base64ToUint8Array(fileMetaData.appData.content);
    return byteArrayToString(await decryptUsingKeyHeader(cipher, keyheader));
  } catch (err) {
    console.warn('[odin-js]', 'Json Content Decryption failed', err);
    throw new Error('[odin-js] Json Content Decryption failed');
  }
};

export const decryptLocalContent = async (
  fileMetaData: FileMetadata<unknown, string>,
  keyheader: KeyHeader | undefined
): Promise<string | undefined> => {
  if (
    !keyheader ||
    !fileMetaData.localAppData?.content ||
    typeof fileMetaData.localAppData?.content === 'object'
  )
    return fileMetaData.localAppData?.content;

  try {
    const updatedIv =
      (fileMetaData.localAppData.iv && base64ToUint8Array(fileMetaData.localAppData.iv)) ||
      keyheader.iv;

    const cipher = base64ToUint8Array(fileMetaData.localAppData?.content);
    return byteArrayToString(
      await decryptUsingKeyHeader(cipher, {
        aesKey: keyheader.aesKey,
        iv: updatedIv,
      })
    );
  } catch (err) {
    console.warn('[odin-js]', 'Json local content Decryption failed', err);
    throw new Error('[odin-js] Json local content Decryption failed');
  }
};

export const decryptUsingKeyHeader = async (
  cipher: Uint8Array,
  keyHeader: KeyHeader
): Promise<Uint8Array> => await cbcDecrypt(cipher, keyHeader.iv, keyHeader.aesKey);

export const decryptBytesResponse = async (
  dotYouClient: DotYouClient,
  response: AxiosResponse<ArrayBuffer>
  // keyHeader: KeyHeader | EncryptedKeyHeader | undefined
): Promise<Uint8Array> => {
  const responseBa = new Uint8Array(response.data);

  // if (keyHeader) {
  //   const decryptedKeyHeader =
  //     'encryptionVersion' in keyHeader
  //       ? await decryptKeyHeader(dotYouClient, keyHeader)
  //       : keyHeader;

  //   return decryptUsingKeyHeader(responseBa, decryptedKeyHeader);
  // } else
  if (
    response.headers.payloadencrypted === 'True' &&
    response.headers.sharedsecretencryptedheader64
  ) {
    const encryptedKeyHeader = splitSharedSecretEncryptedKeyHeader(
      response.headers.sharedsecretencryptedheader64
    );
    const keyHeader = await decryptKeyHeader(dotYouClient, encryptedKeyHeader);

    return await decryptUsingKeyHeader(responseBa, keyHeader);
  } else if (response.headers.payloadencrypted === 'True') {
    throw new Error(`Can't decrypt; missing keyheader`);
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

    // Return without full block offset; Ignore 16 extra bytes at
    //  the start of the first block as that's already removed from the cipher to get the iv
    return decryptedBytes.slice(startOffset ? startOffset - 16 : 0);
  } else if (response.headers.payloadencrypted === 'True') {
    // As decryptBytesResponse: a client-locked file's payload comes without a key header, and returning
    // its ciphertext as the payload would show garbage instead of failing
    throw new Error(`Can't decrypt; missing keyheader`);
  } else {
    return responseBa.slice(startOffset);
  }
};

/**
 * Whether a file's key header, as a read or a query returns it, is a deposit's: sealed to the drive's
 * write-only public key (11/'aes' otherwise). The identity server returns the type as a string.
 */
export const isSealedKeyHeader = (keyHeader: { type: number | string } | undefined | null) =>
  !!keyHeader && (keyHeader.type === 'sealed' || keyHeader.type === 12);

/**
 * Whether a key header is a zero-knowledge drive's own: the file key locked with the drive's key by an
 * owner device (13/'zkDrive').
 */
export const isZkDriveKeyHeader = (keyHeader: { type: number | string } | undefined | null) =>
  !!keyHeader && (keyHeader.type === 'zkDrive' || keyHeader.type === 13);

/**
 * Whether a key header is client-locked: sealed (a deposit) or zkDrive. The identity server returns it
 * as stored, not shared-secret encrypted, so `decryptKeyHeader` can't open it; `openClientLockedKeyHeader`
 * does, with the drive's keys (odin-core docs/zero-knowledge-drive-api-plan.md, step 2).
 */
export const isClientLockedKeyHeader = (keyHeader: { type: number | string } | undefined | null) =>
  isSealedKeyHeader(keyHeader) || isZkDriveKeyHeader(keyHeader);

type FileWithKeyHeader = {
  fileMetadata: { isEncrypted: boolean };
  sharedSecretEncryptedKeyHeader?: { type: number | string } | null;
};

/**
 * Whether a file is a deposit: encrypted, with its key header sealed to the drive's write-only key.
 * Nothing but the drive owner's browser, with that key, can open it.
 */
export const isDeposit = (file: FileWithKeyHeader) =>
  file.fileMetadata.isEncrypted && isSealedKeyHeader(file.sharedSecretEncryptedKeyHeader);

/** Whether a file is client-locked: encrypted, with a sealed or zkDrive key header. */
export const isClientLocked = (file: FileWithKeyHeader) =>
  file.fileMetadata.isEncrypted && isClientLockedKeyHeader(file.sharedSecretEncryptedKeyHeader);

/** The drive's keys that open a client-locked key header; a header needs only its own. */
export interface ClientLockKeys {
  /** The drive's write-only private key (PKCS8): opens a sealed key header */
  writeOnlyPrivateKey?: Uint8Array;
  /** The drive's key (DrvK): opens a zkDrive key header */
  driveKey?: Uint8Array;
}

/** A key header in the AES-CBC format (`aes`, `zkDrive`): the IV and AES key, encrypted under the header's IV. */
const openCbcKeyHeader = async (
  keyHeader: { iv: string | Uint8Array; encryptedAesKey: string | Uint8Array },
  key: Uint8Array
): Promise<KeyHeader> => {
  const bytes = await cbcDecrypt(
    toUint8Array(keyHeader.encryptedAesKey),
    toUint8Array(keyHeader.iv),
    key
  );
  return { iv: bytes.subarray(0, 16), aesKey: bytes.subarray(16) };
};

/**
 * Opens a client-locked key header: a sealed one with the drive's write-only private key, a zkDrive
 * one with the drive's key. Either way it holds the file's IV and AES key, which open the content and
 * every payload as for any other file.
 */
export const openClientLockedKeyHeader = async (
  keyHeader: {
    type: number | string;
    iv: string | Uint8Array;
    encryptedAesKey: string | Uint8Array;
  },
  keys: ClientLockKeys
): Promise<KeyHeader> => {
  if (isSealedKeyHeader(keyHeader)) {
    if (!keys.writeOnlyPrivateKey)
      throw new Error("A sealed key header opens only with the drive's write-only private key");
    const bytes = await zkUnseal(keyHeader.encryptedAesKey, keys.writeOnlyPrivateKey);
    return { iv: bytes.slice(0, 16), aesKey: bytes.slice(16) };
  }

  if (isZkDriveKeyHeader(keyHeader)) {
    if (!keys.driveKey) throw new Error("A zkDrive key header opens only with the drive's key");
    return openCbcKeyHeader(keyHeader, keys.driveKey);
  }

  throw new Error('Not a client-locked key header');
};

export const decryptKeyHeader = async (
  dotYouClient: DotYouClient,
  encryptedKeyHeader: EncryptedKeyHeader | KeyHeader
): Promise<KeyHeader> => {
  const encryptedKeyHeaderIsAlreadyDecrypted =
    'iv' in encryptedKeyHeader && 'aesKey' in encryptedKeyHeader;
  if (encryptedKeyHeaderIsAlreadyDecrypted) {
    return encryptedKeyHeader as KeyHeader;
  }

  // A client-locked key header is locked with the drive's keys, not the shared secret
  if (isClientLockedKeyHeader(encryptedKeyHeader)) {
    throw new Error(
      "A client-locked key header opens only with the drive's keys (openClientLockedKeyHeader)"
    );
  }

  const ss = dotYouClient.getSharedSecret();
  if (!ss) throw new Error('attempting to decrypt but missing the shared secret');

  return openCbcKeyHeader(encryptedKeyHeader, ss);
};
