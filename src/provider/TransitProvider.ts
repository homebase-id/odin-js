import {ProviderBase, ProviderOptions} from "./ProviderBase";
import { UploadFileMetadata, UploadFileDescriptor, UploadInstructionSet, UploadResult} from "./TransitTypes";
import {AesEncrypt} from "./AesEncrypt";
import {Guid} from "guid-typescript";
import {DataUtil} from "./DataUtil";
import {EncryptedKeyHeader, KeyHeader} from "./DriveTypes";

class TransitProvider extends ProviderBase {

    constructor(options: ProviderOptions | null) {
        super(options);
    }
    
    async Upload(appId: Guid, instructions: UploadInstructionSet, metadata: UploadFileMetadata, payload: Uint8Array): Promise<UploadResult> {

        let keyHeader = this.GenerateKeyHeader();

        let descriptor: UploadFileDescriptor = {
            EncryptedKeyHeader: await this.EncryptKeyHeader(keyHeader, instructions.TransferIv),
            FileMetadata: metadata
        }
        
        //console.log("md", metadata);
        
        let encryptedDescriptor = await this.encryptWithSharedSecret(descriptor, instructions.TransferIv);
        let encryptedPayload = await this.encryptWithKeyheader(payload, keyHeader);

        const data = new FormData();
        data.append('instructions', this.toBlob(instructions));
        data.append('metaData', new Blob([encryptedDescriptor]));
        data.append('payload', new Blob([encryptedPayload]));

        let client = this.createAxiosClient(appId);
        let url = "/transit/upload";

        const config = {
            headers: {
                'content-type': 'multipart/form-data',
            },
        };

        return client.post(url, data, config).then(response => {
            return response.data;
        }).catch(error => {
            //TODO: Handle this - the file was not uploaded
            console.log(error);
            throw error;
        });
    }

    private async encryptWithKeyheader(content: Uint8Array, keyHeader: KeyHeader): Promise<Uint8Array> {
        let cipher = await AesEncrypt.CbcEncrypt(content, keyHeader.iv, keyHeader.aesKey);
        return cipher;
    }

    private async encryptWithSharedSecret(o: any, iv: Uint8Array): Promise<Uint8Array> {
        //encrypt metadata with shared secret
        let ss = this.getSharedSecret();
        let json = DataUtil.JsonStringify64(o);
        
        //console.log(json);
        
        let content = new TextEncoder().encode(json);
        let cipher = await AesEncrypt.CbcEncrypt(content, iv, ss);
        return cipher;
    }

    private toBlob(o: any): Blob {
        let json = DataUtil.JsonStringify64(o);
        let content = new TextEncoder().encode(json);
        return new Blob([content]);
    }

    //Uses the app shared secret to encrypt the specified keyheader
    async EncryptKeyHeader(keyHeader: KeyHeader, transferIv: Uint8Array): Promise<EncryptedKeyHeader> {

        let sharedSecret = this.getSharedSecret();
        let combined = [...Array.from(keyHeader.iv), ...Array.from(keyHeader.aesKey)];
        let cipher = await AesEncrypt.CbcEncrypt(new Uint8Array(combined), transferIv, sharedSecret);

        return {
            Iv: transferIv,
            EncryptedAesKey: cipher,
            EncryptionVersion: 1,
            Type: 11
        }
    }

    GenerateKeyHeader(): KeyHeader {
        return {
            iv: this.Random16(),
            aesKey: this.Random16()
        }
    }

    Random16(): Uint8Array {
        return window.crypto.getRandomValues(new Uint8Array(16));
    }
}

export function createTransitProvider(options: ProviderOptions) {
    return new TransitProvider(options);
}