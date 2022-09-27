import { Guid } from 'guid-typescript';
import { TargetDrive } from '../../core/DriveData/DriveTypes';
import { ProfileConfig } from '../../profile/ProfileConfig';
import { DataUtil } from '../../core/DataUtil';

export class HomePageConfig {
  static readonly DefaultDriveId = DataUtil.toGuidId('homepage_drive');

  static readonly AttributeTypeNotApplicable = DataUtil.toGuidId('type_not_applicable');
  static readonly AttributeSectionNotApplicable = DataUtil.toGuidId('section_not_applicable');
  static readonly BlogMainContentDriveId = HomePageConfig.DefaultDriveId;

  static readonly LinkFileType: number = 777;

  static readonly HomepageTargetDrive: TargetDrive = {
    alias: DataUtil.toGuidId('homepage_drive'),
    type: ProfileConfig.ProfileDriveType,
  };
}

export class HomePageAttributes {
  static readonly Theme: Guid = Guid.parse('66664444-4444-4444-4444-000000007777');
  static readonly HomePage: Guid = Guid.parse('88884444-4444-4444-4444-000000007777');
}

export enum HomePageTheme {
  CoverPage = 111,
  SocialClassic = 222,
  ContentProducer = 333,
}

export class HomePageFields {
  static readonly HeaderImageId: string = 'headerImageUrl';
  static readonly TagLineId: string = 'tagLine';
  static readonly LeadTextId: string = 'leadText';
}

export class HomePageThemeFields {
  static readonly ThemeId: string = 'themeId';
  static readonly UseDarkMode: string = 'useDarkMode';
}
