import {ProviderBase, ProviderOptions} from "./ProviderBase";
import {AesEncrypt} from "./AesEncrypt";
import {Guid} from "guid-typescript";
import {DataUtil} from "./DataUtil";
import {EncryptedClientFileHeader, DriveSearchResult, UnencryptedFileHeader, EncryptedKeyHeader, KeyHeader, QueryParams} from "./DriveTypes";
import {AxiosRequestConfig} from "axios";
import querystring from 'query-string';
import {PagedResult} from "./Types";

class DriveProvider extends ProviderBase {

    constructor(options: ProviderOptions | null) {
        super(options);
    }

    // async GetFiles( params:QueryParams): Promise<any> {
    //    
    //     let client = this.createAxiosClient();
    //     let qs = querystring.stringify(params, {skipNull:true})
    //     return client.get("/drive/query/find?" + qs).then(results => {
    //         console.log(results.data);
    //         return results.data;
    //     });
    // }

    async GetFilesByTag<TJsonContent>(params: QueryParams): Promise<PagedResult<DriveSearchResult<TJsonContent>>> {
        let client = this.createAxiosClient();
        return client.get("/drive/query/tag?" + querystring.stringify(params)).then(response => {
            response.data.results = response.data.results.map(item => {
                // let s: DriveSearchResult<TJsonContent> = {
                //     fileId: d.fileId,
                //     tags: d.tags,
                //     fileType: d.fileType,
                //     contentIsComplete: d.contentIsComplete,
                //     payloadIsEncrypted: boolean,
                //     createdTimestamp: d.createdTimestamp,
                //     senderDotYouId: d.senderDotYouId,
                //     lastUpdatedTimestamp: d.lastUpdatedTimestamp,
                //     payloadSize: number,
                //     payloadTooLarge: boolean,
                //     payloadContent: string
                // }

                let dsr: DriveSearchResult<TJsonContent> = {...item};
                dsr.jsonContent = params.includeMetadataHeader ? JSON.parse(item.jsonContent) : null
                return dsr;
            })

            return response.data;
        })
    }

    // async GetFilesByType<TJsonContent>( params: QueryParams): Promise<PagedResult<SearchResult<TJsonContent>>> {
    //     let client = this.createAxiosClient();
    //     return client.get("/drive/query/fileType?" + querystring.stringify(params)).then(response => {
    //         response.data.results = response.data.results.map(d => {
    //             let s: SearchResult<TJsonContent> = {
    //                 fileId: d.fileId,
    //                 createdTimestamp: d.createdTimestamp,
    //                 lastUpdatedTimestamp: d.lastUpdatedTimestamp,
    //                 fileType: d.fileType,
    //                 tags: d.tags,
    //                 contentIsComplete: d.contentIsComplete,
    //                 jsonContent: params.includeContent ? JSON.parse(d.jsonContent) : null
    //             }
    //
    //             return s;
    //         })
    //
    //         return response.data;
    //     })
    // }

    async GetMetadata(fileId: Guid): Promise<UnencryptedFileHeader> {

        let client = this.createAxiosClient();
        return client.get("/drive/files/metadata?fileId=" + fileId).then(response => {
            let header: EncryptedClientFileHeader = {
                encryptedKeyHeader: {
                    encryptedAesKey: DataUtil.base64ToUint8Array(response.data.encryptedKeyHeader.encryptedAesKey),
                    iv: DataUtil.base64ToUint8Array(response.data.encryptedKeyHeader.iv),
                    encryptionVersion: response.data.encryptedKeyHeader.encryptionVersion,
                    type: response.data.encryptedKeyHeader.type
                },
                fileMetadata: response.data.fileMetadata
            };

            //decrypt to key header
            return this.decryptKeyHeader(header.encryptedKeyHeader).then(keyHeader => {
                //TODO: decrypt the file metadata

                let result: UnencryptedFileHeader = {
                    keyHeader: keyHeader,
                    metadata: null
                };

                return result;
            })
        }).catch(error => {
            //TODO: Handle this - the file was not uploaded
            console.log(error);
            throw error;
        });
    }

    //decrypts the payload and returns a JSON object
    async GetPayloadAsJson<T>(fileId: Guid, keyHeader: KeyHeader): Promise<T> {

        let client = this.createAxiosClient();
        const config: AxiosRequestConfig = {
            responseType: "arraybuffer",
        }

        return client.get("/drive/files/payload?fileId=" + fileId, config).then(response => {
            let cipher = new Uint8Array(response.data);

            return this.DecryptUsingKeyHeader(cipher, keyHeader).then(bytes => {
                let json = DataUtil.byteArrayToString(bytes);
                let o = JSON.parse(json);
                return o;

                // return new FileStreamResult(payload, "application/octet-stream");
            });

        }).catch(error => {
            //TODO: Handle this - the file was not uploaded
            console.log(error);
            throw error;
        });
    }

    async GetPayloadAsStream( fileId: Guid, keyHeader: KeyHeader): Promise<any> {
        throw "Not Implemented";

        /*
        axios({
            url: 'http://api.dev/file-download', //your url
            method: 'GET',
            responseType: 'blob', // important
        }).then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'file.pdf'); //or any other extension
            document.body.appendChild(link);
            link.click();
        });
        
        * */
    }

    async DeleteFile( fileId: Guid): Promise<boolean | void> {
        let client = this.createAxiosClient();

        return client.delete("/drive/files?fileId=" + fileId).then(response => {
            if (response.status == 200) {
                return true;
            }

            if (response.status == 404) {
                return false;
            }

            return false;

        }).catch(error => {
            //TODO: Handle this - the file was not uploaded
            console.log(error);
            throw error;
        });
    }

    async DecryptUsingKeyHeader(cipher: Uint8Array, keyHeader: KeyHeader): Promise<Uint8Array> {
        return await AesEncrypt.CbcDecrypt(cipher, keyHeader.iv, keyHeader.aesKey);
    }

    private async decryptKeyHeader(ekh: EncryptedKeyHeader): Promise<KeyHeader> {

        if (ekh.encryptionVersion != 1) {
            throw "Encryption version " + ekh.encryptionVersion + "not supported"
        }

        let cipher = ekh.encryptedAesKey;
        let combined = await AesEncrypt.CbcDecrypt(cipher, ekh.iv, this.getSharedSecret());

        let kh: KeyHeader =
            {
                iv: new Uint8Array(combined.slice(0, 16)),
                aesKey: new Uint8Array(combined.slice(16, 32))
            }

        return kh;
    }
}

export function createDriveProvider(options: ProviderOptions) {
    return new DriveProvider(options);
}