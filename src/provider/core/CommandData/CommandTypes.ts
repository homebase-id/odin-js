export interface Command {
  recipients: string[];
  globalTransitIdList: [];
  code: number;
  jsonMessage: string;
}

export interface ReceivedCommand {
  id: string;
  globalTransitIdList: [];
  clientCode: number;
  clientJsonMessage: string;
  sender: string;
}
