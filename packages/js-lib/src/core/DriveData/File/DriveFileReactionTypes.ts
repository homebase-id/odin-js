export interface ReactionPreview {
  comments: {
    created: number;
    updated: number;
    fileId: string;
    isEncrypted: boolean;
    odinId: string;
    content: string;
    reactions: { key: string; count: string; reactionContent: string }[];
  }[];
  reactions: Record<string, { key: string; count: string; reactionContent: string }>;
  totalCommentCount: number;
}

export interface ParsedReactionPreview {
  reactions: EmojiReactionSummary;
  comments: CommentsReactionSummary;
}

export interface EmojiReactionSummary {
  reactions: { emoji: string; count: number }[];
  totalCount: number;
}

export interface CommentsReactionSummary {
  comments: CommentReactionPreview[];
  totalCount: number;
}

export interface CommentReactionPreview extends ReactionFile {
  reactions: EmojiReactionSummary;
}

export interface ReactionFile {
  globalTransitId?: string;

  versionTag?: string;

  fileId?: string;
  id?: string;
  threadId?: string;
  lastModified?: number;

  isEncrypted?: boolean;

  authorOdinId: string;
  date?: number;
  updated?: number;

  content: ReactionContent;
}

export type RichText = Record<string, unknown>[];

export interface ReactionContent {
  body: string;
  bodyAsRichText?: RichText;
  mediaPayloadKey?: string;
}
