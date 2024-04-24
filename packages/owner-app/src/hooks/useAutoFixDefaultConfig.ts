import { getOdinIdColor, useDotYouClient } from '@youfoundation/common-app';
import {
  base64ToUint8Array,
  byteArrayToString,
  stringToUint8Array,
} from '@youfoundation/js-lib/helpers';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  MinimalProfileFields,
  getProfileAttributes,
} from '@youfoundation/js-lib/profile';
import { useEffect, useRef } from 'react';
import { useAttribute } from './profiles/useAttribute';

export const useAutofixDefaultConfig = () => {
  const dotYouClient = useDotYouClient().getDotYouClient();
  const isRunning = useRef<boolean>();

  const { mutateAsync: saveAttr } = useAttribute().save;

  useEffect(() => {
    if (isRunning.current) return;
    isRunning.current = true;

    (async () => {
      const data = await getProfileAttributes(
        dotYouClient,
        BuiltInProfiles.StandardProfileId,
        undefined,
        [BuiltInAttributes.Photo],
        10
      );

      await Promise.all(
        data.map(async (attr) => {
          try {
            if (!attr || !attr.fileMetadata.appData.previewThumbnail?.content) return;
            const decodedAsString = byteArrayToString(
              base64ToUint8Array(attr.fileMetadata.appData.previewThumbnail?.content)
            );

            if (
              !decodedAsString.startsWith(
                `<svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="#F1F5F9"`
              )
            )
              return;

            const odinIdBackgroundColor = getOdinIdColor(window.location.hostname).lightTheme;
            const replacedSvgString = decodedAsString
              .replace(`fill="#F1F5F9"/>`, `fill="${odinIdBackgroundColor || '#F1F5F9'}" />`)
              .replace(
                `y="150" dominant-baseline="middle" `,
                `y="150" alignment-baseline="middle" dominant-baseline="middle" `
              )
              .replace(
                `font-family="sans-serif"`,
                `font-family="ui-sans-serif, system-ui, sans-serif"`
              )
              .replace(`font-weight="300"`, `font-weight="400"`)
              .replace(`fill="black" `, `fill="white" `);

            const blob = new Blob([stringToUint8Array(replacedSvgString)], {
              type: 'image/svg+xml',
            });

            const updatedAttr = {
              ...attr,
            };
            if (!updatedAttr.fileMetadata.appData.content.data) return;
            updatedAttr.fileMetadata.appData.content.data[MinimalProfileFields.ProfileImageKey] =
              blob;

            await saveAttr(updatedAttr);
          } catch (e) {
            console.error('Failed to update profile image', e);
          }
        })
      );
    })();
  }, []);
};
