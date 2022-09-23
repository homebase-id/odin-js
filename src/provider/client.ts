import AttributeDataProvider from './core/AttributeData/AttributeDataProvider';
import { DriveProvider } from './core/DriveData/DriveProvider';
import { MediaProvider } from './core/MediaData/MediaProvider';
import { ProviderOptions } from './core/ProviderBase';
import ProfileDataProvider from './profile/ProfileDataProvider';
import ProfileDefinitionProvider from './profile/ProfileDefinitionProvider';
import BlogDefinitionProvider from './public/blog/BlogDefinitionProvider';
import BlogPostProvider from './public/blog/BlogPostProvider';
import BlogPostReadonlyProvider from './public/blog/BlogPostReadonlyProvider';
import HomePageProvider from './public/home/HomePageProvider';

export class Client {
  private _cfg: ProviderOptions;

  // Core Providers:
  private _driveProvider: DriveProvider;

  private _attributeDataProvider: AttributeDataProvider;
  mediaProvider: MediaProvider;

  // Definition Providers
  blogDefinitionProvider: BlogDefinitionProvider;
  profileDefinitionProvider: ProfileDefinitionProvider;

  // Profile Providers
  profileDataProvider: ProfileDataProvider;

  // Blog Providers:
  blogPostProvider: BlogPostProvider;
  blogPostReadonlyProvider: BlogPostReadonlyProvider;

  // Home Providers:
  homePageProvider: HomePageProvider;

  constructor(cfg: ProviderOptions) {
    this._cfg = cfg;

    // Core Providers:
    this._driveProvider = new DriveProvider(this._cfg);

    this._attributeDataProvider = new AttributeDataProvider({
      ...this._cfg,
      driveProvider: this._driveProvider,
    });
    this.mediaProvider = new MediaProvider({
      ...this._cfg,
      driveProvider: this._driveProvider,
    });

    // Definition Providers
    this.blogDefinitionProvider = new BlogDefinitionProvider({
      ...this._cfg,
      driveProvider: this._driveProvider,
    });
    this.profileDefinitionProvider = new ProfileDefinitionProvider({
      ...this._cfg,
      driveProvider: this._driveProvider,
    });

    // Profile Providers
    this.profileDataProvider = new ProfileDataProvider({
      ...this._cfg,
      attributeDataProvider: this._attributeDataProvider,
      mediaProvider: this.mediaProvider,
    });

    // Blog Providers:

    this.blogPostProvider = new BlogPostProvider({
      ...this._cfg,
      driveProvider: this._driveProvider,
      mediaProvider: this.mediaProvider,
      blogDefinitionProvider: this.blogDefinitionProvider,
    });
    this.blogPostReadonlyProvider = new BlogPostReadonlyProvider({
      ...this._cfg,
      blogDefinitionProvider: this.blogDefinitionProvider,
      driveProvider: this._driveProvider,
    });

    // Home Providers:
    this.homePageProvider = new HomePageProvider({
      ...this._cfg,
      attributeDataProvider: this._attributeDataProvider,
      driveProvider: this._driveProvider,
    });
  }
}
