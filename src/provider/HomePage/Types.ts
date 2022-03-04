import {Guid} from "guid-typescript";

export class HomePageConfig {
    static readonly AppId: Guid = Guid.parse("99999789-6666-6666-6666-000000001111");
    static readonly DefaultDriveId = Guid.parse("99999789-6666-6666-6666-000000005555");
}

export class HomePageAttributes {
    static readonly Theme: Guid = Guid.parse("66664444-4444-4444-4444-000000007777");
    static readonly HomePage: Guid = Guid.parse("88884444-4444-4444-4444-000000007777");
    static readonly Links: Guid = Guid.parse("99994444-4444-4444-4444-000000007777");
}

export class HomePageFields {
    static readonly HeaderImageId: string = "headerImageUrl";
    static readonly TagLineId: string = "tagLine";
    static readonly LeadTextId: string = "leadText";
}

export class HomePageThemeFields {
    static readonly ThemeId: string = "themeId";
    static readonly UseDarkMode: string = "useDarkMode";
}
