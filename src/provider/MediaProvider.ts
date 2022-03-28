import {Guid} from "guid-typescript";
import {ProviderBase, ProviderOptions} from "./ProviderBase";
import {KeyHeader} from "./DriveTypes";
import {AccessControlList, UploadFileMetadata, UploadInstructionSet, UploadResult} from "./TransitTypes";
import {createTransitProvider} from "./TransitProvider";
import {createDriveProvider} from "./DriveProvider";

const FixedKeyHeader: KeyHeader =
    {
        iv: new Uint8Array(Array(16).fill(1)),
        aesKey: new Uint8Array(Array(16).fill(1))
    };

export class MediaProvider extends ProviderBase {

    constructor(options: ProviderOptions) {
        super({
            appId: options.appId,
            api: options.api,
            sharedSecret: options.sharedSecret
        });
    }

    //gets the data available for the specified attribute if available
    async uploadImage(appId: Guid, driveId: Guid, tag: Guid, acl: AccessControlList, imageBytes: Uint8Array, fileId?: Guid): Promise<Guid | null> {

        if (!appId || !driveId) {
            throw "Missing appId or driveId";
        }

        const tp = createTransitProvider(this.getOptions());

        let instructionSet: UploadInstructionSet = {
            transferIv: tp.Random16(),
            storageOptions: {
                overwriteFileId: fileId ? fileId.toString() : null,
                driveIdentifier: driveId.toString()
            },
            transitOptions: null
        };

        let metadata: UploadFileMetadata = {
            contentType: "application/json",
            appData: {
                tags: [tag.toString()], //note: Intentionally not using the .tags property as we only want to tag with this attribute id
                contentIsComplete: false,
                fileType: 0,
                payloadIsEncrypted: false,
                jsonContent: null
            },
            accessControlList: acl
        }

        let result: UploadResult = await tp.UploadUsingKeyHeader(FixedKeyHeader, instructionSet, metadata, imageBytes);

        return Guid.parse(result.file.fileId);
    }

    //retrieves an image, decrypts, then returns a url to be passed to an image control
    async getDecryptedImageUrl(driveIdentifier: Guid, fileId: Guid): Promise<string> {
        //it seems these will be fine for images but for vidoe and audio we must stream decrypt
        let dp = createDriveProvider(this.getOptions());

        return dp.GetPayloadBytes(driveIdentifier, fileId, FixedKeyHeader).then(buffer => {
            let url = window.URL.createObjectURL(new Blob([buffer]));
            return url;
        });
    }
}

export function createMediaProvider(options: ProviderOptions) {
    return new MediaProvider(options);
}