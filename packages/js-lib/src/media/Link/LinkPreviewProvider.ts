import { DotYouClient } from '../../core/DotYouClient';
import { getCacheKey } from '../../core/DriveData/File/DriveFileHelper';

interface LinkPreviewFromServer {
  title: string;
  description: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  url: string;
}

export interface LinkPreview {
  title?: string;
  description?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  url: string;
}

export interface LinkPreviewDescriptor {
  url: string;
  hasImage?: boolean;
  imageWidth?: number;
  imageHeight?: number;
}

const _internalPreviewPromiseCache = new Map<string, Promise<LinkPreview | null>>();

export const getLinkPreview = async (
  dotYouClient: DotYouClient,
  url: string
): Promise<LinkPreview | null> => {
  const axiosClient = dotYouClient.createAxiosClient();
  const standardizedUrl = url.startsWith('http') ? url : `https://${url}`;

  const cacheKey = standardizedUrl;
  const cacheEntry =
    _internalPreviewPromiseCache.has(cacheKey) &&
    (await _internalPreviewPromiseCache.get(cacheKey));
  if (cacheEntry) return cacheEntry;

  const promise = axiosClient
    .get<LinkPreviewFromServer>(`/utils/links/extract?url=${standardizedUrl}`)
    .then((response) => {
      return {
        title: response.data.title || '',
        description: response.data.description || '',
        imageUrl: response.data.imageUrl || undefined,
        imageWidth: response.data.imageWidth || undefined, // TODO: Should we find a way to always get one from the dataUri?
        imageHeight: response.data.imageHeight || undefined, // TODO: Should we find a way to always get one from the dataUri?
        url: response.data.url,
      };
    })
    .catch((e) => {
      console.error(e);
      return null;
    });

  _internalPreviewPromiseCache.set(cacheKey, promise);
  return promise;
};
