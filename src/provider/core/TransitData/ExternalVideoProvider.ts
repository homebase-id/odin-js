import { DotYouClient } from '../DotYouClient';
import { TargetDrive } from '../DriveData/DriveTypes';
import { SystemFileType } from '../DriveData/DriveUploadTypes';
import { decryptKeyHeader } from '../DriveData/SecurityHelpers';
import { streamDecryptWithCbc } from '../helpers/AesEncrypt';
import { splitSharedSecretEncryptedKeyHeader, stringify } from '../helpers/DataUtil';
import { getMediaSourceFromStream } from '../MediaData/Video/VideoHelpers';
import { getFileHeaderOverTransit } from './TransitProvider';

const getDirectVideoUrl = async (
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  systemFileType?: SystemFileType
) => {
  const directUrl = `https://${odinId}/api/youauth/v1/drive/files/payload?${stringify({
    ...targetDrive,
    fileId,
    xfst: systemFileType || 'Standard',
  })}`;

  return directUrl;
};

const getVideoStream = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType
): Promise<ReadableStream<Uint8Array> | null> => {
  return await fetch(await getDirectVideoUrl(odinId, targetDrive, fileId, systemFileType))
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

export const getDecryptedVideoOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType
): Promise<string | null> => {
  const ss = dotYouClient.getSharedSecret();

  // If there is no shared secret, we wouldn't even be able to decrypt
  if (!ss) {
    return await getDirectVideoUrl(odinId, targetDrive, fileId, systemFileType);
  }

  // If the contents is probably encrypted, we don't bother fetching the header
  if (!isProbablyEncrypted) {
    const meta = await getFileHeaderOverTransit(
      dotYouClient,
      odinId,
      targetDrive,
      fileId,
      systemFileType
    );
    if (!meta.fileMetadata.payloadIsEncrypted) {
      return await getDirectVideoUrl(odinId, targetDrive, fileId, systemFileType);
    }
  }

  return await getVideoStream(
    dotYouClient,
    odinId,
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

export const getDecryptedVideoMediaSourceOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType
) => {
  const stream = await getVideoStream(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    isProbablyEncrypted,
    systemFileType
  );

  if (!stream) return null;
  return getMediaSourceFromStream(stream);
};
