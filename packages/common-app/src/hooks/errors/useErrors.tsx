/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from '../../helpers';

export interface Error {
  type: 'warning' | 'critical';
  message: string;
  details?: {
    title?: string;
    stackTrace?: string;
    correlationId?: string;
    domain?: string;
  };
}

const getKnownErrorMessages = (error: unknown): string | undefined => {
  const errorCode = (error as any)?.response?.data?.errorCode;

  if (errorCode === 'noErrorCode') return undefined;
  // TODO: Can be extended with more user friendly error messages
  return errorCode;
};

const getDetails = (error: unknown) => {
  return {
    title: (error as any)?.response?.data.title,
    stackTrace: (error as any)?.response?.data?.stackTrace,
    correlationId:
      (error as any)?.response?.headers?.['odin-correlation-id'] ||
      (error as any)?.response?.data?.correlationId,
    domain: window.location.hostname,
  };
};

export const useErrors = () => {
  const queryClient = useQueryClient();

  return {
    fetch: useQuery({
      queryKey: ['errors'],
      queryFn: () => [] as Error[],

      gcTime: Infinity,
      staleTime: Infinity,
    }),
    add: (error: unknown) => {
      const currentErrors = queryClient.getQueryData<Error[]>(['errors']);
      const knownErrorMessage = getKnownErrorMessages(error);
      const details = getDetails(error);

      const newError: Error = {
        type: knownErrorMessage ? 'warning' : 'critical',
        message:
          knownErrorMessage ||
          (error instanceof Error
            ? error.message
            : t('Something went wrong, please try again later')),
        details,
      };

      const updatedErrors = [...(currentErrors || []), newError];
      queryClient.setQueryData(['errors'], updatedErrors);
    },
    dismiss: (error: Error) => {
      const currentErrors = queryClient.getQueryData<Error[]>(['errors']);

      const updatedErrors = currentErrors?.filter((e) => e !== error);

      queryClient.setQueryData(['errors'], updatedErrors);
    },
  };
};
