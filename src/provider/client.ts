import { AttributeDataProvider } from './core/AttributeData/AttributeDataProvider';
import { DriveProvider } from './core/DriveData/DriveProvider';
import { MediaProvider } from './core/MediaData/MediaProvider';
import { ProviderOptions } from './core/ProviderBase';
import { ProfileDefinitionProvider } from './profile/ProfileDefinitionProvider';
import { BlogDefinitionProvider } from './public/blog/BlogDefinitionProvider';
import { BlogPostReadonlyProvider } from './public/blog/BlogPostReadonlyProvider';

export class Client {
  private _cfg: ProviderOptions;

  // Core Providers:
  driveProvider: DriveProvider;

  attributeDataProvider: AttributeDataProvider;
  mediaProvider: MediaProvider;

  // Definition Providers
  blogDefinitionProvider: BlogDefinitionProvider;
  profileDefinitionProvider: ProfileDefinitionProvider;

  // Blog Providers:
  blogPostReadonlyProvider: BlogPostReadonlyProvider;

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

    // Definition Providers
    this.blogDefinitionProvider = new BlogDefinitionProvider({
      ...this._cfg,
      driveProvider: this.driveProvider,
    });
    this.profileDefinitionProvider = new ProfileDefinitionProvider({
      ...this._cfg,
      driveProvider: this.driveProvider,
    });

    // Blog Providers:
    this.blogPostReadonlyProvider = new BlogPostReadonlyProvider({
      ...this._cfg,
      blogDefinitionProvider: this.blogDefinitionProvider,
      driveProvider: this.driveProvider,
    });
  }
}
