import { createContext, useContext } from 'react';
import type { NewMediaFile, TargetDrive } from '@homebase-id/js-lib/core';

/** Where the article's images live, and how the editor adds one. */
export type ArticleEditorMedia = {
  odinId?: string;
  mediaDrive: TargetDrive;
  /** The article's file; images without a `fileId` of their own are its payloads */
  fileId?: string;
  globalTransitId?: string;
  lastModified?: number;
  /** Images added while editing, not uploaded yet */
  pendingFiles: NewMediaFile[];
  /** Adds an image to the article's pending files and returns its payload key */
  addImage: (file: Blob) => string;
};

export const ArticleEditorContext = createContext<ArticleEditorMedia | undefined>(undefined);

export const useArticleEditorMedia = () => useContext(ArticleEditorContext);
