import { ApiType, DotYouClient } from '../../core/DotYouClient';
import { cbcDecrypt } from '../../helpers/AesEncrypt';
import { base64ToUint8Array, stringToUint8Array, uint8ArrayToBase64 } from '../../helpers/DataUtil';
import { ALL_CONNECTIONS_CIRCLE_ID } from '../../network/circleNetwork/CircleProvider';
import { getBrowser, getOperatingSystem } from '../helpers/browserInfo';
import { getEccSharedSecret, importRemotePublicEccKey } from './EccKeyProvider';

export interface YouAuthorizationParams {
  client_id: string;
  client_type: 'domain' | 'app';
  client_info: string;
  public_key: string;
  permission_request: string;
  state: string;
  redirect_uri: string;
}

export interface AppAuthorizationParams {
  n: string;
  appId: string;
  fn: string;
  p: string | undefined;
  cp: string | undefined;
  d: string | undefined;
  cd: string | undefined;
  c: string | undefined;
  return: string;
  o?: string;
}

export interface AppDriveAuthorizationParams {
  a: string;
  t: string;
  n: string;
  d: string;
  p: number;
  r?: boolean;
  s?: boolean;
}

//checks if the authentication token (stored in a cookie) is valid
export const hasValidToken = async (dotYouClient: DotYouClient): Promise<boolean | null> => {
  const client = dotYouClient.createAxiosClient();

  const response = await client.get('/auth/verifytoken').catch((_error) => {
    return { status: _error?.response?.status || 404 };
  });

  if (response.status === 403 || response.status === 401) return false;
  if (response.status === 200) return true;
  return null;
};

export const getRegistrationParams = async (
  returnUrl: string,
  appName: string,
  appId: string,
  permissionKeys: number[] | undefined,
  circlePermissionKeys: number[] | undefined,
  drives: AppDriveAuthorizationParams[],
  circleDrives: AppDriveAuthorizationParams[] | undefined,
  circles: string[] | undefined,
  eccPublicKey: CryptoKey,
  host?: string,
  clientFriendlyName?: string,
  state?: string
): Promise<YouAuthorizationParams> => {
  const clientFriendly = clientFriendlyName || `${getBrowser()} | ${getOperatingSystem().name}`;

  const permissionRequest: AppAuthorizationParams = {
    n: appName,
    appId: appId,
    fn: clientFriendly,
    p: permissionKeys?.join(','),
    cp: circlePermissionKeys?.join(','),
    d: JSON.stringify(drives),
    cd: circleDrives ? JSON.stringify(circleDrives) : undefined,
    c: circles?.join(','),
    return: 'backend-will-decide',
    o: undefined,
  };

  if (host) permissionRequest.o = host;

  const rawEccKey = await crypto.subtle.exportKey('jwk', eccPublicKey);
  delete rawEccKey.key_ops;
  delete rawEccKey.ext;
  const publicEccKey = uint8ArrayToBase64(stringToUint8Array(JSON.stringify(rawEccKey)));

  return {
    client_id: appId,
    client_type: 'app',
    client_info: clientFriendly,
    public_key: publicEccKey,
    permission_request: JSON.stringify(permissionRequest),
    state: state || '',
    redirect_uri: returnUrl,
  };
};

interface AppAuthorizationExtendParams {
  appId: string;

  p: string | undefined;
  d: string | undefined;

  c: string | undefined;
  cp?: string | undefined;
  cd?: string | undefined;

  return: string;
}

export const getExtendAppRegistrationParams = (
  appId: string,
  drives: AppDriveAuthorizationParams[],
  circleDrives: AppDriveAuthorizationParams[] | undefined,
  permissionKeys: number[] | undefined,
  needsAllConnectedOrCircleIds: boolean | string[] | undefined,
  returnUrl: string
): AppAuthorizationExtendParams => {
  const params: AppAuthorizationExtendParams = {
    appId: appId,
    d: JSON.stringify(drives),
    p: permissionKeys?.join(','),
    c: Array.isArray(needsAllConnectedOrCircleIds)
      ? JSON.stringify(needsAllConnectedOrCircleIds)
      : needsAllConnectedOrCircleIds
        ? ALL_CONNECTIONS_CIRCLE_ID
        : undefined,
    cd: circleDrives ? JSON.stringify(circleDrives) : undefined,
    return: returnUrl,
  };

  return params;
};

export const exchangeDigestForToken = async (
  dotYouClient: DotYouClient,
  base64ExchangedSecretDigest: string
): Promise<{
  base64ClientAuthTokenCipher: string;
  base64ClientAuthTokenIv: string;
  base64SharedSecretCipher: string;
  base64SharedSecretIv: string;
}> => {
  const axiosClient = dotYouClient.createAxiosClient({ overrideEncryption: true });
  const tokenResponse = await axiosClient
    .post(
      '/youauth/token',
      {
        secret_digest: base64ExchangedSecretDigest,
      },
      {
        baseURL: axiosClient.defaults.baseURL?.replace('/api/apps/v1', '/api/owner/v1'),
      }
    )
    .then((response) => response.data);

  return tokenResponse;
};

export const finalizeAuthentication = async (
  identity: string,
  privateKey: CryptoKey,
  publicKey: string,
  salt: string
): Promise<{ clientAuthToken: string; sharedSecret: string }> => {
  const importedRemotePublicKey = await importRemotePublicEccKey(publicKey);

  const exchangedSecret = new Uint8Array(
    await getEccSharedSecret(privateKey, importedRemotePublicKey, salt)
  );

  const exchangedSecretDigest = await crypto.subtle.digest('SHA-256', exchangedSecret);
  const base64ExchangedSecretDigest = uint8ArrayToBase64(new Uint8Array(exchangedSecretDigest));

  const dotYouClient = new DotYouClient({
    api: ApiType.App,
    identity: identity,
  });

  const token = await exchangeDigestForToken(dotYouClient, base64ExchangedSecretDigest);

  const sharedSecretCipher = base64ToUint8Array(token.base64SharedSecretCipher);
  const sharedSecretIv = base64ToUint8Array(token.base64SharedSecretIv);
  const sharedSecret = await cbcDecrypt(sharedSecretCipher, sharedSecretIv, exchangedSecret);

  const clientAuthTokenCipher = base64ToUint8Array(token.base64ClientAuthTokenCipher);
  const clientAuthTokenIv = base64ToUint8Array(token.base64ClientAuthTokenIv);
  const clientAuthToken = await cbcDecrypt(
    clientAuthTokenCipher,
    clientAuthTokenIv,
    exchangedSecret
  );

  return {
    clientAuthToken: uint8ArrayToBase64(clientAuthToken),
    sharedSecret: uint8ArrayToBase64(sharedSecret),
  };
};

export const logout = async (dotYouClient: DotYouClient) => {
  const client = dotYouClient.createAxiosClient();

  await client
    .post('/auth/logout', undefined, {
      validateStatus: () => true,
    })
    .catch((error) => {
      console.error({ error });
      return { status: 400, data: false };
    });
};

export const preAuth = async (dotYouClient: DotYouClient) => {
  const client = dotYouClient.createAxiosClient();

  await client
    .post('/notify/preauth', undefined, {
      validateStatus: () => true,
    })
    .catch((error) => {
      console.error({ error });
      return { status: 400, data: false };
    });
};
