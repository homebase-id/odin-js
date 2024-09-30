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

export interface ReactionFile {
  authorOdinId?: string;
  body: string;
  bodyAsRichText?: RichText;
  mediaPayloadKey?: string;
}

export type RichText = Record<string, unknown>[];
