
import {HomePageAttributes, HomePageConfig} from "./Types";
import {Guid} from "guid-typescript";
import {Attribute, OrderedAttributeList, SecureAttribute, SecureAttributeDictionary} from "../AttributeData/AttributeDataTypes";
import {ProviderBase, ProviderOptions} from "../ProviderBase";
import {createAttributeDataProvider} from "../AttributeData/AttributeDataProvider";
import {SecurityGroupType} from "../TransitTypes";

export type HomePageProviderOptions = Omit<ProviderOptions, 'appId'>;

export class HomePageProvider extends ProviderBase {

    constructor(options: HomePageProviderOptions) {
        super({
            appId: HomePageConfig.AppId,
            api: options.api,
            sharedSecret: options.sharedSecret
        });
    }

    async getPublicConfig(): Promise<Attribute | null> {
        const op = createAttributeDataProvider(this.getOptions());
        let attr = await op.getAttributeVersions(HomePageConfig.DefaultDriveId, HomePageAttributes.Theme);
        return attr?.versions[0] ?? null
    }

    async getConfig(): Promise<SecureAttribute | null> {
        const op = createAttributeDataProvider(this.getOptions());
        let dict = await op.getAttributeDictionary(HomePageConfig.DefaultDriveId, HomePageAttributes.Theme)

        //only support an anonymous file 
        return dict ? dict[SecurityGroupType.Anonymous] : null;
    }

    //saves configuration and returns an updated version with a fileId
    async saveConfig(cfg: SecureAttribute): Promise<SecureAttribute> {

        this.AssertHasSharedSecret();

        const op = createAttributeDataProvider(this.getOptions());
        cfg.attributeId = HomePageAttributes.Theme;
        cfg.driveId = HomePageConfig.DefaultDriveId;

        if (cfg.accessControlList) {
            cfg.accessControlList.requiredSecurityGroup = SecurityGroupType.Anonymous;
        } else {
            cfg.accessControlList = {requiredSecurityGroup: SecurityGroupType.Anonymous};
        }

        return await op.saveAttributeUnencrypted(cfg);
    }
    
    async getAttributeVersions(attributeId: Guid): Promise<OrderedAttributeList | null> {
        const op = createAttributeDataProvider(this.getOptions());
        return op.getAttributeVersions(HomePageConfig.DefaultDriveId, attributeId);
    }

    async getAttributeDictionary(attributeId: Guid): Promise<SecureAttributeDictionary | null> {
        const op = createAttributeDataProvider(this.getOptions());
        return op.getAttributeDictionary(HomePageConfig.DefaultDriveId, attributeId);
    }

    async saveAttributeDictionary(attributeId: Guid, dictionary: SecureAttributeDictionary): Promise<SecureAttributeDictionary> {
        const op = createAttributeDataProvider(this.getOptions());
        return await op.saveAttributeDictionaryUnencrypted(HomePageConfig.DefaultDriveId, attributeId, dictionary);
    }
}

export function createHomePageProvider(options: HomePageProviderOptions) {
    return new HomePageProvider(options);
}

