import { TargetDrive } from '../DriveData/DriveTypes';
import { ProviderBase, ProviderOptions } from '../ProviderBase';
import { Command, ReceivedCommand } from './CommandTypes';

export class CommandProvider extends ProviderBase {
  constructor(options: ProviderOptions) {
    super(options);
  }

  async sendCommand(
    command: Command,
    targetDrive: TargetDrive
  ): Promise<{ recipientStatus: Record<string, unknown> }> {
    const client = this.createAxiosClient();

    return client.post('commands/send', { command, targetDrive }).then((response) => {
      return response.data;
    });
  }

  async getCommands(
    targetDrive: TargetDrive,
    cursorState?: string
  ): Promise<{ receivedCommands: ReceivedCommand[] }> {
    const client = this.createAxiosClient();

    return client
      .post('commands/unprocessed', { targetDrive, cursur: cursorState })
      .then((response) => {
        return response.data;
      });
  }

  async markComplete(targetDrive: TargetDrive, commandIdList: string[]): Promise<boolean> {
    const client = this.createAxiosClient();

    return client
      .post('commands/markcompleted', { targetDrive, commandIdList })
      .then((response) => {
        return response.data;
      });
  }
}
