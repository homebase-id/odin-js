import { DotYouClient } from '../DotYouClient';
import { FileIdFileIdentifier, GlobalTransitIdFileIdentifier } from '../DriveData/File/DriveFileTypes';

// V2 reaction routes. V2 addresses a local file by drive id (= the target drive's alias) and fileId in the path,
// and a file on another identity by the globalTransitId both copies share.

const filePath = (driveId: string, fileId: string) => `/drives/${driveId}/files/${fileId}`;

// ReactionsByFileId: direct (non-group) reactions
export const reactionsRootV2 = (driveId: string, fileId: string) =>
  `${filePath(driveId, fileId)}/reactions`;

// GroupReactionsByFileId: group reactions, distributed to recipients by the server
export const groupReactionsRootV2 = (driveId: string, fileId: string) =>
  `${filePath(driveId, fileId)}/group-reactions`;

// PeerReactionsByGtid: reactions on a file another identity hosts
export const peerReactionsRootV2 = (odinId: string, driveId: string, globalTransitId: string) =>
  `/peer/${encodeURIComponent(odinId)}/drives/${driveId}/files/by-gtid/${globalTransitId}/reactions`;

// GroupReactionsByGtid: group reactions on a file known only by its globalTransitId
export const groupReactionsByGtidRootV2 = (driveId: string, globalTransitId: string) =>
  `/drives/${driveId}/files/by-gtid/${globalTransitId}/group-reactions`;

// Local and peer routes take the same bodies, so a caller only needs the root: a local file by its fileId, and a file
// on another identity by its globalTransitId.
export const getReactionsRootV2 = (
  dotYouClient: DotYouClient,
  odinId: string | undefined,
  file: FileIdFileIdentifier | GlobalTransitIdFileIdentifier
): string => {
  if (odinId !== dotYouClient.getHostIdentity()) {
    const globalTransitId = 'globalTransitId' in file ? file.globalTransitId : undefined;
    if (!odinId || !globalTransitId) {
      throw new Error('A reaction on another identity needs its odinId and a globalTransitId');
    }
    return peerReactionsRootV2(odinId, file.targetDrive.alias, globalTransitId);
  }
  const fileId = 'fileId' in file ? file.fileId : undefined;
  if (!fileId) throw new Error('A reaction on a local file needs its fileId');
  return reactionsRootV2(file.targetDrive.alias, fileId);
};
