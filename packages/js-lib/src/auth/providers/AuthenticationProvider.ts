import { ApiType, DotYouClient } from '../../core/DotYouClient';
import { isLocalStorageAvailable } from '../../helpers/BrowserUtil';
import { base64ToUint8Array, uint8ArrayToBase64 } from '../../helpers/DataUtil';
import { getBrowser, getOperatingSystem } from '../helpers/browserInfo';
import { retrieveIdentity, saveIdentity } from './IdentityProvider';
import { decryptWithKey } from './KeyProvider';

export const APP_SHARED_SECRET = 'APSS';
export const APP_AUTH_TOKEN = 'BX0900';

const getSharedSecret = () => {
  if (!isLocalStorageAvailable()) return;
  const raw = localStorage.getItem(APP_SHARED_SECRET);
  if (raw) return base64ToUint8Array(raw);
};

const getAppAuthToken = () => isLocalStorageAvailable() && localStorage.getItem(APP_AUTH_TOKEN);

//checks if the authentication token (stored in a cookie) is valid
export const hasValidToken = async (dotYouClient: DotYouClient): Promise<boolean> => {
  const client = dotYouClient.createAxiosClient();

  const response = await client
    .get('/auth/verifytoken', {
      validateStatus: () => true,
    })
    .catch((error) => {
      console.error({ error });
      return { status: 400, data: false };
    });
  return response.status === 200 && response.data === true;
};

export const getRegistrationParams = async (
  returnUrl: string,
  appName: string,
  appId: string,
  drives: { a: string; t: string; n: string; d: string; p: number }[],
  publicKey: CryptoKey,
  host?: string,
  clientFriendlyName?: string
) => {
  const rawPk = await crypto.subtle.exportKey('spki', publicKey);
  const pk = uint8ArrayToBase64(new Uint8Array(rawPk));

  const clientFriendly = clientFriendlyName || `${getBrowser()} | ${getOperatingSystem()}`;

  const paramsArray = [
    `n=${appName}`,
    `appId=${appId}`,
    `fn=${encodeURIComponent(clientFriendly)}`,
    `d=${encodeURIComponent(JSON.stringify(drives))}`,
    `pk=${encodeURIComponent(pk)}`,
    `return=${encodeURIComponent(`${returnUrl}&`)}`, // TODO: need a better way for this => // Needs to have trailing '&' to have a proper query string; As the returnUrl already contains the start of the query string
  ];

  if (host) paramsArray.push(`o=${host}`);
  return paramsArray.join('&');
};

const splitDataString = (byteArray: Uint8Array) => {
  if (byteArray.length !== 49) {
    throw new Error("shared secret encrypted keyheader has an unexpected length, can't split");
  }

  const authToken = byteArray.slice(0, 33);
  const sharedSecret = byteArray.slice(33);

  return { authToken, sharedSecret };
};

export const finalizeAuthentication = async (
  registrationData: string,
  v: string,
  identity: string | null,
  privateKey: CryptoKey
): Promise<{ authToken: Uint8Array; sharedSecret: Uint8Array }> => {
  if (v !== '1') {
    throw new Error('Failed to decrypt data, version unsupported');
  }

  if (identity) saveIdentity(identity);

  const decryptedData = await decryptWithKey(registrationData, privateKey);
  if (!decryptedData) throw new Error('Failed to decrypt data');

  const { authToken, sharedSecret } = splitDataString(decryptedData);

  // Store authToken and sharedSecret
  if (isLocalStorageAvailable()) {
    localStorage.setItem(APP_SHARED_SECRET, uint8ArrayToBase64(sharedSecret));
    localStorage.setItem(APP_AUTH_TOKEN, uint8ArrayToBase64(authToken));
  }

  return { authToken, sharedSecret };
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

  if (isLocalStorageAvailable()) {
    localStorage.removeItem(APP_SHARED_SECRET);
    localStorage.removeItem(APP_AUTH_TOKEN);
  }
};

export const preAuth = async () => {
  const dotYouClient = new DotYouClient({
    api: ApiType.App,
    identity: retrieveIdentity(),
    sharedSecret: getSharedSecret(),
  });
  const client = dotYouClient.createAxiosClient();

  await client
    .post('/notify/preauth', undefined, {
      validateStatus: () => true,
      headers: {
        BX0900: getAppAuthToken(),
      },
    })
    .catch((error) => {
      console.error({ error });
      return { status: 400, data: false };
    });
};
