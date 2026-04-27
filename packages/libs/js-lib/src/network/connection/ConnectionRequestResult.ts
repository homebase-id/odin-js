/**
 * Machine-readable outcome of a connection-request send attempt.
 * Wire values are camelCase strings (server uses camelCase enum serialization).
 */
export enum AutoConnectOutcome {
  /** Sent, auto-accepted by recipient, and ICR fully established. */
  Connected = 'connected',
  /** A pending incoming request from the recipient existed and was accepted locally. */
  AcceptedFromExistingIncoming = 'acceptedFromExistingIncoming',
  /** Sent and stored as pending on the recipient; they must accept manually. */
  PendingManualApproval = 'pendingManualApproval',
  /** ICR with recipient already exists in connected state. */
  AlreadyConnected = 'alreadyConnected',
  /** Recipient is blocked, or we are blocked by the recipient. */
  Blocked = 'blocked',
  /** An outgoing connection request to this recipient already exists. */
  OutgoingRequestAlreadyExists = 'outgoingRequestAlreadyExists',
  /** Recipient reports an introductory request from us was already received. */
  DuplicateIntroductoryRequest = 'duplicateIntroductoryRequest',
  /** Could not reach the recipient (transport / encryption failure). NOT the sender's fault. */
  RecipientUnreachable = 'recipientUnreachable',
  /** Recipient explicitly denied the request (403 / Forbidden equivalent). */
  RecipientRejected = 'recipientRejected',
  /** Request header failed validation (self-recipient, missing recipient, etc.). */
  InvalidRequest = 'invalidRequest',
  /** Recipient's identity exists but initial setup hasn't been completed. Not short-term retryable. */
  RecipientIdentityNotConfigured = 'recipientIdentityNotConfigured',
  /** Recipient's identity server is on an older version that can't process this request. Not short-term retryable. */
  RecipientRequiresUpgrade = 'recipientRequiresUpgrade',
  /** Unexpected error. See `detail` for diagnostic string. */
  Failed = 'failed',
}

export interface ConnectionRequestResult {
  outcome: AutoConnectOutcome;
  /** Optional diagnostic string; populated for Failed and RecipientUnreachable. */
  detail?: string | null;
}

export interface ConnectionRequestDisplayMessage {
  severity: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
}

/**
 * Maps a {@link ConnectionRequestResult} to a user-displayable message.
 * Pure function — caller picks the UI surface (inline, toast, banner).
 */
export const describeConnectionRequestResult = (
  result: ConnectionRequestResult,
  recipient: string
): ConnectionRequestDisplayMessage => {
  switch (result.outcome) {
    case AutoConnectOutcome.Connected:
    case AutoConnectOutcome.AcceptedFromExistingIncoming:
      return { severity: 'success', title: `Connected to ${recipient}` };

    case AutoConnectOutcome.PendingManualApproval:
      return {
        severity: 'success',
        title: 'Request sent',
        description: `${recipient} will be notified and can accept your request.`,
      };

    case AutoConnectOutcome.AlreadyConnected:
      return {
        severity: 'info',
        title: 'Already connected',
        description: `You're already connected to ${recipient}.`,
      };

    case AutoConnectOutcome.OutgoingRequestAlreadyExists:
      return {
        severity: 'info',
        title: 'Request already sent',
        description: `You've already sent a connection request to ${recipient}. Waiting for them to respond.`,
      };

    case AutoConnectOutcome.DuplicateIntroductoryRequest:
      return {
        severity: 'info',
        title: 'Already introduced',
        description: `An introduction to ${recipient} has already been sent.`,
      };

    case AutoConnectOutcome.Blocked:
      return {
        severity: 'warning',
        title: 'Connection blocked',
        description: `You can't send a request to ${recipient} right now.`,
      };

    case AutoConnectOutcome.RecipientRejected:
      return {
        severity: 'warning',
        title: 'Request declined',
        description: `${recipient} declined your connection request.`,
      };

    case AutoConnectOutcome.RecipientIdentityNotConfigured:
      return {
        severity: 'warning',
        title: `${recipient} hasn't finished setting up`,
        description:
          `${recipient} has an identity but hasn't completed initial setup yet. ` +
          `Ask them to finish setup and try again.`,
      };

    case AutoConnectOutcome.RecipientRequiresUpgrade:
      return {
        severity: 'warning',
        title: `${recipient} needs a server update`,
        description:
          `${recipient}'s identity server is running an older version that can't ` +
          `process this request. Let them know so they can update.`,
      };

    case AutoConnectOutcome.RecipientUnreachable:
      return {
        severity: 'warning',
        title: `Couldn't reach ${recipient}`,
        description: `${recipient} may be offline or unavailable. Please try again later.`,
      };

    case AutoConnectOutcome.InvalidRequest:
      return {
        severity: 'error',
        title: 'Invalid request',
        description: result.detail ?? 'The connection request could not be validated.',
      };

    case AutoConnectOutcome.Failed:
    default:
      return {
        severity: 'error',
        title: 'Something went wrong',
        description: result.detail ?? "We couldn't send your request. Please try again.",
      };
  }
};
