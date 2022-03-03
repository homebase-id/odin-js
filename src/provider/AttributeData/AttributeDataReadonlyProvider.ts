import {Guid} from "guid-typescript";
import {Attribute, OrderedAttributeList} from "./AttributeDataTypes";
import {DriveSearchResult, KeyHeader, QueryParams} from "../DriveTypes";
import {ProviderBase, ProviderOptions} from "../ProviderBase";
import {createDriveProvider} from "../DriveProvider";
import {DataUtil} from "../DataUtil";

const FixedKeyHeader: KeyHeader =
    {
        iv: new Uint8Array(Array(16).fill(1)),
        aesKey: new Uint8Array(Array(16).fill(1))
    };

//Provides read access to attribute data; assumes the caller only has read access to data
class AttributeDataReadonlyProvider extends ProviderBase {

    constructor(options: ProviderOptions | null) {
        if (!options?.appId) {
            throw new Error("Missing App Id")
        }
        super(options);

    }

    //gets all versions of an attribute available to the caller
    async getAttributeVersions(driveId: Guid, attributeId: Guid): Promise<OrderedAttributeList | null> {

        const dp = createDriveProvider(this.getOptions());

        let qp: QueryParams = {
            driveIdentifier: driveId.toString(),
            includeMetadataHeader: false,
            includePayload: true,
            tag: attributeId.toString(),
            pageNumber: 1,
            pageSize: 10 //this should be the number of security group types.  
        };

        let searchResults = await dp.GetFilesByTag<any>(qp);

        let versions: Attribute[] = [];

        for (const key in searchResults.results) {

            let dsr: DriveSearchResult<any> = searchResults.results[key];

            let fileId = Guid.parse(dsr.fileId);

            if (dsr.payloadIsEncrypted) {
                throw new Error("Attribute is encrypted:TODO support this");
            }

            let attr: Attribute;

            if (dsr.payloadTooLarge) {
                attr = await dp.GetPayloadAsJson<any>(fileId, FixedKeyHeader);
            } else {
                let bytes = await dp.DecryptUsingKeyHeader(DataUtil.base64ToUint8Array(dsr.payloadContent), FixedKeyHeader);
                let json = DataUtil.byteArrayToString(bytes);
                attr = JSON.parse(json);
            }

            attr.priority = dsr.priority
            versions.push(attr);
        }

        let list: OrderedAttributeList = {
            driveId: driveId,
            attributeId: attributeId,
            versions: versions
        };

        return list ?? null;
    }

}

export function createAttributeDataReadonlyProvider(options: ProviderOptions) {
    return new AttributeDataReadonlyProvider(options);
}