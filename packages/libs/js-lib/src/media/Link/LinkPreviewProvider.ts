import { DotYouClient } from '../../core/DotYouClient';

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

export interface LinkPreviewDescriptor extends Omit<LinkPreview, 'imageUrl'> {
  hasImage?: boolean;
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
    .get<LinkPreviewFromServer>(`/utils/links/extract?url=${encodeURIComponent(standardizedUrl)}`)
    .then((response) => {
      if (!response.data) return null;
      return {
        title: response.data.title || '',
        description: response.data.description || '',
        imageUrl: response.data.imageUrl || undefined,
        imageWidth: response.data.imageWidth || undefined,
        imageHeight: response.data.imageHeight || undefined,
        url: response.data.url,
      };
    })
    .catch((error) => {
      // 404 is the server's "nothing to preview" (it used to be an empty 204), not a failure
      if (error.response?.status === 404) return null;
      console.error('[odin-js:getLinkPreview]', error);
      return null;
    });

  _internalPreviewPromiseCache.set(cacheKey, promise);
  return promise;
};
