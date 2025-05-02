import { OdinClient } from '../../core/OdinClient';

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
  odinClient: OdinClient,
  url: string
): Promise<LinkPreview | null> => {
  const axiosClient = odinClient.createAxiosClient();
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
    .catch((e) => {
      console.error(e);
      return null;
    });

  _internalPreviewPromiseCache.set(cacheKey, promise);
  return promise;
};
