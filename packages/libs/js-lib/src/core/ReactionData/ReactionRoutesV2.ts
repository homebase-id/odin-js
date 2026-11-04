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

export const getLocalFileId = (file: { fileId?: string } | object): string | undefined =>
  'fileId' in file && typeof file.fileId === 'string' && file.fileId ? file.fileId : undefined;
