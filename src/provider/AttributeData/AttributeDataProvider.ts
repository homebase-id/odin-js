import {Guid} from "guid-typescript";

import {AttributeData, OrderedAttributeList, SecureAttribute, SecureAttributeDictionary} from "./AttributeDataTypes";

import {DriveSearchResult, KeyHeader, QueryParams} from "../DriveTypes";
import {ProviderBase, ProviderOptions} from "../ProviderBase";
import {createDriveProvider} from "../DriveProvider";
import {SecurityGroupType, UploadFileMetadata, UploadInstructionSet, UploadResult} from "../TransitTypes";
import {DataUtil} from "../DataUtil";
import {createTransitProvider} from "../TransitProvider";

const FixedKeyHeader: KeyHeader =
    {
        iv: new Uint8Array(Array(16).fill(1)),
        aesKey: new Uint8Array(Array(16).fill(1))
    };

//Provides read write to attribute data
class AttributeDataProvider extends ProviderBase {

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

        let versions: AttributeData[] = [];

        for (const key in searchResults.results) {

            let dsr: DriveSearchResult<any> = searchResults.results[key];

            let fileId = Guid.parse(dsr.fileId);

            if (dsr.payloadIsEncrypted) {
                throw new Error("Attribute is encrypted:TODO support this");
            }

            let attr: AttributeData = {
                priority: dsr.priority,
                data: null
            }

            if (dsr.payloadTooLarge) {
                attr.data = await dp.GetPayloadAsJson<any>(fileId, FixedKeyHeader);
            } else {
                let bytes = await dp.DecryptUsingKeyHeader(DataUtil.base64ToUint8Array(dsr.payloadContent), FixedKeyHeader);
                let json = DataUtil.byteArrayToString(bytes);
                attr.data = JSON.parse(json);
            }

            versions.push(attr);
        }
        
        //TODO: need to sort the attributes correctly.  where the lowest attribute is the highest priority info

        let list: OrderedAttributeList = {
            driveId: driveId,
            attributeId: attributeId,
            versions: versions
        };

        return list ?? null;
    }

    //gets the data available for the specified attribute if available
    async getAttributeDictionary(driveId: Guid, attributeId: Guid): Promise<SecureAttributeDictionary | null> {

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

        //@ts-ignore
        let dict: SecureAttributeDictionary = {};

        //Create a SecureAttribute for each DriveSearchResult
        for (const key in searchResults.results) {

            let dsr: DriveSearchResult<any> = searchResults.results[key];

            let fileId = Guid.parse(dsr.fileId);

            if (dsr.payloadIsEncrypted) {
                throw new Error("Attribute is encrypted:TODO support this");
            }

            let payload: AttributeData;

            if (dsr.payloadTooLarge) {
                payload = await dp.GetPayloadAsJson<any>(fileId, FixedKeyHeader);
            } else {
                let bytes = await dp.DecryptUsingKeyHeader(DataUtil.base64ToUint8Array(dsr.payloadContent), FixedKeyHeader);
                let json = DataUtil.byteArrayToString(bytes);
                payload = JSON.parse(json);
            }

            let secureAttr: SecureAttribute = {
                driveId: driveId,
                attributeId: attributeId,
                fileId: fileId,
                content: payload,
                tags: dsr.tags,
                accessControlList: dsr.accessControlList
            }

            //Note: the access control list is null when the user is not the owner
            //so for scenarios like youauth, this this attr.accesscontrolist will be null
            //
            // how to handle this?

            dict[secureAttr.accessControlList.requiredSecurityGroup] = secureAttr;
        }

        return dict ?? null;
    }

    //Saves the attribute and returns an updated version with a server-specified fileId
    async saveAttributeUnencrypted(attribute: SecureAttribute): Promise<SecureAttribute> {

        const tp = createTransitProvider(this.getOptions());

        if (!attribute?.attributeId || !attribute?.driveId) {
            throw "Attribute is missing attributeId or driveId";
        }

        let instructionSet: UploadInstructionSet = {
            transferIv: tp.Random16(),
            storageOptions: {
                overwriteFileId: Guid.isGuid(attribute?.fileId ?? "") ? attribute.fileId.toString() : null,
                driveIdentifier: attribute.driveId.toString()
            },
            transitOptions: null
        };

        let metadata: UploadFileMetadata = {
            contentType: "application/json",
            appData: {
                tags: [attribute.attributeId.toString()], //note: Intentionally not using the .tags property as we only want to tag with this attribute id
                contentIsComplete: false,
                fileType: 0,
                payloadIsEncrypted: false,
                jsonContent: null
            },
            accessControlList: attribute.accessControlList
        }

        let payloadJson: string = DataUtil.JsonStringify64(attribute.content);
        // console.debug("payload", payloadJson);
        let payloadBytes = DataUtil.stringToUint8Array(payloadJson);
        let result: UploadResult = await tp.UploadUsingKeyHeader(FixedKeyHeader, instructionSet, metadata, payloadBytes);

        //update server-side info
        attribute.fileId = Guid.parse(result.file.fileId);
        return attribute;
    }

    async saveAttributeDictionary(driveId: Guid, attributeId: Guid, dict: SecureAttributeDictionary): Promise<SecureAttributeDictionary> {
        //TODO: figure out how encryption goes
        return await this.saveAttributeDictionaryUnencrypted(driveId, attributeId, dict);
    }

    //Saves a dictionary of attributes and returns an updated version with fileIds from the server
    async saveAttributeDictionaryUnencrypted(driveId: Guid, attributeId: Guid, dict: SecureAttributeDictionary): Promise<SecureAttributeDictionary> {

        const types = Object.keys(SecurityGroupType);
        for (const idx in types) {
            let sg = types[idx];
            let attr: SecureAttribute = dict[sg];
            if (attr) {
                attr.attributeId = attributeId;
                attr.driveId = driveId;
                attr.accessControlList.requiredSecurityGroup = SecurityGroupType[sg];
                dict[sg] = await this.saveAttributeUnencrypted(attr);
            }
        }

        return dict;
    }
}

export function createAttributeDataProvider(options: ProviderOptions) {
    return new AttributeDataProvider(options);
}