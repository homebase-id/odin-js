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

export interface ReactionBase {
  authorOdinId?: string;
  body: string;
}

export interface CommentReaction extends ReactionBase {
  bodyAsRichText?: RichText;
  mediaPayloadKey?: string;
}

export type EmojiReaction = ReactionBase;

export type RichText = Record<string, unknown>[];
