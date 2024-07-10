import { DotYouClient } from '../../core/DotYouClient';

interface LinkPreviewFromServer {
  title: string;
  description: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  url: string;
}

export interface NewLinkPreview {
  title?: string;
  description?: string;
  imageUrl?: string;
  url: string;
}

export const getLinkPreview = async (
  dotYouClient: DotYouClient,
  url: string
): Promise<NewLinkPreview | null> => {
  const axiosClient = dotYouClient.createAxiosClient();
  const standardizedUrl = url.startsWith('http') ? url : `https://${url}`;

  return axiosClient
    .get<LinkPreviewFromServer>(`/utils/links/extract?url=${standardizedUrl}`)
    .then((response) => {
      // const imageBlob = (() => {
      //   if (!response.data.imageUrl) return null;
      //   try {
      //     const dataUri = response.data.imageUrl;

      //     const contentType = dataUri.split(';')[0].split(':')[1];
      //     const contentBase64 = dataUri.split('base64,')[1];

      //     if (contentType && contentBase64) {
      //       return new Blob([base64ToUint8Array(contentBase64)], { type: contentType });
      //     }
      //     return null;
      //   } catch (e) {
      //     return null;
      //   }
      // })();

      return {
        title: response.data.title || '',
        description: response.data.description || '',
        image: response.data.imageUrl || undefined,
        url: response.data.url,
      };
    })
    .catch((e) => {
      console.error(e);
      return null;
    });
};
