// Mirrors ChatDeletedArchivalStaus; not imported so this file bundles standalone for node --test.
const DELETED_ARCHIVAL_STATUS = 2;

export const RENDERABLE_DATA_TYPES: ReadonlySet<number> = new Set([0, 202, 211]);

interface MessageKindProbe {
  fileMetadata: { appData: { dataType?: number; archivalStatus?: number } };
}

export const isRenderableMessage = (msg: MessageKindProbe): boolean =>
  msg.fileMetadata.appData.archivalStatus === DELETED_ARCHIVAL_STATUS ||
  RENDERABLE_DATA_TYPES.has(msg.fileMetadata.appData.dataType ?? 0);

export const isHiddenReactionCode = (code: string): boolean => code.startsWith('_');
