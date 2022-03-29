import {Guid} from "guid-typescript";
import {fixAttribute} from "../AttributeData/AttributeDataTypes";


export class ProfileConfig {
    static readonly AppId: Guid = Guid.parse("99999789-4444-4444-4444-000000004444");
}


export class BuiltInProfiles {
    static readonly StandardProfile: Guid = Guid.parse("99999789-4444-4444-4444-000000006666");
    static readonly FinancialProfile: Guid = Guid.parse("99999789-4444-4444-4444-000000007777");
}


export class BuiltInAttributes {
    static readonly PersonalInfo: Guid = Guid.parse("33334444-4444-4444-4444-000000004440");
    static ProfilePhotos: Guid = Guid.parse("66664444-4444-4444-4444-000000004440");
    static Bio: Guid = Guid.parse("77774444-4444-4444-4444-000000004440");
    static CreditCards: Guid = Guid.parse("88884444-4444-4444-4444-000000004440");
    static Social: Guid = Guid.parse("99994444-4444-4444-4444-000000004440");
}

export class MinimalProfileFields {
    static readonly ProfileImageUrlId: string = fixAttribute(Guid.parse("33334444-0000-4444-4444-000000004444"));
    static readonly BioId: string = fixAttribute(Guid.parse("33334444-1111-4444-4444-000000004444"));
    static readonly GiveNameId: string = fixAttribute(Guid.parse("33334444-2222-4444-4444-000000004444"));
    static readonly SurnameId: string = fixAttribute(Guid.parse("33334444-3333-4444-4444-000000004444"));
}

