import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GetAppClients,
  RegisterAppClient,
  RemoveClient,
  RevokeClient,
  AllowClient,
} from '../../provider/app/AppManagementProvider';
import { AppClientRegistrationRequest } from '../../provider/app/AppManagementProviderTypes';
import useAuth from '../auth/useAuth';

const useAppClients = ({ appId }: { appId?: string }) => {
  const queryClient = useQueryClient();
  const dotYouClient = useAuth().getDotYouClient();

  const fetch = async ({ appId }: { appId: string }) => {
    return (await GetAppClients(dotYouClient)).filter((client) => client.appId === appId);
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
    fetch: useQuery(['appClients', appId], () => fetch({ appId: appId as string }), {
      refetchOnWindowFocus: false,
      retry: false,
      enabled: !!appId,
    }),
    registerClient: useMutation(registerClient, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['appClients', param.appId]);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    removeClient: useMutation(removeClient, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['appClients', param.appId]);
        queryClient.invalidateQueries(['appClients']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    revokeClient: useMutation(revokeClient, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['appClients', param.appId]);
        queryClient.invalidateQueries(['appClients']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
    allowClient: useMutation(allowClient, {
      onSuccess: (data, param) => {
        queryClient.invalidateQueries(['appClients', param.appId]);
        queryClient.invalidateQueries(['appClients']);
      },
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};

export default useAppClients;
