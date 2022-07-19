import AttributeDataProvider from './core/AttributeData/AttributeDataProvider';
import DriveProvider from './core/DriveData/DriveProvider';
import MediaProvider from './core/MediaProvider';
import { ProviderOptions } from './core/ProviderBase';
import TransitProvider from './core/TransitData/TransitProvider';
import ProfileDataProvider from './profile/ProfileDataProvider';
import ProfileDefinitionProvider from './profile/ProfileDefinitionProvider';
import BlogDefinitionProvider from './public/blog/BlogDefinitionProvider';
import BlogPostProvider from './public/blog/BlogPostProvider';
import BlogPostReadonlyProvider from './public/blog/BlogPostReadonlyProvider';
import HomePageProvider from './public/home/HomePageProvider';

export class Client {
  private _cfg: ProviderOptions;

  // Core Providers:
  driveProvider: DriveProvider;
  transitProvider: TransitProvider;
  attributeDataProvider: AttributeDataProvider;
  mediaProvider: MediaProvider;

  // Profile Providers
  profileDataProvider: ProfileDataProvider;
  profileDefinitionProvider: ProfileDefinitionProvider;

  // Blog Providers:
  blogDefinitionProvider: BlogDefinitionProvider;
  blogPostProvider: BlogPostProvider;
  blogPostReadonlyProvider: BlogPostReadonlyProvider;

  // Home Providers:
  homePageProvider: HomePageProvider;

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

    // Profile Providers
    this.profileDataProvider = new ProfileDataProvider({
      ...this._cfg,
      attributeDataProvider: this.attributeDataProvider,
    });
    this.profileDefinitionProvider = new ProfileDefinitionProvider({
      ...this._cfg,
      driveProvider: this.driveProvider,
      transitProvider: this.transitProvider,
    });

    // Blog Providers:
    this.blogDefinitionProvider = new BlogDefinitionProvider({
      ...this._cfg,
      driveProvider: this.driveProvider,
      transitProvider: this.transitProvider,
    });
    this.blogPostProvider = new BlogPostProvider({
      ...this._cfg,
      driveProvider: this.driveProvider,
      transitProvider: this.transitProvider,
      mediaProvider: this.mediaProvider,
    });
    this.blogPostReadonlyProvider = new BlogPostReadonlyProvider({
      ...this._cfg,
      blogDefinitionProvider: this.blogDefinitionProvider,
      driveProvider: this.driveProvider,
    });

    // Home Providers:
    this.homePageProvider = new HomePageProvider({
      ...this._cfg,
      attributeDataProvider: this.attributeDataProvider,
      driveProvider: this.driveProvider,
      transitProvider: this.transitProvider,
    });
  }
}
