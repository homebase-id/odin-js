// V2 reaction routes. V2 addresses the target file by drive id (= the target drive's alias) and file id in
// the path, so only a local file with a known fileId can use them. Reactions on another identity's file
// (V1 /transit/reactions) and lookups by globalTransitId have no V2 route and stay on V1.

const filePath = (driveId: string, fileId: string) => `/drives/${driveId}/files/${fileId}`;

// ReactionsByFileId: direct (non-group) reactions
export const reactionsRootV2 = (driveId: string, fileId: string) =>
  `${filePath(driveId, fileId)}/reactions`;

// GroupReactionsByFileId: group reactions, distributed to recipients by the server
export const groupReactionsRootV2 = (driveId: string, fileId: string) =>
  `${filePath(driveId, fileId)}/group-reactions`;

export const getLocalFileId = (file: { fileId?: string } | object): string | undefined =>
  'fileId' in file && typeof file.fileId === 'string' && file.fileId ? file.fileId : undefined;
