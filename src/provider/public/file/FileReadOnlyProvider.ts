import { AesEncrypt } from '../../core/AesEncrypt';
import { DataUtil } from '../../core/DataUtil';
import { DriveSearchResult, KeyHeader } from '../../core/DriveData/DriveTypes';
import { ProviderBase } from '../../core/ProviderBase';

type ResponseEntry = {
  additionalThumbnails?: {
    content: string;
    contentType: string;
    pixelHeight: number;
    pixelWidth: number;
  }[];
  header: DriveSearchResult;
  payload: Record<string, any>;
};

const _internalFileCache = new Map<string, Promise<Map<string, ResponseEntry[]>>>();

export default class FileReadOnlyProvider extends ProviderBase {
  async GetFile(fileName: string): Promise<Map<string, ResponseEntry[]>> {
    // If user has a shared secret, never return the static files, as
    //   these only contain anonymous data which might not be optimal for the connected user
    if (this.getSharedSecret()) {
      return new Map();
    }

    try {
      if (_internalFileCache.has(fileName)) {
        return (await _internalFileCache.get(fileName)) ?? new Map();
      }

      const httpClient = this.createAxiosClient();

      const fetchResponseMap = async (fileName: string) => {
        const response = await httpClient({
          url: `/cdn/${fileName}`,
          baseURL: this.getRoot(),
          withCredentials: false,
          // Force headers to have the same as the preload manual fetch, and to allow a cached resource
          //headers: { accept: '*/*', 'cache-control': 'max-age=20' },
        });

        const parsedResponse = await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response.data?.map(async (dataSlice: any) => {
            return [
              dataSlice.name,
              await Promise.all(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                dataSlice?.files.map(async (file: any) => this.convertFileToResponseEntry(file))
              ),
            ];
          })
        );

        return new Map(parsedResponse) as Map<string, ResponseEntry[]>;
      };

      const promise = fetchResponseMap(fileName);
      _internalFileCache.set(fileName, promise);

      return await promise;
    } catch (ex) {
      console.warn(`Fetching file with name ${fileName} failed`);
      return new Map();
    }
  }

  /// Looks through the _internalcache to find a ResponseEntry that matches the key provided
  async getFileEntryFromCache(key: string) {
    if (!_internalFileCache) {
      return;
    }
    try {
      for (const filePromise of _internalFileCache.values()) {
        const responseEntries = await filePromise;

        if (responseEntries.has(key)) {
          return responseEntries.get(key);
        }
      }
    } catch (ex) {
      // The promises could be erroring out, so we need to return if anything fails before waisting any more time waiting on failing responses;
      return;
    }
  }

  private convertFileToResponseEntry = async (file: any) => {
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
      } else if (file.payload) {
        const bytes = DataUtil.base64ToUint8Array(file.payload);
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
  };

  async DecryptUsingKeyHeader(cipher: Uint8Array, keyHeader: KeyHeader): Promise<Uint8Array> {
    return await AesEncrypt.CbcDecrypt(cipher, keyHeader.iv, keyHeader.aesKey);
  }
}
