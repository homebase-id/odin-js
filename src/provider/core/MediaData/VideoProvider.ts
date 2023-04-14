import { DotYouClient } from '../DotYouClient';
import { getFileHeader, getPayloadBytes, uploadFile } from '../DriveData/DriveProvider';
import { TargetDrive } from '../DriveData/DriveTypes';
import {
  AccessControlList,
  TransitOptions,
  SecurityGroupType,
  UploadInstructionSet,
  UploadFileMetadata,
  UploadResult,
  SystemFileType,
} from '../DriveData/DriveUploadTypes';
import { decryptJsonContent, decryptKeyHeader } from '../DriveData/SecurityHelpers';
import { getRandom16ByteArray } from '../DriveData/UploadHelpers';
import { streamDecryptWithCbc } from '../helpers/AesEncrypt';
import {
  getNewId,
  jsonStringify64,
  splitSharedSecretEncryptedKeyHeader,
  stringify,
} from '../helpers/DataUtil';
import { encryptUrl } from '../InterceptionEncryptionUtil';
import { VideoMetadata, VideoUploadResult } from './MediaTypes';

export type VideoContentType = 'video/mp4';

export const uploadVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  acl: AccessControlList,
  file: Uint8Array | File,
  fileMetadata?: VideoMetadata,
  uploadMeta?: {
    tag?: string | undefined | string[];
    uniqueId?: string;
    fileId?: string;
    type?: VideoContentType;
    transitOptions?: TransitOptions;
    allowDistribution?: boolean;
    userDate?: number;
  }
): Promise<VideoUploadResult | undefined> => {
  if (!targetDrive) {
    throw 'Missing target drive';
  }

  const encrypt = !(
    acl.requiredSecurityGroup === SecurityGroupType.Anonymous ||
    acl.requiredSecurityGroup === SecurityGroupType.Authenticated
  );

  const instructionSet: UploadInstructionSet = {
    transferIv: getRandom16ByteArray(),
    storageOptions: {
      overwriteFileId: uploadMeta?.fileId ?? null,
      drive: targetDrive,
    },
    transitOptions: uploadMeta?.transitOptions || null,
  };

  const metadata: UploadFileMetadata = {
    allowDistribution: uploadMeta?.allowDistribution || false,
    contentType: uploadMeta?.type ?? 'image/webp',
    appData: {
      tags: uploadMeta?.tag
        ? [...(Array.isArray(uploadMeta.tag) ? uploadMeta.tag : [uploadMeta.tag])]
        : [],
      uniqueId: uploadMeta?.uniqueId ?? getNewId(),
      contentIsComplete: false,
      fileType: 0,
      jsonContent: jsonStringify64(fileMetadata),
      userDate: uploadMeta?.userDate,
    },
    payloadIsEncrypted: encrypt,
    accessControlList: acl,
  };

  const result: UploadResult = await uploadFile(
    dotYouClient,
    instructionSet,
    metadata,
    file,
    undefined,
    encrypt
  );

  return { fileId: result.file.fileId, type: 'video' };
};

const getDirectVideoUrl = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
) => {
  const ss = dotYouClient.getSharedSecret();

  const directUrl = `${dotYouClient.getEndpoint()}/drive/files/payload?${stringify({
    ...targetDrive,
    fileId,
    xfst: systemFileType || 'Standard',
  })}`;

  if (ss) {
    return await encryptUrl(directUrl, ss);
  }

  return directUrl;
};

export const getDecryptedVideoStream = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType
): Promise<ReadableStream<Uint8Array> | null> => {
  return await fetch(await getDirectVideoUrl(dotYouClient, targetDrive, fileId, systemFileType))
    .then((response) => {
      return { body: response.body, headers: response.headers };
    })
    .then((data) => {
      if (!data.body) return null;
      const reader = data.body.getReader();

      return {
        headers: data.headers,
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            return pump();

            function pump(): Promise<void> {
              return reader.read().then(({ done, value }) => {
                // When no more data needs to be consumed, close the stream
                if (done) {
                  controller.close();
                  return;
                }

                // Enqueue the next data chunk into our target stream
                controller.enqueue(value);
                return pump();
              });
            }
          },
        }),
      };
    })
    .then(async (stream) => {
      const isEncrypted = stream?.headers.get('payloadencrypted');
      const ssEncrypted = stream?.headers.get('sharedsecretencryptedheader64');
      if (isEncrypted === 'True' && ssEncrypted && stream?.body) {
        const encryptedKeyHeader = splitSharedSecretEncryptedKeyHeader(ssEncrypted);
        const keyHeader = await decryptKeyHeader(dotYouClient, encryptedKeyHeader);

        const decryptedStream = await streamDecryptWithCbc(
          stream?.body,
          keyHeader.aesKey,
          keyHeader.iv
        );
        return decryptedStream;
      }
      return stream?.body || null;
    });
};

export const getDecryptedVideoChunk = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType,
  chunkStart?: number,
  chunkEnd?: number
): Promise<Uint8Array | null> => {
  if (isProbablyEncrypted) {
    throw new Error('getDecryptedVideoChunk is not supported for encrypted videos');
  }

  const length =
    chunkEnd !== undefined && chunkStart !== undefined ? chunkEnd - chunkStart + 1 : undefined;

  const bytes = (
    await getPayloadBytes(
      dotYouClient,
      targetDrive,
      fileId,
      undefined,
      systemFileType,
      chunkStart,
      length
    )
  )?.bytes;

  return bytes;
};

export const getDecryptedVideo = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType
): Promise<string | null> => {
  const ss = dotYouClient.getSharedSecret();

  // If there is no shared secret, we wouldn't even be able to decrypt
  if (!ss) {
    return await getDirectVideoUrl(dotYouClient, targetDrive, fileId, systemFileType);
  }

  // If the contents is probably encrypted, we don't bother fetching the header
  if (!isProbablyEncrypted) {
    const meta = await getFileHeader(dotYouClient, targetDrive, fileId, systemFileType);
    if (!meta.fileMetadata.payloadIsEncrypted) {
      return await getDirectVideoUrl(dotYouClient, targetDrive, fileId, systemFileType);
    }
  }

  return await getDecryptedVideoStream(
    dotYouClient,
    targetDrive,
    fileId,
    isProbablyEncrypted,
    systemFileType
  )
    .then((stream) => new Response(stream))
    .then((response) => response.blob())
    .then((blob) => URL.createObjectURL(blob))
    .catch((err) => {
      console.error('error from fetch promises', err);
      return null;
    });
};

export const getDecryptedVideoMetadata = async (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
) => {
  const fileHeader = await getFileHeader(dotYouClient, targetDrive, fileId, systemFileType);
  const fileMetadata = fileHeader.fileMetadata;

  const keyheader = fileMetadata.payloadIsEncrypted
    ? await decryptKeyHeader(dotYouClient, fileHeader.sharedSecretEncryptedKeyHeader)
    : undefined;

  return await decryptJsonContent<VideoMetadata>(fileMetadata, keyheader);
};
