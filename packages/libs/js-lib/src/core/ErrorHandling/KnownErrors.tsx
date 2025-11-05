import axios, { isAxiosError } from 'axios';

export interface OdinBackendErrorObject {
  errorCode?: string;
  stackTrace?: string;
}

const t = (text: string) => text;

const isOdinBackEndErrorObject = (err: unknown): err is OdinBackendErrorObject => {
  if (err === null || typeof err !== 'object') return false;
  if (
    ('errorCode' in err && typeof err.errorCode === 'string') ||
    ('stackTrace' in err && typeof err.stackTrace === 'string')
  )
    return true;
  return false;
};

export const getKnownOdinErrorMessages = (error: unknown): string | undefined => {
  const errorCode = (() => {
    if (isAxiosError<OdinBackendErrorObject>(error)) {
      if (isOdinBackEndErrorObject(error.response?.data)) return error.response?.data.errorCode;
    }
    if (isOdinBackEndErrorObject(error)) return error.errorCode;
  })();

  if (
    errorCode === 'noErrorCode' ||
    errorCode === 'unhandledScenario' ||
    errorCode === 'argumentError'
  )
    return undefined;

  if (errorCode === 'invalidAuthToken') return t('Invalid authentification token');
  if (errorCode === 'sharedSecretEncryptionIsInvalid') return t("Request couldn't be decrypted");

  if (errorCode === 'invalidEmail') return t('The email address is invalid');
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
  if (errorCode === 'identityAlreadyFollowed') return t('Already following this identity');

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
  
  if(errorCode === 'passwordRecoveryNotConfigured')
    return t('Password recovery not configured');

  console.error('[KnownErrors] Unknown error code', errorCode);
  return undefined;
};

const isJavaScriptError = (err: Error | unknown): err is Error => {
  if (err === null || typeof err !== 'object') return false;
  if (err instanceof Error) return true;
  if ('name' in err && 'message' in err && 'title' in err) return true;
  return false;
};

export interface OdinErrorDetails {
  title?: string;
  stackTrace?: string;
  correlationId?: string;
  domain?: string;
}

export const getOdinErrorDetails = (error: Error | unknown): OdinErrorDetails => {
  if (axios.isAxiosError(error)) {
    return {
      title: error?.response?.data?.title,
      stackTrace: error?.response?.data?.stackTrace,
      correlationId:
        error?.response?.headers?.['odin-correlation-id'] || error?.response?.data?.correlationId,
      domain: typeof window === 'undefined' ? '' : window.location?.hostname,
    };
  }

  if (isJavaScriptError(error)) {
    return {
      title: error.name,
      stackTrace: error?.stack,
      correlationId: undefined,
      domain: typeof window === 'undefined' ? '' : window.location?.hostname,
    };
  }

  return {
    title: (error as Error)?.name || `Unknown error`,
    stackTrace: (error as Error)?.stack || error?.toString(),
  };
};
