import { AttributeDataProvider } from './core/AttributeData/AttributeDataProvider';
import { DriveProvider } from './core/DriveData/DriveProvider';
import { MediaProvider } from './core/MediaData/MediaProvider';
import { ProviderOptions } from './core/ProviderBase';
import { BlogDefinitionProvider } from './public/blog/BlogDefinitionProvider';
import { BlogPostReadonlyProvider } from './public/blog/BlogPostReadonlyProvider';
import { CircleNetworkReadOnlyProvider } from './public/circleNetwork/CircleNetworkReadOnlyProvider';
import { FileReadOnlyProvider } from './public/file/FileReadOnlyProvider';

export class PublicClient {
  private _cfg: ProviderOptions;

  // Core Providers:
  private _driveProvider: DriveProvider;
  attributeDataProvider: AttributeDataProvider;

  // Definition Providers:
  private _blogDefinitionProvider: BlogDefinitionProvider;

  // File Providers
  fileReadOnlyProvider: FileReadOnlyProvider;

  // Blog Providers:
  blogPostReadonlyProvider: BlogPostReadonlyProvider;

  // Connection Providers:
  circleNetworkReadOnlyProvider: CircleNetworkReadOnlyProvider;

  // Media Provider:
  mediaProvider: MediaProvider;

  constructor(cfg: ProviderOptions) {
    this._cfg = cfg;

    // Core Providers (Private):
    this._driveProvider = new DriveProvider(this._cfg);
    this.attributeDataProvider = new AttributeDataProvider({
      ...this._cfg,
      driveProvider: this._driveProvider,
    });

    // Media Provider:
    this.mediaProvider = new MediaProvider({
      ...this._cfg,
      driveProvider: this._driveProvider,
    });

    this.fileReadOnlyProvider = new FileReadOnlyProvider({
      ...this._cfg,
    });

    // Blog Providers:
    this._blogDefinitionProvider = new BlogDefinitionProvider({
      ...this._cfg,
      driveProvider: this._driveProvider,
    });

    this.blogPostReadonlyProvider = new BlogPostReadonlyProvider({
      ...this._cfg,
      blogDefinitionProvider: this._blogDefinitionProvider,
      driveProvider: this._driveProvider,
    });

    // Connection providers
    this.circleNetworkReadOnlyProvider = new CircleNetworkReadOnlyProvider({
      ...this._cfg,
    });
  }
}
