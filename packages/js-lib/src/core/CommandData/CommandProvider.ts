import { DotYouClient } from '../DotYouClient';
import { TargetDrive } from '../core';
import { Command, ReceivedCommand } from './CommandTypes';

export const sendCommand = (
  dotYouClient: DotYouClient,
  command: Command,
  targetDrive: TargetDrive
): Promise<{ recipientStatus: Record<string, unknown> }> => {
  const client = dotYouClient.createAxiosClient();

  return client.post('commands/send', { command, targetDrive }).then((response) => {
    return response.data;
  });
};

export const getCommands = (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  cursorState?: string
): Promise<{ receivedCommands: ReceivedCommand[] }> => {
  const client = dotYouClient.createAxiosClient();

  return client
    .post('commands/unprocessed', { targetDrive, cursur: cursorState })
    .then((response) => {
      return response.data;
    });
};

export const markCommandComplete = (
  dotYouClient: DotYouClient,
  targetDrive: TargetDrive,
  commandIdList: string[]
): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();

  return client.post('commands/markcompleted', { targetDrive, commandIdList }).then((response) => {
    return response.data;
  });
};
