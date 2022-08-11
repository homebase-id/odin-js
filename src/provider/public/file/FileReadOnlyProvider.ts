import { AesEncrypt } from '../../core/AesEncrypt';
import { DataUtil } from '../../core/DataUtil';
import { KeyHeader } from '../../core/DriveData/DriveTypes';
import { ProviderBase } from '../../core/ProviderBase';

const FixedKeyHeader: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(1)),
  aesKey: new Uint8Array(Array(16).fill(1)),
};

type staticFile = Record<string, any>;
const _internalFileCache = new Map<string, Map<string, staticFile>>();

export default class FileReadOnlyProvider extends ProviderBase {
  async GetFile(fileName: string): Promise<Map<string, staticFile>> {
    try {
      if (_internalFileCache.has(fileName)) {
        return _internalFileCache.get(fileName) ?? new Map();
      }

      const httpClient = this.createAxiosClient();
      const response = await httpClient({ url: `/cdn/${fileName}`, baseURL: '' });

      const parsedResponse = await Promise.all(
        response.data?.map(async (dataSlice: any) => {
          return [
            dataSlice.name,
            await Promise.all(
              dataSlice?.files.map(async (file: any) => {
                let parsedObj = undefined;

                try {
                  // if (dsr.fileMetadata.appData.contentIsComplete && result.includeMetadataHeader) {
                  const bytes = await this.DecryptUsingKeyHeader(
                    DataUtil.base64ToUint8Array(file.payload),
                    FixedKeyHeader
                  );
                  const json = DataUtil.byteArrayToString(bytes);
                  parsedObj = JSON.parse(json);
                } catch (ex) {
                  console.warn(ex);
                }

                return {
                  ...file,
                  payload: parsedObj,
                };
              })
            ),
          ];
        })
      );

      const responseMap: Map<string, staticFile> = new Map(parsedResponse);
      _internalFileCache.set(fileName, responseMap);
      console.log(_internalFileCache);
      return responseMap;
    } catch (ex) {
      console.warn(`Fetching file with name ${fileName} failed`);
      return new Map();
    }
  }

  async DecryptUsingKeyHeader(cipher: Uint8Array, keyHeader: KeyHeader): Promise<Uint8Array> {
    return await AesEncrypt.CbcDecrypt(cipher, keyHeader.iv, keyHeader.aesKey);
  }
}
