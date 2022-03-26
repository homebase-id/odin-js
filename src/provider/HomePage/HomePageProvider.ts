import {HomePageAttributes, HomePageConfig} from "./Types";
import {Guid} from "guid-typescript";
import {AttributeData, OrderedAttributeList, SecureAttributeDictionary} from "../AttributeData/AttributeDataTypes";
import {ProviderBase, ProviderOptions} from "../ProviderBase";
import {createAttributeDataProvider} from "../AttributeData/AttributeDataProvider";

export type HomePageProviderOptions = Omit<ProviderOptions, 'appId'>;

export class HomePageProvider extends ProviderBase {

    constructor(options: HomePageProviderOptions) {
        super({
            appId: HomePageConfig.AppId,
            api: options.api,
            sharedSecret: options.sharedSecret
        });
    }

    async getPublicConfig(): Promise<AttributeData | null> {
        const op = createAttributeDataProvider(this.getOptions());
        let attr = await op.getAttributeVersions(HomePageConfig.DefaultDriveId, HomePageAttributes.Theme);
        return attr?.versions[0] ?? null
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

