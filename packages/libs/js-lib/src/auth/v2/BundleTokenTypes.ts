import type {
  AppManifestV2,
  AppRegistrationProblem,
  AppRegistrationValidationResult,
} from './AppRegistrationV2Types';

/**
 * Wire types for `/api/v2/bundle-tokens` (odin-core docs/app-registration-v2-api.md).
 */

export interface IssueBundleTokenRequest {
  primaryAppId: string;
  appIds: string[];
  friendlyName: string;
  /** The client's ECC P-384 public key, JWK, base64(url) -- the same value YouAuth's `public_key` carries */
  jwkBase64UrlPublicKey: string;
  /** When the primary app has a corsHostName, this must be on that host */
  redirectUri?: string;
}

export interface BeginBundleTokenExchangeResponse {
  tokenId: string;
  exchangePublicKeyJwkBase64Url: string;
  exchangeSalt64: string;
}

export interface BundleTokenExchangeResponse {
  base64SharedSecretCipher: string;
  base64SharedSecretIv: string;
  base64ClientAuthTokenCipher: string;
  base64ClientAuthTokenIv: string;
}

export interface BundleTokenAppInfo {
  appId: string;
  name: string;
  appSlug: string;
  isPrimary: boolean;
  isRevoked: boolean;
  isMissing: boolean;
}

export interface RedactedBundleToken {
  tokenId: string;
  friendlyName: string;
  primaryAppId: string;
  isRevoked: boolean;
  created: number;
  expiresAt: number;
  apps: BundleTokenAppInfo[];
}

/** One app in a bundle request: a manifest to install/update it, or the id alone for a registered app. */
export interface BundleAppRequest {
  appId: string;
  manifest?: AppManifestV2;
}

/**
 * The JSON carried (base64url) in the `p` fragment param of `/owner/bundle-tokens/authorize#p=`.
 */
export interface BundleAuthorizeParams {
  primaryAppId: string;
  apps: BundleAppRequest[];
  friendlyName: string;
  /** Same encoding as YouAuth's `public_key` */
  publicKey: string;
  redirectUri: string;
  state: string;
  /** Legacy (pre one-shot) links: ids only. Read as `apps` without manifests. */
  appIds?: string[];
}

/** `POST /api/v2/bundle-tokens/authorize` and `.../authorize/preview` */
export interface BundleAuthorizationRequest {
  primaryAppId: string;
  /** The owner may deselect any but the primary */
  apps: BundleAppRequest[];
  friendlyName: string;
  /** Not needed for preview */
  jwkBase64UrlPublicKey?: string;
  redirectUri?: string;
}

/** 'none' | 'install' | 'update' */
export type BundleAppAction = 'none' | 'install' | 'update' | string;

export interface BundleAppPreview {
  appId: string;
  name: string;
  appSlug: string;
  isPrimary: boolean;
  isRegistered: boolean;
  isReserved: boolean;
  isRevoked: boolean;
  hasManifest: boolean;
  action: BundleAppAction;
  /** When a manifest was sent */
  validation?: AppRegistrationValidationResult | null;
  /** manifestAppIdMismatch, appNotRegistered, appRevoked, cross-app conflicts (slugTaken, driveOwnedElsewhere, circleOwnedElsewhere) */
  problems: AppRegistrationProblem[];
}

export interface BundleAuthorizationPreview {
  isValid: boolean;
  /** Request-level: noApps, tooManyApps, friendlyNameRequired, primaryAppMissing, appIdRequired, duplicateApp, redirectNotAllowed */
  problems: AppRegistrationProblem[];
  apps: BundleAppPreview[];
}

/** What `finalizeBundleAuthentication` returns; both values are base64. */
export interface BundleTokenCredentials {
  clientAuthToken: string;
  sharedSecret: string;
}

/** `GET /api/v2/auth/context` (RedactedOdinContext); only the fields the clients read are typed. */
export interface RedactedOdinContextV2 {
  caller: {
    odinId?: string;
    securityLevel?: string | number;
    [key: string]: unknown;
  };
  permissionContext: {
    permissionGroups: {
      driveGrants: {
        permissionedDrive: {
          drive: { alias: string; type: string };
          permission: string | number;
        };
        hasStorageKey: boolean;
      }[];
      permissionSet: { keys: number[] };
    }[];
  };
}
