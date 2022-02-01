import {ProviderBase, ProviderOptions} from "./ProviderBase";
import {AesEncrypt} from "./AesEncrypt";
import {Guid} from "guid-typescript";
import {DataUtil} from "./DataUtil";
import {EncryptedClientFileHeader, SearchResult, UnencryptedFileHeader, EncryptedKeyHeader, KeyHeader} from "./DriveTypes";
import {AxiosRequestConfig} from "axios";
import querystring from 'query-string';
import {PagedResult} from "./Types";

export interface QueryParams {
    fileType?: number | undefined,
    categoryId?: Guid | undefined,
    includeContent?: boolean,
    pageNumber: number,
    pageSize: number
}

class DriveProvider extends ProviderBase {

    constructor(options: ProviderOptions | null) {
        super(options);
    }

    // async GetFiles(appId: Guid, params:QueryParams): Promise<any> {
    //    
    //     let client = this.createAxiosClient(appId);
    //     let qs = querystring.stringify(params, {skipNull:true})
    //     return client.get("/drive/query/find?" + qs).then(results => {
    //         console.log(results.data);
    //         return results.data;
    //     });
    // }

    async GetFilesByType<TJsonContent>(appId: Guid, params: QueryParams): Promise<PagedResult<SearchResult<TJsonContent>>> {
        let client = this.createAxiosClient(appId);
        return client.get("/drive/query/fileType?" + querystring.stringify(params)).then(response => {
            response.data.results = response.data.results.map(d => {
                let s: SearchResult<TJsonContent> = {
                    fileId: d.fileId,
                    createdTimestamp: d.createdTimestamp,
                    lastUpdatedTimestamp: d.lastUpdatedTimestamp,
                    fileType: d.fileType,
                    categoryId: d.categoryId,
                    contentIsComplete: d.contentIsComplete,
                    jsonContent: JSON.parse(d.jsonContent)
                }

                return s;
            })

            return response.data;
        })
    }

    async GetMetadata(appId: Guid, fileId: Guid): Promise<UnencryptedFileHeader> {

        let client = this.createAxiosClient(appId);
        return client.get("/drive/files/metadata?fileId=" + fileId).then(response => {
            let header: EncryptedClientFileHeader = {
                encryptedKeyHeader: {
                    EncryptedAesKey: DataUtil.base64ToUint8Array(response.data.encryptedKeyHeader.encryptedAesKey),
                    Iv: DataUtil.base64ToUint8Array(response.data.encryptedKeyHeader.iv),
                    EncryptionVersion: response.data.encryptedKeyHeader.encryptionVersion,
                    Type: response.data.encryptedKeyHeader.type
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
    async GetPayloadAsJson<T>(appId: Guid, fileId: Guid, keyHeader: KeyHeader): Promise<T> {

        let client = this.createAxiosClient(appId);
        const config: AxiosRequestConfig = {
            responseType: "arraybuffer",
        }

        return client.get("/drive/files/payload?fileId=" + fileId, config).then(response => {
            let cipher = new Uint8Array(response.data);

            return this.decryptUsingKeyHeader(cipher, keyHeader).then(bytes => {
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

    async GetPayloadAsStream(appId: Guid, fileId: Guid, keyHeader: KeyHeader): Promise<any> {
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

    async DeleteFile(appId: Guid, fileId: Guid): Promise<boolean | void> {
        let client = this.createAxiosClient(appId);

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

    private async decryptUsingKeyHeader(cipher: Uint8Array, keyHeader: KeyHeader): Promise<Uint8Array> {
        return await AesEncrypt.CbcDecrypt(cipher, keyHeader.Iv, keyHeader.AesKey);
    }

    private async decryptKeyHeader(ekh: EncryptedKeyHeader): Promise<KeyHeader> {

        if (ekh.EncryptionVersion != 1) {
            throw "Encryption version " + ekh.EncryptionVersion + "not supported"
        }

        let cipher = ekh.EncryptedAesKey;
        let combined = await AesEncrypt.CbcDecrypt(cipher, ekh.Iv, this.getSharedSecret());

        let kh: KeyHeader =
            {
                Iv: new Uint8Array(combined.slice(0, 16)),
                AesKey: new Uint8Array(combined.slice(16, 32))
            }

        return kh;
    }
}

export function createDriveProvider(options: ProviderOptions) {
    return new DriveProvider(options);
}