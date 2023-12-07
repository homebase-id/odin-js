import { useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from '../../helpers';

export interface Error {
  type: 'warning' | 'critical';
  message: string;
}

const getKnownErrorMessages = (errorCode: string): string | undefined => {
  // TODO: Can be extended with more user friendly error messages
  return errorCode;
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
      const errorCode = (error as any)?.response?.data?.errorCode;
      const knownErrorMessage = getKnownErrorMessages(errorCode);

      const newError: Error = {
        type: knownErrorMessage ? 'warning' : 'critical',
        message:
          knownErrorMessage ||
          (error instanceof Error
            ? error.message
            : t('Something went wrong, please try again later')),
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
