import { DEFAULT_PAYLOAD_KEY, EmbeddedThumb, PayloadDescriptor } from '../..';
import { OdinClient } from '../../core/OdinClient';
import { FileQueryParams } from '../../core/DriveData/Drive/DriveTypes';
import { HomebaseFile } from '../../core/DriveData/File/DriveFileTypes';
import {
  base64ToUint8Array,
  byteArrayToString,
  tryJsonParse,
  uint8ArrayToBase64,
} from '../../helpers/helpers';

export interface ResponseEntry {
  additionalThumbnails?: EmbeddedThumb[];
  header: HomebaseFile;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any> | undefined;
}

export type QueryParamsSection = {
  name: string;
  queryParams: FileQueryParams;
  resultOptions: {
    includeHeaderContent: boolean;
    payloadKeys: string[];
    excludePreviewThumbnail: boolean;
  };
};

type PublishStaticFileRequest = {
  filename: string;
  config: { crossOriginBehavior: 'default' | 'allowAllOrigins'; contentType: string };
  sections: QueryParamsSection[];
};

type PublishProfileImage = {
  image64: string;
  contentType: string;
};

// type PublishProfileCard = {
//   name: string;
//   givenName?: string;
//   familyName?: string;
//   bio: string;
//   image: string;
//   email: { type: string; email: string }[];
//   links: { type: string; url: string }[];
//   sameAs: { type: string; url: any }[]
// };

const _internalFileCache = new Map<string, Promise<Map<string, ResponseEntry[]>>>();

export const publishFile = async (
  odinClient: OdinClient,
  fileName: string,
  sections: QueryParamsSection[],
  crossOriginBehavior: 'allowAllOrigins' | 'default' = 'default'
) => {
  const httpClient = odinClient.createAxiosClient();

  const fileRequest: PublishStaticFileRequest = {
    filename: fileName,
    config: {
      crossOriginBehavior: crossOriginBehavior,
      contentType: 'string',
    },
    sections: sections,
  };

  return await httpClient.post('/optimization/cdn/publish', fileRequest);
};

export const publishProfileCardFile = async (
  odinClient: OdinClient,
  profileCard: {
    image: `https://${string}/pub/image`;
    givenName: string | undefined;
    familyName: string | undefined;
    name: string;
    bio: string;
    bioSummary: string | undefined;
    links: { type: string; url: string | undefined }[];
    email: { type: string; email: string | undefined }[];
    sameAs: { type: string; url: string | undefined }[]
  }
) => {
  const httpClient = odinClient.createAxiosClient();

  return await httpClient.post('/optimization/cdn/profilecard', {
    profileCardJson: JSON.stringify(profileCard),
  });
};

export const publishProfileImageFile = async (
  odinClient: OdinClient,
  imageBuffer: Uint8Array,
  contentType: string
) => {
  const httpClient = odinClient.createAxiosClient();

  const fileRequest: PublishProfileImage = {
    image64: uint8ArrayToBase64(imageBuffer),
    contentType: contentType,
  };

  return await httpClient.post('/optimization/cdn/profileimage', fileRequest);
};

export const GetFile = async (
  odinClient: OdinClient,
  fileName: string
): Promise<Map<string, ResponseEntry[]>> => {
  try {
    if (_internalFileCache.has(`${odinClient.getRoot()}+${fileName}`)) {
      return (await _internalFileCache.get(`${odinClient.getRoot()}+${fileName}`)) ?? new Map();
    }

    const httpClient = odinClient.createAxiosClient({ overrideEncryption: true });

    const fetchResponseMap = async (fileName: string) => {
      const response = await httpClient({
        url: `/cdn/${fileName}`,
        baseURL: odinClient.getRoot(),
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
              dataSlice?.files.map(async (file: any) => convertFileToResponseEntry(file))
            ),
          ];
        })
      );

      return new Map(parsedResponse) as Map<string, ResponseEntry[]>;
    };

    const promise = fetchResponseMap(fileName);
    _internalFileCache.set(`${odinClient.getRoot()}+${fileName}`, promise);

    return await promise;
  } catch {
    console.warn(`Fetching file with name ${fileName} failed`);
    return new Map();
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convertFileToResponseEntry = async (file: any) => {
  let parsedObj = undefined;

  try {
    if (
      file.header.fileMetadata.payloads.filter(
        (payload: PayloadDescriptor) => payload.contentType === 'application/json'
      ).length === 0 &&
      file.header.fileMetadata.appData.content.length !== 0
    ) {
      parsedObj = tryJsonParse(file.header.fileMetadata.appData.content);
    } else if (file.payloads.length) {
      const matchingPayload = file.payloads.find(
        (payload: PayloadDescriptor) =>
          payload.contentType === 'application/json' && payload.key === DEFAULT_PAYLOAD_KEY
      );

      const bytes = base64ToUint8Array(matchingPayload.data);
      const json = byteArrayToString(bytes);

      parsedObj = tryJsonParse(json);
    }
  } catch (ex) {
    console.warn(ex);
  }

  delete file.payloads;

  return {
    ...file,
    payload: parsedObj,
  };
};
