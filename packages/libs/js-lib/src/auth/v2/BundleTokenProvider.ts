import axios from 'axios';
import { ApiType, BaseDotYouClient, DotYouClient } from '../../core/DotYouClient';
import { cbcDecrypt } from '../../helpers/AesEncrypt';
import { base64ToUint8Array, stringToUint8Array, uint8ArrayToBase64 } from '../../helpers/DataUtil';
import { exportEccPublicKey, getEccSharedSecret, importRemotePublicEccKey } from '../providers/EccKeyProvider';
import { decodeBase64UrlJson, encodeBase64UrlJson } from './Base64UrlJson';
import {
  BeginBundleTokenExchangeResponse,
  BundleAuthorizationPreview,
  BundleAuthorizationRequest,
  BundleAuthorizeParams,
  BundleTokenCredentials,
  BundleTokenExchangeResponse,
  IssueBundleTokenRequest,
  RedactedBundleToken,
} from './BundleTokenTypes';
import { createV2AxiosClient, getV2Root, toOdinV2ApiError, withV2Errors } from './V2ApiClient';

const root = '/bundle-tokens';

/** The request header that picks the acting app for a bundle token; the default is the primary app. */
export const BUNDLE_ACTING_APP_HEADER = 'X-ODIN-APP-ID';

// ---------------------------------------------------------------------------------------------
// Owner endpoints (pass the owner console's DotYouClient)
// ---------------------------------------------------------------------------------------------

/** Issues a token for already-registered apps (ids only). The one-shot `authorizeBundle` is the primary path. */
export const issueBundleToken = (dotYouClient: BaseDotYouClient, request: IssueBundleTokenRequest) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    return (await client.post<BeginBundleTokenExchangeResponse>(root, request)).data;
  });

export const getBundleTokens = (dotYouClient: BaseDotYouClient, appId?: string) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    const url = appId ? `${root}?appId=${encodeURIComponent(appId)}` : root;
    return (await client.get<RedactedBundleToken[]>(url)).data;
  });

export const revokeBundleToken = (dotYouClient: BaseDotYouClient, tokenId: string) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    await client.post(`${root}/${tokenId}/revoke`, {});
  });

export const allowBundleToken = (dotYouClient: BaseDotYouClient, tokenId: string) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    await client.post(`${root}/${tokenId}/allow`, {});
  });

export const deleteBundleToken = (dotYouClient: BaseDotYouClient, tokenId: string) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    await client.delete(`${root}/${tokenId}`);
  });

/** The primary app can't be removed. */
export const removeAppFromBundleToken = (
  dotYouClient: BaseDotYouClient,
  tokenId: string,
  appId: string
) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    await client.delete(`${root}/${tokenId}/apps/${appId}`);
  });

// ---------------------------------------------------------------------------------------------
// Client side: consent URL, redirect-back URL, exchange
// ---------------------------------------------------------------------------------------------

/**
 * The public key encoding YouAuth sends as `public_key` (see getRegistrationParams): base64 of the
 * JWK JSON. The server parses it with EccPublicKeyData.FromJwkBase64UrlPublicKey, which accepts it.
 */
export const exportBundlePublicKey = async (publicKey: CryptoKey) =>
  uint8ArrayToBase64(stringToUint8Array(await exportEccPublicKey(publicKey)));

/**
 * `https://{identity}/owner/bundle-tokens/authorize#p={base64url(JSON)}`. The request travels in the
 * fragment, which never reaches the server, so several manifests are not limited by URL-length limits.
 */
export const getBundleAuthorizeUrl = (
  identity: string,
  params: Omit<BundleAuthorizeParams, 'appIds'>
) =>
  `https://${identity}/owner/bundle-tokens/authorize#${new URLSearchParams({
    p: encodeBase64UrlJson(params),
  }).toString()}`;

/**
 * Reads `p` from a consent URL's fragment, falling back to the query string (older links). Legacy
 * `appIds` payloads are converted to `apps` without manifests.
 */
export const readBundleAuthorizeParams = (
  hash: string,
  search: string
): BundleAuthorizeParams | undefined => {
  const fromHash = new URLSearchParams(hash.replace(/^#/, '')).get('p');
  const fromQuery = new URLSearchParams(search).get('p');
  const params = decodeBase64UrlJson<BundleAuthorizeParams>(fromHash || fromQuery);
  if (!params) return undefined;
  if (!Array.isArray(params.apps)) {
    params.apps = (params.appIds ?? []).map((appId) => ({ appId }));
  }
  return params;
};

/** What authorizing would do, per app, with every problem. Writes nothing. Owner only. */
export const previewBundleAuthorization = (
  dotYouClient: BaseDotYouClient,
  request: BundleAuthorizationRequest
) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    return (await client.post<BundleAuthorizationPreview>(`${root}/authorize/preview`, request)).data;
  });

/**
 * One consent for several apps: installs/updates every app sent with a manifest, then issues one
 * bundle token for all of them. Owner only.
 */
export const authorizeBundle = (dotYouClient: BaseDotYouClient, request: BundleAuthorizationRequest) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    return (await client.post<BeginBundleTokenExchangeResponse>(`${root}/authorize`, request)).data;
  });

const appendParams = (url: string, params: Record<string, string>) => {
  try {
    const parsed = new URL(url);
    Object.entries(params).forEach(([key, value]) => parsed.searchParams.set(key, value));
    return parsed.toString();
  } catch {
    const query = new URLSearchParams(params).toString();
    return `${url}${url.includes('?') ? '&' : '?'}${query}`;
  }
};

/** Where the consent page sends the browser after issuing: the YouAuth parameter names. */
export const getBundleRedirectUrl = (
  redirectUri: string,
  identity: string,
  exchange: BeginBundleTokenExchangeResponse,
  state: string
) =>
  appendParams(redirectUri, {
    identity,
    public_key: exchange.exchangePublicKeyJwkBase64Url,
    salt: exchange.exchangeSalt64,
    state,
  });

export const getBundleCancelUrl = (redirectUri: string, state: string) =>
  appendParams(redirectUri, { error: 'cancelled-by-user', state });

/** Anonymous and not encrypted; 404 when the digest is unknown, expired or already collected. */
export const exchangeBundleDigestForToken = async (
  identity: string,
  base64ExchangedSecretDigest: string
): Promise<BundleTokenExchangeResponse> => {
  try {
    const response = await axios.post<BundleTokenExchangeResponse>(
      `https://${identity}/api/v2${root}/exchange`,
      { secret_digest: base64ExchangedSecretDigest },
      { withCredentials: false }
    );
    return response.data;
  } catch (error) {
    throw await toOdinV2ApiError(error);
  }
};

/**
 * Step 3/4 of the exchange: exactly `finalizeAuthentication`, but against
 * `/api/v2/bundle-tokens/exchange`. `publicKey` and `salt` are the `public_key` and `salt` params
 * the consent page redirected back with.
 */
export const finalizeBundleAuthentication = async (
  identity: string,
  privateKey: CryptoKey,
  publicKey: string,
  salt: string
): Promise<BundleTokenCredentials> => {
  // The server sends base64url; importRemotePublicEccKey uses atob, which wants standard base64.
  const standardPublicKey = publicKey.replace(/-/g, '+').replace(/_/g, '/');
  const importedRemotePublicKey = await importRemotePublicEccKey(standardPublicKey);

  const exchangedSecret = new Uint8Array(
    await getEccSharedSecret(privateKey, importedRemotePublicKey, salt)
  );

  const exchangedSecretDigest = await crypto.subtle.digest('SHA-256', exchangedSecret);
  const base64ExchangedSecretDigest = uint8ArrayToBase64(new Uint8Array(exchangedSecretDigest));

  const token = await exchangeBundleDigestForToken(identity, base64ExchangedSecretDigest);

  const sharedSecret = await cbcDecrypt(
    base64ToUint8Array(token.base64SharedSecretCipher),
    base64ToUint8Array(token.base64SharedSecretIv),
    exchangedSecret
  );

  const clientAuthToken = await cbcDecrypt(
    base64ToUint8Array(token.base64ClientAuthTokenCipher),
    base64ToUint8Array(token.base64ClientAuthTokenIv),
    exchangedSecret
  );

  return {
    clientAuthToken: uint8ArrayToBase64(clientAuthToken),
    sharedSecret: uint8ArrayToBase64(sharedSecret),
  };
};

// ---------------------------------------------------------------------------------------------
// Using a bundle token
// ---------------------------------------------------------------------------------------------

export interface BundleTokenClientOptions {
  hostIdentity: string;
  /** base64 ClientAuthenticationToken, as returned by finalizeBundleAuthentication */
  clientAuthToken: string;
  /** base64 shared secret, as returned by finalizeBundleAuthentication */
  sharedSecret: string;
  /** Acting app; omit for the token's primary app */
  actingAppId?: string;
  headers?: Record<string, string>;
}

/**
 * A DotYouClient for a bundle token: `Authorization: Bearer <token>`, optional `X-ODIN-APP-ID`,
 * shared-secret encryption with the token's secret, and `getEndpoint()` rooted at `/api/v2`, so
 * relative paths like `/auth/context` work. V1 helpers do not work with it (V1 rejects bundle
 * tokens).
 *
 * Credentials (cookies) are never sent. The V2 authentication handler prefers the owner cookie over
 * the Authorization header, and an app on a sibling subdomain is same-site with the identity, so a
 * credentialed request from a browser where the owner is logged in would authenticate as the owner.
 */
export class BundleTokenClient extends DotYouClient {
  private readonly _bundleOptions: BundleTokenClientOptions;

  constructor(options: BundleTokenClientOptions) {
    super({
      api: ApiType.App,
      hostIdentity: options.hostIdentity,
      sharedSecret: base64ToUint8Array(options.sharedSecret),
      headers: {
        ...options.headers,
        Authorization: `Bearer ${options.clientAuthToken}`,
        ...(options.actingAppId ? { [BUNDLE_ACTING_APP_HEADER]: options.actingAppId } : {}),
      },
    });
    this._bundleOptions = options;
  }

  getEndpoint(): string {
    return getV2Root(this);
  }

  getActingAppId(): string | undefined {
    return this._bundleOptions.actingAppId;
  }

  /** The same token acting as another member app (undefined: the primary app). */
  withActingApp(actingAppId: string | undefined): BundleTokenClient {
    return new BundleTokenClient({ ...this._bundleOptions, actingAppId });
  }

  createAxiosClient(options?: Parameters<DotYouClient['createAxiosClient']>[0]) {
    const client = super.createAxiosClient(options);
    client.defaults.withCredentials = false;
    return client;
  }
}

/** Redacted security context of the caller: `GET /api/v2/auth/context`. */
export const getV2AuthContext = <T = unknown>(dotYouClient: BaseDotYouClient) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    return (await client.get<T>('/auth/context')).data;
  });

/** Logout for a bundle token: the token making the request deletes itself. */
export const logoutBundleToken = (dotYouClient: BaseDotYouClient) =>
  withV2Errors(dotYouClient, async () => {
    const client = createV2AxiosClient(dotYouClient);
    await client.delete(`${root}/current`);
  });
