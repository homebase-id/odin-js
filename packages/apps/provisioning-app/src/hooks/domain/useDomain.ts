import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

export const useDomain = () => {
  const root = '//' + window.location.host + '/api/registration/v1';

  const reserveDomain = async ({ domain }: { domain: string }) => {
    const isAvailableUrl = root + '/registration/availability/' + domain;
    const isAvailable = await axios.get<boolean>(isAvailableUrl).then((response) => response.data);

    if (!isAvailable) {
      return false;
    }

    const url = root + '/registration/reservations';
    const reserveResponse = await axios
      .post<{ id: string }>(url, {
        domainName: domain,
      })
      .then((response) => response.data);

    return reserveResponse.id;
  };

  const registerDomain = async ({ reservationId }: { reservationId: string }) => {
    const url = root + '/registration/register';
    const response = await axios
      .post<string>(url, {
        reservationId: reservationId,
      })
      .then((response) => response.data);

    return response;
  };

  const pollProvisioningState = async ({ firstRunToken }: { firstRunToken: string }) => {
    const url = root + '/registration/status?firstRunToken=' + firstRunToken;
    const response = await axios.get<string>(url).then((response) => {
      if (response.data === 'readyForPassword') {
        return 'Success';
      } else if (response.data === 'awaitingCertificate') {
        return 'Provisioning';
      } else {
        return 'Unknown';
      }
    });

    return response;
  };

  return {
    reserve: useMutation({
      mutationFn: reserveDomain,
      onError: (ex) => {
        console.error(ex);
      },
    }),
    register: useMutation({
      mutationFn: registerDomain,
      onError: (ex) => {
        console.error(ex);
      },
    }),
    poll: useMutation({
      mutationFn: pollProvisioningState,
      onError: (ex) => {
        console.error(ex);
      },
    }),
  };
};
