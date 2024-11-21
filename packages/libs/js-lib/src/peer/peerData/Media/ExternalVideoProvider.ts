const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;
import { ApiType, DotYouClient } from '../../../core/DotYouClient';
import { SystemFileType, TargetDrive } from '../../../core/core';
import { stringifyToQueryParams } from '../../../helpers/helpers';
import {
  getFileHeaderOverPeerByGlobalTransitId,
  getPayloadBytesOverPeerByGlobalTransitId,
} from '../../peer';
import { getFileHeaderOverPeer, getPayloadBytesOverPeer } from '../File/PeerFileProvider';

export const getDecryptedVideoChunkOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  globalTransitId: string | undefined,
  key: string,
  chunkStart?: number,
  chunkEnd?: number,
  systemFileType?: SystemFileType
): Promise<Uint8Array | null> => {
  const payload = globalTransitId
    ? await getPayloadBytesOverPeerByGlobalTransitId(
        dotYouClient,
        odinId,
        targetDrive,
        globalTransitId,
        key,
        {
          systemFileType,
          chunkStart,
          chunkEnd,
        }
      )
    : await getPayloadBytesOverPeer(dotYouClient, odinId, targetDrive, fileId, key, {
        systemFileType,
        chunkStart,
        chunkEnd,
      });

  return payload?.bytes || null;
};

export const getDecryptedVideoUrlOverPeer = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  fileId: string,
  key: string,
  systemFileType?: SystemFileType,
  fileSizeLimit?: number
): Promise<string> => {
  const meta = await getFileHeaderOverPeer(dotYouClient, odinId, targetDrive, fileId, {
    systemFileType,
  });
  if (!meta?.fileMetadata.isEncrypted) {
    const host = new DotYouClient({ hostIdentity: odinId, api: ApiType.Guest }).getEndpoint();

    return `${host}/drive/files/payload?${stringifyToQueryParams({
      ...targetDrive,
      fileId,
      key,
      xfst: systemFileType || 'Standard',
      iac: true,
    })}`;
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  return getPayloadBytesOverPeer(dotYouClient, odinId, targetDrive, fileId, key, {
    systemFileType,
    chunkStart: fileSizeLimit ? 0 : undefined,
    chunkEnd: fileSizeLimit,
  }).then((data) => {
    if (!data) return '';
    const url = URL.createObjectURL(new OdinBlob([data.bytes], { type: data.contentType }));
    return url;
  });
};
export const getDecryptedVideoUrlOverPeerByGlobalTransitId = async (
  dotYouClient: DotYouClient,
  odinId: string,
  targetDrive: TargetDrive,
  videoGlobalTransitId: string,
  key: string,
  systemFileType?: SystemFileType,
  fileSizeLimit?: number
): Promise<string> => {
  const meta = await getFileHeaderOverPeerByGlobalTransitId(
    dotYouClient,
    odinId,
    targetDrive,
    videoGlobalTransitId,
    {
      systemFileType,
    }
  );
  if (!meta?.fileMetadata.isEncrypted) {
    const host = new DotYouClient({ hostIdentity: odinId, api: ApiType.Guest }).getEndpoint();
    return `${host}/drive/files/payload?${stringifyToQueryParams({
      ...targetDrive,
      fileId: meta?.fileId,
      key,
      xfst: systemFileType || 'Standard',
      iac: true,
    })}`;
  }

  // Direct download of the data and potentially decrypt if response headers indicate encrypted
  return getPayloadBytesOverPeer(dotYouClient, odinId, targetDrive, meta?.fileId, key, {
    systemFileType,
    chunkStart: fileSizeLimit ? 0 : undefined,
    chunkEnd: fileSizeLimit,
  }).then((data) => {
    if (!data) return '';
    const url = URL.createObjectURL(new OdinBlob([data.bytes], { type: data.contentType }));
    return url;
  });
};
