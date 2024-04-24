import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HomebaseFile, NewHomebaseFile } from '@youfoundation/js-lib/core';
import {
  MailSettings,
  fetchMailSettings,
  uploadMailSettings,
} from '../../providers/MailSettingsProvider';
import { useDotYouClientContext } from '../auth/useDotYouClientContext';

export const useMailSettings = () => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const getMailSettings = async () => {
    return await fetchMailSettings(dotYouClient);
  };

  const saveMailSettings = async (
    settings: HomebaseFile<MailSettings> | NewHomebaseFile<MailSettings>
  ) => {
    return await uploadMailSettings(dotYouClient, settings);
  };

  return {
    get: useQuery({
      queryKey: ['mail-settings'],
      queryFn: () => getMailSettings(),
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: Infinity,
    }),
    save: useMutation({
      mutationFn: saveMailSettings,
      onSettled: () => queryClient.invalidateQueries({ queryKey: ['mail-settings'] }),
    }),
  };
};
