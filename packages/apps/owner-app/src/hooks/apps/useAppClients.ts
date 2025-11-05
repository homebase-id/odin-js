import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GetAppClients,
  RegisterAppClient,
  RemoveClient,
  RevokeClient,
  AllowClient,
} from '../../provider/app/AppManagementProvider';
import { AppClientRegistrationRequest } from '../../provider/app/AppManagementProviderTypes';
import { useDotYouClientContext } from '@homebase-id/common-app';

export const useAppClients = ({ appId }: { appId?: string }) => {
  const queryClient = useQueryClient();
  const dotYouClient = useDotYouClientContext();

  const fetch = async ({ appId }: { appId: string }) => {
    return await GetAppClients(dotYouClient, appId);
  };

  const registerClient = async ({
    appId,
    jwkBase64UrlPublicKey,
    clientFriendlyName,
  }: {
    appId: string;
    jwkBase64UrlPublicKey: string;
    clientFriendlyName: string;
  }) => {
    const clientRegRequest: AppClientRegistrationRequest = {
      appId: appId,
      jwkBase64UrlPublicKey: jwkBase64UrlPublicKey,
      clientFriendlyName: clientFriendlyName,
    };

    return RegisterAppClient(dotYouClient, clientRegRequest);
  };

  const removeClient = async ({
    appId,
    registrationId,
  }: {
    appId: string;
    registrationId: string;
  }) => {
    return await RemoveClient(dotYouClient, { appId, registrationId });
  };

  const revokeClient = async ({
    appId,
    registrationId,
  }: {
    appId: string;
    registrationId: string;
  }) => {
    return await RevokeClient(dotYouClient, { appId, registrationId });
  };

  const allowClient = async ({
    appId,
    registrationId,
  }: {
    appId: string;
    registrationId: string;
  }) => {
    return await AllowClient(dotYouClient, { appId, registrationId });
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
