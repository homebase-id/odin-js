import { TargetDrive } from '../../core/DriveData/DriveFileTypes';
import { toGuidId } from '../../helpers/helpers';
import { ProfileConfig } from '../../profile/ProfileData/ProfileConfig';

export class HomePageConfig {
  static readonly DefaultDriveId = toGuidId('homepage_drive');

  static readonly AttributeTypeNotApplicable = toGuidId('type_not_applicable');
  static readonly AttributeSectionNotApplicable = toGuidId('section_not_applicable');
  static readonly BlogMainContentDriveId = HomePageConfig.DefaultDriveId;

  static readonly LinkFileType: number = 777;

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
  SocialClassic = 222,
  ContentProducer = 333,
  Links = 444,
}

export class HomePageThemeFields {
  static readonly Favicon: string = 'favicon';
  static readonly Colors: string = 'colors';

  static readonly ThemeId: string = 'themeId';

  // Social Classic / Content Producer
  static readonly HeaderImageId: string = 'headerImageId';
  static readonly Tabs: string = 'tabs';
  static readonly TabsOrder: string = 'tabsOrder';

  // Cover Page
  static readonly TagLineId: string = 'tagLine';
  static readonly LeadTextId: string = 'leadText';
}
