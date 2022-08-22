import {Guid} from 'guid-typescript';
import {TargetDrive} from '../../core/DriveData/DriveTypes';
import {ProfileConfig} from '../../profile/ProfileConfig';
import {DataUtil} from "../../core/DataUtil";

export class HomePageConfig {
  static readonly DefaultDriveId = DataUtil.toByteArrayId("homepage_drive");

  static readonly ChannelDefinitionAlias = Guid.parse('99999789-7777-7777-7777-000000007777');
  static readonly AttributeTypeNotApplicable = Guid.parse('00000000-0000-0000-0000-000000000000');
  static readonly AttributeSectionNotApplicable = Guid.parse(
    '00000000-0000-0000-0000-000000000000'
  );
  static readonly BlogMainContentDriveId = HomePageConfig.DefaultDriveId;

  static readonly LinkFileType: number = 777;

  static readonly HomepageTargetDrive: TargetDrive = {
    alias: DataUtil.toByteArrayId("homepage_drive"),
    type: ProfileConfig.ProfileDriveType,
  };
}

export class HomePageAttributes {
  static readonly Theme: Guid = Guid.parse('66664444-4444-4444-4444-000000007777');
  static readonly HomePage: Guid = Guid.parse('88884444-4444-4444-4444-000000007777');
  // static readonly Links: Guid = Guid.parse("99994444-4444-4444-4444-000000007777");
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

// export const HomePageOptions: ProviderOptions = {
//   api: ApiType.Owner,
//   sharedSecret: null,
// };
