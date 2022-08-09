import AttributeDataProvider from './core/AttributeData/AttributeDataProvider';
import { DriveProvider } from './core/DriveData/DriveProvider';
import MediaProvider from './core/MediaData/MediaProvider';
import { ProviderOptions } from './core/ProviderBase';
import TransitProvider from './core/TransitData/TransitProvider';

export class CoreClient {
  private _cfg: ProviderOptions;

  // Core Providers:
  driveProvider: DriveProvider;
  transitProvider: TransitProvider;
  attributeDataProvider: AttributeDataProvider;
  mediaProvider: MediaProvider;

  constructor(cfg: ProviderOptions) {
    this._cfg = cfg;

    // Core Providers:
    this.driveProvider = new DriveProvider(this._cfg);
    this.transitProvider = new TransitProvider(this._cfg);
    this.attributeDataProvider = new AttributeDataProvider({
      ...this._cfg,
      driveProvider: this.driveProvider,
      transitProvider: this.transitProvider,
    });

    this.mediaProvider = new MediaProvider({
      ...this._cfg,
      driveProvider: this.driveProvider,
      transitProvider: this.transitProvider,
    });
  }
}
