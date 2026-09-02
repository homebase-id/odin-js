import { PermissionedDrive, PermissionSet } from '@homebase-id/js-lib/core';
import { DriveGrant } from '@homebase-id/js-lib/network';

export interface AppClientRegistrationRequest {
  appId: string;
  clientFriendlyName: string;
  jwkBase64UrlPublicKey: string;
}

export interface AppClientRegistrationResponse {
  /** Version number for how the data field is encrypted */
  encryptionVersion: number;

  /** RSA encrypted response.  When encryption version == 1, the  first 16 bytes is token id, second 16 bytes is AccessTokenHalfKey, and last 16 bytes is SharedSecret */
  data: string;

  /** A Guid representing the Id of the access registration */
  token: string;
}

export interface AppClientRegistration {
  appId: string;
  accessRegistrationClientType: string;
  accessRegistrationId: string;
  created: number;
  friendlyName: string;
  isRevoked: boolean;
}

export interface GetAppRequest {
  /** @format uuid */
  appId: string;
}

/** Indicates a set of permissions being requested */
export interface PermissionSetGrantRequest {
  /** Permission set being requested */
  permissionSet?: PermissionSet;

  /** The list of drives that the circles should receive access on */
  drives?: DriveGrantRequest[] | null;
}

export interface AppRegistrationRequest {
  /** @format uuid */
  appId: string;
  name: string | null;

  /**
   * The app half of `/apps/{appSlug}/drives/{driveSlug}`. Omit it and the server derives one from
   * `name` — "Homebase - Location" becomes "homebase-locat" — and a slug is immutable once written,
   * so the derived one is permanent. Registration is first-come: a slug another app already holds is
   * refused rather than silently changed.
   */
  appSlug?: string;

  corsHostName?: string;
  permissionSet?: PermissionSet;

  /** The list of drives of which this app should receive access */
  drives?: DriveGrantRequest[] | null;

  /** The list of circles that should receive access on this app */
  authorizedCircles?: string[];

  /** Permissions granted to members of the AuthorizedCircles */
  circleMemberPermissionGrant?: PermissionSetGrantRequest;
}

export interface DriveGrantRequest {
  permissionedDrive: PermissionedDrive;
  driveMeta?: {
    name: string;
    description: string;
    allowAnonymousReads?: boolean;
    allowSubscriptions?: boolean;
    attributes?: { [key: string]: string };
  };
}

export interface TargetDrive {
  alias: string;
  type: string;
}

export interface RedactedAppRegistration {
  appId: string;

  /**
   * The app's wire address. Only served by identity hosts that have the AppSlug column;
   * older hosts omit it entirely, so treat it as optional.
   */
  appSlug?: string | null;

  name: string;
  created: number;

  /** Last change to the app's grant. Served as RedactedAppRegistration.Modified. */
  modified?: number;

  corsHostName?: string;
  isRevoked: boolean;
  grant: RedactedExchangeGrant;
  circleMemberPermissionSetGrantRequest: {
    permissionSet: PermissionSet;
    drives: DriveGrant[];
  };
  authorizedCircles: string[];
}

export interface RedactedExchangeGrant {
  isRevoked: boolean;
  permissionSet: PermissionSet;
  driveGrants: DriveGrant[];

  /** Whether the grant carries an ICR key, i.e. the app can act over peer connections. */
  hasIcrKey?: boolean;
}

export enum DrivePermission {
  None = 0,
  Read = 1 << 0,
  Write = 1 << 2,
}

export enum PermissionFlags {
  None = 0,

  ReadConnections = 10,

  ReadConnectionRequests = 30,

  ReadCircleMembers = 50,
}

export interface PermissionUpdateRequest {
  appId: string;
  permissionSet: PermissionSet;
  drives: DriveGrant[];
}
