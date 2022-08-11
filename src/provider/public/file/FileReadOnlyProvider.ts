import { AesEncrypt } from '../../core/AesEncrypt';
import { DataUtil } from '../../core/DataUtil';
import { DriveSearchResult, KeyHeader } from '../../core/DriveData/DriveTypes';
import { ProviderBase } from '../../core/ProviderBase';

const FixedKeyHeader: KeyHeader = {
  iv: new Uint8Array(Array(16).fill(1)),
  aesKey: new Uint8Array(Array(16).fill(1)),
};

type ResponseEntry = {
  additionalThumbnails: unknown[];
  header: DriveSearchResult;
  payload: Record<string, any>;
};

// type staticFile = Record<string, ResponseEntry[]>;
const _internalFileCache = new Map<string, Map<string, ResponseEntry[]>>();

export default class FileReadOnlyProvider extends ProviderBase {
  async GetFile(fileName: string): Promise<Map<string, ResponseEntry[]>> {
    try {
      if (_internalFileCache.has(fileName)) {
        return _internalFileCache.get(fileName) ?? new Map();
      }

      const httpClient = this.createAxiosClient();
      const response = await httpClient({ url: `/cdn/${fileName}`, baseURL: '' });

      const parsedResponse = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response.data?.map(async (dataSlice: any) => {
          return [
            dataSlice.name,
            await Promise.all(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dataSlice?.files.map(async (file: any) => {
                let parsedObj = undefined;

                try {
                  // Checking if there is actual content in jsonContent as could be excluded from the static file
                  if (
                    file.header.fileMetadata.appData.contentIsComplete &&
                    file.header.fileMetadata.appData.jsonContent.length !== 0
                  ) {
                    const json = DataUtil.byteArrayToString(
                      DataUtil.base64ToUint8Array(file.header.fileMetadata.appData.jsonContent)
                    );

                    parsedObj = JSON.parse(json);
                  } else {
                    const bytes = await this.DecryptUsingKeyHeader(
                      DataUtil.base64ToUint8Array(file.payload),
                      FixedKeyHeader
                    );
                    const json = DataUtil.byteArrayToString(bytes);

                    parsedObj = JSON.parse(json);
                  }
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

      const responseMap: Map<string, ResponseEntry[]> = new Map(parsedResponse);
      _internalFileCache.set(fileName, responseMap);

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
