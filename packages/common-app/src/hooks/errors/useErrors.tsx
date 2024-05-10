/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { t } from '../../helpers';
import axios, { AxiosError } from 'axios';

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

  if (
    errorCode === 'noErrorCode' ||
    errorCode === 'unhandledScenario' ||
    errorCode === 'argumentError'
  )
    return undefined;

  if (errorCode === 'invalidAuthToken') return t('Invalid authentification token');
  if (errorCode === 'sharedSecretEncryptionIsInvalid') return t("Request couldn't be decrypted");

  // Circle Errors
  if (errorCode === 'atLeastOneDriveOrPermissionRequiredForCircle')
    return t('At least one drive or permission required for circle');
  if (errorCode === 'cannotAllowCirclesOnAuthenticatedOnly')
    return t('Cannot allow circles on authenticated only');
  if (errorCode === 'cannotAllowCirclesOrIdentitiesOnAnonymousOrOwnerOnly')
    return t('Cannot allow circles or identities on anonymous or owner only');
  if (errorCode === 'cannotDeleteCircleWithMembers') return t('Cannot delete circle with members');
  if (errorCode === 'identityAlreadyMemberOfCircle') return t('Identity already member of circle');
  if (errorCode === 'notAConnectedIdentity') return t('Not a connected identity');
  if (errorCode === 'notAFollowerIdentity') return t('Not a follower identity');
  if (errorCode === 'identityNotFollowed') return t('Identity not followed');

  // Drive Management Errors
  if (errorCode === 'cannotAllowAnonymousReadsOnOwnerOnlyDrive')
    return t('Cannot allow anonymous reads on owner only drive');
  if (errorCode === 'cannotUpdateNonActiveFile') return t('Cannot update non active file');
  if (errorCode === 'driveAliasAndTypeAlreadyExists')
    return t('Drive alias and type already exists');
  if (errorCode === 'invalidGrantNonExistingDrive') return t('Invalid grant non existing drive');
  if (errorCode === 'cannotAllowSubscriptionsOnOwnerOnlyDrive')
    return t('Cannot allow subscriptions on owner only drive');

  // Drive errors 41xx
  if (errorCode === 'cannotOverwriteNonExistentFile')
    return t('Cannot overwrite non existent file');
  if (errorCode === 'cannotUploadEncryptedFileForAnonymous')
    return t('Cannot upload encrypted file for anonymous');
  if (errorCode === 'cannotUseGlobalTransitIdOnTransientFile')
    return t('Cannot use global transit id on transient file');
  if (errorCode === 'driveSecurityAndAclMismatch') return t('Drive security and acl mismatch');
  if (errorCode === 'existingFileWithUniqueId') return t('Existing file with unique id');
  if (errorCode === 'fileNotFound') return t('File not found');
  if (errorCode === 'idAlreadyExists') return t('Id already exists');
  if (errorCode === 'invalidInstructionSet') return t('Invalid instruction set');
  if (errorCode === 'invalidKeyHeader') return t('Invalid key header');
  if (errorCode === 'invalidRecipient') return t('Invalid recipient');
  if (errorCode === 'invalidTargetDrive') return t('Invalid target drive');
  if (errorCode === 'invalidThumnbnailName') return t('Invalid thumnbnail name');
  if (errorCode === 'invalidTransferFileType') return t('Invalid transfer file type');
  if (errorCode === 'invalidTransferType') return t('Invalid transfer type');
  if (errorCode === 'malformedMetadata') return t('Malformed metadata');
  if (errorCode === 'missingUploadData') return t('Missing upload data');
  if (errorCode === 'transferTypeNotSpecified') return t('Transfer type not specified');
  if (errorCode === 'unknownId') return t('Unknown id');
  if (errorCode === 'invalidPayload') return t('Invalid payload');
  if (errorCode === 'cannotUseReservedFileType') return t('Cannot use reserved file type');
  if (errorCode === 'invalidReferenceFile') return t('Invalid reference file');
  if (errorCode === 'cannotUseReferencedFileOnStandardFiles')
    return t('Cannot use referenced file on standard files');
  if (errorCode === 'cannotUseGroupIdInTextReactions')
    return t('Cannot use group id in text reactions');
  if (errorCode === 'invalidFileSystemType') return t('Invalid file system type');
  if (errorCode === 'invalidDrive') return t('Invalid drive');
  if (errorCode === 'invalidChunkStart') return t('Invalid chunk start');
  if (errorCode === 'missingVersionTag') return t('Missing version tag');
  if (errorCode === 'versionTagMismatch') return t('Version tag mismatch');
  if (errorCode === 'invalidFile') return t('Invalid file');
  if (errorCode === 'invalidQuery') return t('Invalid query');
  if (errorCode === 'invalidUpload') return t('Invalid upload');
  if (errorCode === 'invalidPayloadNameOrKey') return t('Invalid payload name or key');
  if (errorCode === 'fileLockedDuringWriteOperation')
    return t('File locked during write operation');

  // Connection errors
  if (errorCode === 'cannotSendConnectionRequestToExistingIncomingRequest')
    return t('Cannot send connection request to existing incoming request');
  if (errorCode === 'cannotSendMultipleConnectionRequestToTheSameIdentity')
    return t('Cannot send multiple connection request to the same identity');
  if (errorCode === 'connectionRequestToYourself')
    return t('Cannot send a connection request to yourself');

  // App or YouAuth Domain Errors
  if (errorCode === 'appNotRegistered') return t('App not registered');
  if (errorCode === 'appRevoked') return t('App revoked');
  if (errorCode === 'domainNotRegistered') return t('Domain not registered');
  if (errorCode === 'appHasNoAuthorizedCircles') return t('App has no authorized circles');
  if (errorCode === 'invalidAccessRegistrationId') return t('Invalid access registration id');
  if (errorCode === 'invalidCorsHostName') return t('Invalid cors host name');

  // Transit errors
  if (errorCode === 'remoteServerReturnedForbidden') return t('Remote server returned forbidden');
  if (errorCode === 'remoteServerReturnedInternalServerError')
    return t('Remote server returned internal server error');
  if (errorCode === 'remoteServerTransitRejected') return t('Remote server transit rejected');
  if (errorCode === 'invalidTransitOptions') return t('Invalid transit options');
  if (errorCode === 'registrationStatusNotReadyForFinalization')
    return t('Registration status not ready for finalization');

  console.error('[useErrors] Unknown error code', errorCode);
  return t('Something went wrong, please try again later');
};

const getDetails = (error: unknown) => {
  return {
    title: axios.isAxiosError(error) ? (error?.response?.data as any)?.title : (error as any)?.name,
    stackTrace: axios.isAxiosError(error)
      ? (error?.response?.data as any)?.stackTrace
      : (error as any)?.stack,
    correlationId: axios.isAxiosError(error)
      ? error?.response?.headers?.['odin-correlation-id'] || error?.response?.data?.correlationId
      : undefined,
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
            ? error.toString()
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
