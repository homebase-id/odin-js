import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getFlags,
  getSettings,
  uiSettings,
  updateFlag,
  updateSettings,
} from '../../provider/system/SettingsProvider';
import { useAuth } from '../auth/useAuth';

export const useSettings = () => {
  const dotYouClient = useAuth().getDotYouClient();
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
    fetchFlags: useQuery(['systemFlags'], () => fetchFlags(), {
      refetchOnWindowFocus: false,
    }),
    updateFlag: useMutation(updateFlagInternal, {
      onSuccess: () => {
        queryClient.invalidateQueries(['systemFlags']);
      },
    }),
    fetchUiSettings: useQuery(['uiSettings'], () => fetchUiSettings(), {
      refetchOnWindowFocus: false,
    }),
    updateUiSetting: useMutation(updateUiSetting, {
      onSuccess: () => {
        queryClient.invalidateQueries(['uiSettings']);
      },
    }),
  };
};
