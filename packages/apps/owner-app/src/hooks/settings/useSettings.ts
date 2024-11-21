import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getFlags,
  getSettings,
  uiSettings,
  updateFlag,
  updateSettings,
} from '../../provider/system/SettingsProvider';
import { useDotYouClientContext } from '@homebase-id/common-app';

export const useSettings = () => {
  const dotYouClient = useDotYouClientContext();
  const queryClient = useQueryClient();

  const fetchFlags = async () => {
    return getFlags(dotYouClient);
  };

  const updateFlagInternal = async ({ name, value }: { name: string; value: boolean }) => {
    return updateFlag(dotYouClient, name, value);
  };

  const fetchUiSettings = async () => {
    return getSettings(dotYouClient);
  };

  const updateUiSetting = async (settings: uiSettings) => {
    return updateSettings(dotYouClient, settings);
  };

  return {
    fetchFlags: useQuery({
      queryKey: ['system-flags'],
      queryFn: () => fetchFlags(),
      refetchOnWindowFocus: false,
    }),
    updateFlag: useMutation({
      mutationFn: updateFlagInternal,
      onSuccess: () => {
        invalidateSystemFlags(queryClient);
      },
    }),
    fetchUiSettings: useQuery({
      queryKey: ['ui-settings'],
      queryFn: () => fetchUiSettings(),
      refetchOnWindowFocus: false,
    }),
    updateUiSetting: useMutation({
      mutationFn: updateUiSetting,
      onSuccess: () => {
        invalidateUiSettings(queryClient);
      },
    }),
  };
};

export const invalidateSystemFlags = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['system-flags'] });
};

export const invalidateUiSettings = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['ui-settings'] });
};
