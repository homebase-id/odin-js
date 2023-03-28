import { DotYouClient } from '../DotYouClient';
import { TargetDrive } from '../DriveData/DriveTypes';
import { SystemFileType } from '../DriveData/DriveUploadTypes';
import { stringify } from '../helpers/DataUtil';
import { encryptUrl } from '../InterceptionEncryptionUtil';
import { getFileHeaderOverTransit, getPayloadBytesOverTransit } from './TransitProvider';

export const getDecryptedVideoOverTransit = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  isProbablyEncrypted?: boolean,
  systemFileType?: SystemFileType
): Promise<string | null> => {
  const getDirectUrl = async () => {
    const directUrl = `https://${odinId}/api/youauth/v1/drive/files/payload?${stringify({
      ...targetDrive,
      fileId,
      xfst: systemFileType || 'Standard',
    })}`;

    if (ss) {
      return await encryptUrl(directUrl, ss);
    }

    return directUrl;
  };

  const ss = dotYouClient.getSharedSecret();

  // If there is no shared secret, we wouldn't even be able to decrypt
  if (!ss) {
    return await getDirectUrl();
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
      return await getDirectUrl();
    }
  }

  // There is no way to get the data without loading it all in memory,
  //   so we might just as well use the methods that already exist
  const payload = await getPayloadBytesOverTransit(
    dotYouClient,
    odinId,
    targetDrive,
    fileId,
    undefined,
    systemFileType
  );
  return window.URL.createObjectURL(new Blob([payload.bytes], { type: payload.contentType }));
};
