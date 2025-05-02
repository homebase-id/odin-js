import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';
import {
  MailSettings,
  fetchMailSettings,
  uploadMailSettings,
} from '../../providers/MailSettingsProvider';
import { useOdinClientContext } from '@homebase-id/common-app';

export const useMailSettings = () => {
  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();

  const getMailSettings = async () => {
    return await fetchMailSettings(odinClient);
  };

  const saveMailSettings = async (
    settings: HomebaseFile<MailSettings> | NewHomebaseFile<MailSettings>
  ) => {
    return await uploadMailSettings(odinClient, settings);
  };

  return {
    get: useQuery({
      queryKey: ['mail-settings'],
      queryFn: () => getMailSettings(),
      staleTime: 1000 * 60 * 60, // 1 hour
    }),
    save: useMutation({
      mutationFn: saveMailSettings,
      onSettled: () => queryClient.invalidateQueries({ queryKey: ['mail-settings'] }),
    }),
  };
};
