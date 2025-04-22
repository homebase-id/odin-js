import { getOdinIdColor, useOdinClientContext, useErrors } from '@homebase-id/common-app';
import {
  base64ToUint8Array,
  byteArrayToString,
  stringToUint8Array,
} from '@homebase-id/js-lib/helpers';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  MinimalProfileFields,
  getProfileAttributes,
} from '@homebase-id/js-lib/profile';
import { useEffect, useRef } from 'react';
import { useAttribute } from './profiles/useAttribute';
import { useSettings } from './settings/useSettings';
import { autoFixConnections } from '../provider/network/troubleshooting/DataConversionProvider';

export const AUTO_FIX_VERSION = '0.0.4';
export const useAutofixDefaultConfig = () => {
  const { add: addError } = useErrors();

  const {
    fetchUiSettings: { data: uiSettings, isFetched: isUiSettingsFetched },
    updateUiSetting: { mutateAsync: updateUiSetting },
  } = useSettings();

  const lastRunAutoFix = uiSettings?.lastRunAutoFix;
  const shouldRun = lastRunAutoFix !== AUTO_FIX_VERSION;

  const odinClient = useOdinClientContext();
  const isRunning = useRef<boolean>();

  const { fixDefaultProfileImage } = useFixDefaultProfileImage();

  useEffect(() => {
    if (isRunning.current || !isUiSettingsFetched || !shouldRun) return;
    isRunning.current = true;
    console.log('[useAutoFixDefaultConfig] Starting ', AUTO_FIX_VERSION);
    (async () => {
      try {
        await fixDefaultProfileImage();
        await autoFixConnections(odinClient);

        updateUiSetting({ ...uiSettings, lastRunAutoFix: AUTO_FIX_VERSION });
        console.log('[useAutoFixDefaultConfig] Finished ', AUTO_FIX_VERSION);
      } catch (ex) {
        console.error(
          '[useAutoFixDefaultConfig] Failed to run auto fix, will try again next time',
          ex
        );
        addError(ex, 'Failed to run auto fix');
      }
    })();
  }, [isUiSettingsFetched]);
};

const useFixDefaultProfileImage = () => {
  const odinClient = useOdinClientContext();
  const { mutateAsync: saveAttr } = useAttribute().save;

  return {
    fixDefaultProfileImage: async () => {
      const data = await getProfileAttributes(
        odinClient,
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
          } catch {
            throw new Error('Failed to update profile image');
          }
        })
      );
    },
  };
};
