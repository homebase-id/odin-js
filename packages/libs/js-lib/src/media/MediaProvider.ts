import { stringifyToQueryParams, uint8ArrayToBase64 } from '../helpers/DataUtil';
import { ApiType, OdinClient } from '../core/OdinClient';
import {
  TargetDrive,
  SystemFileType,
  getPayloadBytes,
  getFileHeader,
  ImageSize,
  getThumbBytes,
} from '../core/core';

/**
 * @param isProbablyEncrypted {boolean} Hints wether or not we can expect the image to be encrypted, when true no direct url is returned instead the contents are fetched and decrypted depending on their metadata; This allows to skip a probably unneeded header call
 */
export const getDecryptedMediaUrl = async (
  odinClient: OdinClient,
  targetDrive: TargetDrive,
  fileId: string,
  fileKey: string,
  isProbablyEncrypted?: boolean,
  lastModified?: number,
  options?: {
    size?: ImageSize; // Passing size will get a thumb, otherwise the payload
    systemFileType?: SystemFileType;
    fileSizeLimit?: number;
    preferObjectUrl?: boolean;
  }
): Promise<string> => {
  const { size, systemFileType, fileSizeLimit } = options || {};
  const getDirectImageUrl = () =>
    getAnonymousDirectImageUrl(
      odinClient.getHostIdentity(),
      targetDrive,
      fileId,
      fileKey,
      size,
      systemFileType,
      lastModified
    );

  const ss = odinClient.getSharedSecret();

  // If there is no shared secret, we wouldn't even be able to decrypt
  if (!ss) return await getDirectImageUrl();

  // We try and avoid the payload call as much as possible, so if the payload is probabaly not encrypted,
  //   we first get confirmation from the header and return a direct url if possible
  if (!isProbablyEncrypted) {
    const meta = await getFileHeader(odinClient, targetDrive, fileId, { systemFileType });
    if (!meta?.fileMetadata.isEncrypted) return await getDirectImageUrl();
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  // We limit download to 10MB to avoid memory issues
  const getBytes = async () => {
    if (size) {
      try {
        const thumbBytes = await getThumbBytes(
          odinClient,
          targetDrive,
          fileId,
          fileKey,
          size.pixelWidth,
          size.pixelHeight,
          { systemFileType, lastModified }
        );
        if (thumbBytes) return thumbBytes;
      } catch {
        // Failed to get thumb data, try to get payload data
      }
    }

    return await getPayloadBytes(odinClient, targetDrive, fileId, fileKey, {
      systemFileType,
      chunkStart: fileSizeLimit ? 0 : undefined,
      chunkEnd: fileSizeLimit,
      lastModified,
    });
  };

  return getBytes().then((data) => {
    if (!data) return '';
    if (options?.preferObjectUrl) {
      const blob = new Blob([new Uint8Array(data.bytes)], { type: data.contentType });
      return URL.createObjectURL(blob);
    } else {
      return `data:${data.contentType};base64,${uint8ArrayToBase64(new Uint8Array(data.bytes))}`;
    }
  });
};

export const getAnonymousDirectImageUrl = (
  identity: string,
  targetDrive: TargetDrive,
  fileId: string,
  fileKey: string,
  size?: ImageSize,
  systemFileType?: SystemFileType,
  lastModified?: number
) => {
  const odinClient = new OdinClient({ hostIdentity: identity, api: ApiType.Guest });
  return `${odinClient.getEndpoint()}/drive/files/${size ? 'thumb' : 'payload'
    }?${stringifyToQueryParams({
      alias: targetDrive.alias,
      type: targetDrive.type,
      fileId: fileId,
      ...(size
        ? { payloadKey: fileKey, width: size.pixelWidth, height: size.pixelHeight }
        : { key: fileKey }),
      lastModified: lastModified,
      xfst: systemFileType || 'Standard',
      iac: true, // iac is a flag that tells the identity to ignore any auth cookies
    })}`;
};
