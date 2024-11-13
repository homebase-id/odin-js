import { TargetDrive } from '../../core/DriveData/File/DriveFileTypes';
import { toGuidId } from '../../helpers/helpers';
import { ProfileConfig } from '../../profile/ProfileData/ProfileConfig';

export class HomePageConfig {
  static readonly DefaultDriveId = toGuidId('homepage_drive');

  static readonly AttributeTypeNotApplicable = toGuidId('type_not_applicable');
  static readonly AttributeSectionNotApplicable = toGuidId('section_not_applicable');
  static readonly BlogMainContentDriveId = HomePageConfig.DefaultDriveId;

  static readonly HomepageTargetDrive: TargetDrive = {
    alias: toGuidId('homepage_drive'),
    type: ProfileConfig.ProfileDriveType,
  };
}

export class HomePageAttributes {
  static readonly Theme = toGuidId('theme_attribute');
  static readonly HomePage = toGuidId('homepage_attribute');
}

export enum HomePageTheme {
  CoverPage = 111,
  VerticalPosts = 222,
  HorizontalPosts = 333,
  Links = 444,
}

export class HomePageThemeFields {
  static readonly Favicon: string = 'favicon';
  static readonly Colors: string = 'colors';

  static readonly ThemeId: string = 'themeId';

  // Social Classic / Content Producer
  static readonly HeaderImageKey: string = 'headerImageKey';
  static readonly Tabs: string = 'tabs';
  static readonly TabsOrder: string = 'tabsOrder';

  // Cover Page
  static readonly TagLineId: string = 'tagLine';
  static readonly LeadTextId: string = 'leadText';
}
