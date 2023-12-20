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
  isEncrypted: boolean;
}

export interface ReactionFile extends ReactionFileBody {
  authorOdinId: string;
}

export interface ReactionFileBody {
  body: string;
  bodyAsRichText?: RichText;
  mediaPayloadKey?: string;
}

export type RichText = Record<string, unknown>[];
