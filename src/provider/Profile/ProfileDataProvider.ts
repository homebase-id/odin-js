import {Guid} from "guid-typescript";
import {SecureAttributeDictionary} from "../AttributeData/AttributeDataTypes";
import {ProviderBase, ProviderOptions} from "../ProviderBase";
import {BuiltInAttributes, BuiltInProfiles, ProfileConfig} from "./ProfileConfig";
import {createAttributeDataProvider} from "../AttributeData/AttributeDataReadWriteProvider";

export type ProfileDataProviderOptions = Omit<ProviderOptions, 'appId'>;
class ProfileDataProvider extends ProviderBase {

    constructor(options: ProfileDataProviderOptions) {
        super({
            appId: ProfileConfig.AppId,
            api: options.api,
            sharedSecret: options.sharedSecret
        });
    }

    async getStandardProfileAttribute(attributeId: Guid): Promise<SecureAttributeDictionary | null> {
        return await this.getAttributeProvider().getAttributeDictionary(BuiltInProfiles.StandardProfile, attributeId);
    }

    async getFinancialProfileAttribute(attributeId: Guid): Promise<SecureAttributeDictionary | null> {
        return await this.getAttributeProvider().getAttributeDictionary(BuiltInProfiles.FinancialProfile, attributeId);
    }

    async saveStandardProfileAttribute(attributeId: Guid, dictionary: SecureAttributeDictionary): Promise<SecureAttributeDictionary> {
        return this.saveProfileAttributeDictionary(BuiltInProfiles.StandardProfile, attributeId, dictionary);
    }

    async saveFinancialProfileAttribute(attributeId: Guid, dictionary: SecureAttributeDictionary): Promise<SecureAttributeDictionary> {
        return this.saveProfileAttributeDictionary(BuiltInProfiles.FinancialProfile, attributeId, dictionary);
    }
    
    //gets the data available for the specified attribute if available
    async getProfileAttributeDictionary(profileId: Guid, attributeId: Guid): Promise<SecureAttributeDictionary | null> {
        return this.getAttributeProvider().getAttributeDictionary(profileId, attributeId);
    }

    async saveProfileAttributeDictionary(profileId: Guid, attributeId: Guid, dictionary: SecureAttributeDictionary): Promise<SecureAttributeDictionary> {
        return await this.getAttributeProvider().saveAttributeDictionary(profileId, BuiltInAttributes.PersonalInfo, dictionary);
    }

    private getAttributeProvider() {
        return createAttributeDataProvider(this.getOptions());
    }
}

export function createProfileDataProvider(options: ProfileDataProviderOptions) {
    return new ProfileDataProvider(options);
}