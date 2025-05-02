import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GetAppClients,
  RegisterAppClient,
  RemoveClient,
  RevokeClient,
  AllowClient,
} from '../../provider/app/AppManagementProvider';
import { AppClientRegistrationRequest } from '../../provider/app/AppManagementProviderTypes';
import { useOdinClientContext } from '@homebase-id/common-app';

export const useAppClients = ({ appId }: { appId?: string }) => {
  const queryClient = useQueryClient();
  const odinClient = useOdinClientContext();

  const fetch = async ({ appId }: { appId: string }) => {
    return await GetAppClients(odinClient, appId);
  };

  const registerClient = async ({
    appId,
    clientPublicKey64,
    clientFriendlyName,
  }: {
    appId: string;
    clientPublicKey64: string;
    clientFriendlyName: string;
  }) => {
    const clientRegRequest: AppClientRegistrationRequest = {
      appId: appId,
      clientPublicKey64: clientPublicKey64,
      clientFriendlyName: clientFriendlyName,
    };

    return RegisterAppClient(odinClient, clientRegRequest);
  };

  const removeClient = async ({
    appId,
    registrationId,
  }: {
    appId: string;
    registrationId: string;
  }) => {
    return await RemoveClient(odinClient, { appId, registrationId });
  };

  const revokeClient = async ({
    appId,
    registrationId,
  }: {
    appId: string;
    registrationId: string;
  }) => {
    return await RevokeClient(odinClient, { appId, registrationId });
  };

  const allowClient = async ({
    appId,
    registrationId,
  }: {
    appId: string;
    registrationId: string;
  }) => {
    return await AllowClient(odinClient, { appId, registrationId });
  };

  return {
    fetch: useQuery({
      queryKey: ['app-clients', appId],
      queryFn: () => fetch({ appId: appId as string }),
      refetchOnWindowFocus: false,
      retry: false,
      enabled: !!appId,
    }),
    registerClient: useMutation({
      mutationFn: registerClient,
      onSuccess: (data, param) => invalidateAppClients(queryClient, param.appId),
      onError: (ex) => {
        console.error(ex);
      },
    }),
    removeClient: useMutation({
      mutationFn: removeClient,
      onSuccess: (data, param) => invalidateAppClients(queryClient, param.appId),
      onError: (ex) => {
        console.error(ex);
      },
    }),
    revokeClient: useMutation({
      mutationFn: revokeClient,
      onSuccess: (data, param) => invalidateAppClients(queryClient, param.appId),
      onError: (ex) => {
        console.error(ex);
      },
    }),
    allowClient: useMutation({
      mutationFn: allowClient,
      onSuccess: (data, param) => invalidateAppClients(queryClient, param.appId),
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export const invalidateAppClients = (queryClient: QueryClient, appId?: string | undefined) => {
  queryClient.invalidateQueries({
    queryKey: ['app-clients', appId].filter(Boolean),
    exact: !!appId,
  });
};
