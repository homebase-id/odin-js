/**
 * Shared TypeScript models that match the C# DTOs
 * These should be kept in sync with backend/Models/
 */

/**
 * Request to send a chat message
 */
export interface SendMessageRequest {
  Message: string;
  ReplyToMessageId?: string | null;
  Mentions?: string[] | null;
}

/**
 * Represents a chat message sent between users
 */
export interface ChatMessage {
  Username: string;
  Message: string;
  Timestamp: string; // ISO 8601 date string from C# DateTime
  IsPrivate: boolean;
}

/**
 * Response when a user successfully joins the chat
 */
export interface JoinChatResponse {
  Username: string;
  JoinedAt: string;
}

/**
 * User typing notification
 */
export interface TypingNotification {
  Username: string;
  IsTyping: boolean;
}

/**
 * User presence event (join/leave)
 */
export interface UserPresenceEvent {
  Username: string;
  Action: UserPresenceAction;
  Timestamp: string;
}

export enum UserPresenceAction {
  Joined = 0,
  Left = 1,
}

/**
 * Ping message sent from server to client and vice versa
 */
export interface TextMessage {
  Timestamp: string;
  Message: string;
}

/**
 * Type-safe hub method names
 */
export const HubMethods = {
  // Client → Server methods:
  //
  // JoinChat: "JoinChat",
  // SendMessage: "SendMessage",
  // SendPrivateMessage: "SendPrivateMessage",
  // NotifyTyping: "NotifyTyping",
  SendTextMessage: 'SendTextMessage',
  TestConnection: 'TestConnection',
  //
  // Server → Client events:
  //
  // ReceiveMessage: "ReceiveMessage",
  // UserJoined: "UserJoined",
  // UserLeft: "UserLeft",
  // UpdateUserList: "UpdateUserList",
  // UserTyping: "UserTyping",
  // JoinedSuccessfully: "JoinedSuccessfully",
  ReceiveTextMessage: 'ReceiveTextMessage',
} as const;
