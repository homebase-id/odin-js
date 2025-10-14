import * as signalR from '@microsoft/signalr';
import { HubMethods, TextMessage } from './NotificationModels';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  // private messageHandlers: ((message: ChatMessage) => void)[] = [];
  // private userListHandlers: ((users: string[]) => void)[] = [];
  // private userJoinedHandlers: ((username: string) => void)[] = [];
  // private userLeftHandlers: ((username: string) => void)[] = [];
  // private userTypingHandlers: ((username: string, isTyping: boolean) => void)[] = [];
  // private joinedSuccessfullyHandlers: ((username: string) => void)[] = [];
  private textMessageHandlers: ((text: TextMessage) => void)[] = [];

  async connect(hubUrl: string): Promise<void> {
    // Set a test cookie BEFORE connecting
    // const testCookieValue = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    // document.cookie = `SignalRTestCookie=${testCookieValue}; path=/; SameSite=Lax`;
    // console.log(`[Client] Set cookie: SignalRTestCookie=${testCookieValue}`);

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true, // IMPORTANT: Send cookies with requests
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupEventHandlers();

    try {
      await this.connection.start();
      console.log('SignalR Connected');
    } catch (err) {
      console.error('SignalR Connection Error: ', err);
      throw err;
    }

    while (this.connection.state !== signalR.HubConnectionState.Connected) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    console.log('SignalR Connected and ready');
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    // Registers with the SignalR Hub to listen for XXX (e.g. ReceivePing) events from the server
    // When the server sends a ping, this callback is triggered
    // It then notifies all registered local handlers by iterating through this.pingHandlers
    // This is the "entry point" where server messages come into your client application

    this.connection.on(HubMethods.ReceiveTextMessage, (text: TextMessage) => {
      console.log(
        `[Text Message from server] Received at ${new Date(
          text.Timestamp
        ).toLocaleTimeString()}: ${text.Message}`
      );
      this.textMessageHandlers.forEach((handler) => handler(text));
    });

    // this.connection.on(HubMethods.ReceiveMessage, (message: ChatMessage) => {
    //   this.messageHandlers.forEach((handler) => handler(message));
    // });

    // this.connection.on(HubMethods.UpdateUserList, (users: string[]) => {
    //   this.userListHandlers.forEach((handler) => handler(users));
    // });

    // this.connection.on(HubMethods.UserJoined, (username: string) => {
    //   this.userJoinedHandlers.forEach((handler) => handler(username));
    // });

    // this.connection.on('UserLeft', (username: string) => {
    //   this.userLeftHandlers.forEach((handler) => handler(username));
    // });

    // this.connection.on('UserTyping', (username: string, isTyping: boolean) => {
    //   this.userTypingHandlers.forEach((handler) => handler(username, isTyping));
    // });

    // this.connection.on('JoinedSuccessfully', (username: string) => {
    //   this.joinedSuccessfullyHandlers.forEach((handler) => handler(username));
    // });

    //

    this.connection.onreconnecting((error) => {
      console.log('Connection lost. Reconnecting...', error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log('Reconnected. Connection ID: ', connectionId);
    });

    this.connection.onclose((error) => {
      console.log('Connection closed.', error);
    });
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  async sendTextMessage(message: string): Promise<void> {
    if (this.connection) {
      const textMessage: TextMessage = {
        Timestamp: new Date().toISOString(),
        Message: message,
      };
      await this.connection.invoke(HubMethods.SendTextMessage, textMessage);
    }
  }

  async testConnection(): Promise<void> {
    if (this.connection) {
      await this.connection.invoke(HubMethods.TestConnection);
    }
  }

  // async joinChat(username: string): Promise<void> {
  //   if (this.connection) {
  //     await this.connection.invoke(HubMethods.JoinChat, username);
  //   }
  // }

  // async sendMessage(message: string): Promise<void> {
  //   if (this.connection) {
  //     const request: SendMessageRequest = {
  //       Message: message,
  //       ReplyToMessageId: null,
  //       Mentions: null,
  //     };
  //     await this.connection.invoke(HubMethods.SendMessage, request);
  //   }
  // }

  // async notifyTyping(isTyping: boolean): Promise<void> {
  //   if (this.connection) {
  //     await this.connection.invoke(HubMethods.NotifyTyping, isTyping);
  //   }
  // }

  //
  //
  //

  //
  // Below: allows React components to register their own handlers for ping messages
  // Adds the component's handler to the pingHandlers array
  // Returns a cleanup function to unsubscribe (important for React's useEffect cleanup)
  //

  // onReceiveMessage(handler: (message: ChatMessage) => void): () => void {
  //   this.messageHandlers.push(handler);
  //   // Return cleanup function
  //   return () => {
  //     const index = this.messageHandlers.indexOf(handler);
  //     if (index > -1) {
  //       this.messageHandlers.splice(index, 1);
  //     }
  //   };
  // }

  // onUpdateUserList(handler: (users: string[]) => void): () => void {
  //   this.userListHandlers.push(handler);
  //   return () => {
  //     const index = this.userListHandlers.indexOf(handler);
  //     if (index > -1) {
  //       this.userListHandlers.splice(index, 1);
  //     }
  //   };
  // }

  // onUserJoined(handler: (username: string) => void): () => void {
  //   this.userJoinedHandlers.push(handler);
  //   return () => {
  //     const index = this.userJoinedHandlers.indexOf(handler);
  //     if (index > -1) {
  //       this.userJoinedHandlers.splice(index, 1);
  //     }
  //   };
  // }

  // onUserLeft(handler: (username: string) => void): () => void {
  //   this.userLeftHandlers.push(handler);
  //   return () => {
  //     const index = this.userLeftHandlers.indexOf(handler);
  //     if (index > -1) {
  //       this.userLeftHandlers.splice(index, 1);
  //     }
  //   };
  // }

  // onUserTyping(handler: (username: string, isTyping: boolean) => void): () => void {
  //   this.userTypingHandlers.push(handler);
  //   return () => {
  //     const index = this.userTypingHandlers.indexOf(handler);
  //     if (index > -1) {
  //       this.userTypingHandlers.splice(index, 1);
  //     }
  //   };
  // }

  // onJoinedSuccessfully(handler: (username: string) => void): () => void {
  //   this.joinedSuccessfullyHandlers.push(handler);
  //   return () => {
  //     const index = this.joinedSuccessfullyHandlers.indexOf(handler);
  //     if (index > -1) {
  //       this.joinedSuccessfullyHandlers.splice(index, 1);
  //     }
  //   };
  // }

  onReceivePing(handler: (ping: TextMessage) => void): () => void {
    this.textMessageHandlers.push(handler);
    return () => {
      const index = this.textMessageHandlers.indexOf(handler);
      if (index > -1) {
        this.textMessageHandlers.splice(index, 1);
      }
    };
  }

  //

  getConnectionState(): signalR.HubConnectionState | null {
    return this.connection?.state ?? null;
  }
}

export const signalRService = new SignalRService();
// export type { ChatMessage };
