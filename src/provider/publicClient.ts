import AttributeDataProvider from './core/AttributeData/AttributeDataProvider';
import { DriveProvider } from './core/DriveData/DriveProvider';
import MediaProvider from './core/MediaData/MediaProvider';
import { ProviderOptions } from './core/ProviderBase';
import TransitProvider from './core/TransitData/TransitProvider';
import ProfileDataProvider from './profile/ProfileDataProvider';
import BlogDefinitionProvider from './public/blog/BlogDefinitionProvider';
import BlogPostReadonlyProvider from './public/blog/BlogPostReadonlyProvider';
import FileReadOnlyProvider from './public/file/FileReadOnlyProvider';
import HomePageProvider from './public/home/HomePageProvider';

export class PublicClient {
  private _cfg: ProviderOptions;

  // Core Providers:
  private _driveProvider: DriveProvider;
  private _transitProvider: TransitProvider;
  private _attributeDataProvider: AttributeDataProvider;

  // Definition Providers:
  private _blogDefinitionProvider: BlogDefinitionProvider;

  // Profile Providers:
  profileDataProvider: ProfileDataProvider;

  // File Providers
  fileReadOnlyProvider: FileReadOnlyProvider;

  // Blog Providers:
  blogPostReadonlyProvider: BlogPostReadonlyProvider;

  // Home Providers:
  homePageProvider: HomePageProvider;

  // Media Provider:
  mediaProvider: MediaProvider;

  constructor(cfg: ProviderOptions) {
    this._cfg = cfg;

    // Core Providers (Private):
    this._driveProvider = new DriveProvider(this._cfg);
    this._transitProvider = new TransitProvider(this._cfg);
    this._attributeDataProvider = new AttributeDataProvider({
      ...this._cfg,
      driveProvider: this._driveProvider,
      transitProvider: this._transitProvider,
    });

    // Profile Providers
    this.profileDataProvider = new ProfileDataProvider({
      ...this._cfg,
      attributeDataProvider: this._attributeDataProvider,
    });

    this.fileReadOnlyProvider = new FileReadOnlyProvider({
      ...this._cfg,
    });

    // Blog Providers:
    this._blogDefinitionProvider = new BlogDefinitionProvider({
      ...this._cfg,
      driveProvider: this._driveProvider,
      transitProvider: this._transitProvider,
    });

    this.blogPostReadonlyProvider = new BlogPostReadonlyProvider({
      ...this._cfg,
      blogDefinitionProvider: this._blogDefinitionProvider,
      driveProvider: this._driveProvider,
    });

    // Home Providers:
    this.homePageProvider = new HomePageProvider({
      ...this._cfg,
      attributeDataProvider: this._attributeDataProvider,
      driveProvider: this._driveProvider,
      transitProvider: this._transitProvider,
    });

    // Media Provider:
    this.mediaProvider = new MediaProvider({
      ...this._cfg,
      driveProvider: this._driveProvider,
      transitProvider: this._transitProvider,
    });
  }
}
