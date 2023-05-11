import { useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from '../../helpers';

export interface Error {
  type: 'warning' | 'critical';
  message: string;
}

const getKnownErrorMessages = (errorCode: number): string | undefined => {
  if (errorCode) {
    switch (errorCode) {
      case 1001:
        return t('InvalidAuthToken');
      case 2001:
        return t('InvalidNotificationType');
      case 2002:
        return t('UnknownNotificationId');
      case 3001:
        return t('A circle cannot have no permissions, please review and try again');
      case 3002:
        return t('CannotAllowCirclesOnAuthenticatedOnly');
      case 3003:
        return t('CannotAllowCirclesOrIdentitiesOnAnonymousOrOwnerOnly');
      case 3004:
        return t('CannotDeleteCircleWithMembers');
      case 3005:
        return t('IdentityAlreadyMemberOfCircle');
      case 3006:
        return t('NotAConnectedIdentity');
      case 4001:
        return t('CannotAllowAnonymousReadsOnOwnerOnlyDrive');
      case 4002:
        return t('CannotUpdateDeletedFile');
      case 4003:
        return t('DriveAliasAndTypeAlreadyExists');
      case 4004:
        return t('InvalidGrantNonExistingDrive');
      case 4101:
        return t('CannotOverwriteNonExistentFileStef');
      case 4102:
        return t('CannotUploadEncryptedFileForAnonymous');
      case 4103:
        return t('CannotUseGlobalTransitIdOnTransientFile');
      case 4104:
        return t('DriveSecurityAndAclMismatch');
      case 4105:
        return t('ExistingFileWithUniqueId');
      case 4106:
        return t('FileNotFound');
      case 4107:
        return t('IdAlreadyExists');
      case 4108:
        return t('InvalidInstructionSet');
      case 4109:
        return t('InvalidKeyHeader');
      case 4110:
        return t('InvalidRecipient');
      case 4111:
        return t('InvalidTargetDrive');
      case 4112:
        return t('InvalidThumnbnailName');
      case 4113:
        return t('InvalidTransferFileType');
      case 4114:
        return t('InvalidTransferType');
      case 4115:
        return t('MalformedMetadata');
      case 4116:
        return t('MissingUploadData');
      case 4117:
        return t('TransferTypeNotSpecified');
      case 4118:
        return t('UnknownId');
      case 5001:
        return t('CannotSendConnectionRequestToExistingIncomingRequest');
      case 5002:
        return t('CannotSendMultipleConnectionRequestToTheSameIdentity');
      case 5003:
        return t('You cannot send a connection request to yourself');
      case 6001:
        return t('AppNotRegistered');
      case 9001:
        return t('InvalidFlagName');
      case 9002:
        return t('NotInitialized');
      case 9003:
        return t('UnknownFlagName');
    }

    console.log('Error code found, but no corresponding message in the dictionary', errorCode);
  }
  return;
};

export const useErrors = () => {
  const queryClient = useQueryClient();

  return {
    fetch: useQuery(['errors'], () => [] as Error[], {
      onError: (error) => console.log('onError', error),
      cacheTime: Infinity,
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
