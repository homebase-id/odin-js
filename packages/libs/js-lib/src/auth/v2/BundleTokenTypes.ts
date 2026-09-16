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

/**
 * The JSON carried (base64url) in the `p` param of `/owner/bundle-tokens/authorize`.
 */
export interface BundleAuthorizeParams {
  primaryAppId: string;
  appIds: string[];
  friendlyName: string;
  /** Same encoding as YouAuth's `public_key` */
  publicKey: string;
  redirectUri: string;
  state: string;
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
