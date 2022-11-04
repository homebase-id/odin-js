import { AttributeDataProvider } from './core/AttributeData/AttributeDataProvider';
import { CommandProvider } from './core/CommandData/CommandProvider';
import { DriveProvider } from './core/DriveData/DriveProvider';
import { MediaProvider } from './core/MediaData/MediaProvider';
import { ProviderOptions } from './core/ProviderBase';

export class CoreClient {
  private _cfg: ProviderOptions;

  // Core Providers:
  driveProvider: DriveProvider;
  attributeDataProvider: AttributeDataProvider;
  mediaProvider: MediaProvider;
  commandProvider: CommandProvider;

  constructor(cfg: ProviderOptions) {
    this._cfg = cfg;

    // Core Providers:
    this.driveProvider = new DriveProvider(this._cfg);
    this.attributeDataProvider = new AttributeDataProvider({
      ...this._cfg,
      driveProvider: this.driveProvider,
    });
    this.mediaProvider = new MediaProvider({
      ...this._cfg,
      driveProvider: this.driveProvider,
    });
    this.commandProvider = new CommandProvider({
      ...this._cfg,
    });
  }
}
