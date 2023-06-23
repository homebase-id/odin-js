import { ApiType, DotYouClient } from '../../core/DotYouClient';
import { base64ToUint8Array, uint8ArrayToBase64 } from '../../helpers/DataUtil';
import { getBrowser, getOperatingSystem } from '../helpers/browserInfo';
import { retrieveIdentity, saveIdentity } from './IdentityProvider';
import { decryptWithKey, newPair, throwAwayTheKey } from './KeyProvider';

export const APP_SHARED_SECRET = 'APSS';
export const APP_AUTH_TOKEN = 'BX0900';

const getSharedSecret = () => {
  if (typeof window === 'undefined') return;
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  if (raw) return base64ToUint8Array(raw);
};

const getAppAuthToken = () =>
  typeof window !== 'undefined' && window.localStorage.getItem(APP_AUTH_TOKEN);

//checks if the authentication token (stored in a cookie) is valid
export const hasValidToken = async (): Promise<boolean> => {
  const dotYouClient = new DotYouClient({
    api: ApiType.App,
    identity: retrieveIdentity(),
    sharedSecret: getSharedSecret(),
  });
  const client = dotYouClient.createAxiosClient();

  const response = await client
    .get('/auth/verifytoken', {
      validateStatus: () => true,
      headers: {
        BX0900: getAppAuthToken(),
      },
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
  drives: { a: string; t: string; n: string; d: string; p: number }[]
) => {
  const pk = await newPair();

  const drivesParam = encodeURIComponent(JSON.stringify(drives));
  const finalizeUrl = `${window.location.origin}/auth/finalize?returnUrl=${encodeURIComponent(
    returnUrl
  )}&`;
  const clientFriendly = `${getBrowser()} | ${getOperatingSystem()}`;
  return `n=${appName}&o=${window.location.host}&appId=${appId}&fn=${encodeURIComponent(
    clientFriendly
  )}&return=${encodeURIComponent(finalizeUrl)}&d=${drivesParam}&pk=${encodeURIComponent(pk)}`;
};

export const authenticate = async (
  identity: string,
  returnUrl: string,
  appName: string,
  appId: string,
  drives: { a: string; t: string; n: string; d: string; p: number }[]
): Promise<void> => {
  saveIdentity(identity);
  const redirectUrl = `https://${identity}/owner/appreg?${await getRegistrationParams(
    returnUrl,
    appName,
    appId,
    drives
  )}`;
  window.location.href = redirectUrl;
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
  identity: string | null
): Promise<void> => {
  if (v !== '1') {
    throw new Error('Failed to decrypt data, version unsupported');
  }

  if (identity) saveIdentity(identity);

  const decryptedData = await decryptWithKey(registrationData);
  if (!decryptedData) throw new Error('Failed to decrypt data');

  const { authToken, sharedSecret } = splitDataString(decryptedData);

  // Store authToken and sharedSecret
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(APP_SHARED_SECRET, uint8ArrayToBase64(sharedSecret));
    window.localStorage.setItem(APP_AUTH_TOKEN, uint8ArrayToBase64(authToken));
  }

  // Remove key
  throwAwayTheKey();
};

export const logout = async () => {
  const dotYouClient = new DotYouClient({
    api: ApiType.App,
    identity: retrieveIdentity(),
    sharedSecret: getSharedSecret(),
  });
  const client = dotYouClient.createAxiosClient();

  await client
    .post('/auth/logout', undefined, {
      validateStatus: () => true,
      headers: {
        BX0900: getAppAuthToken(),
      },
    })
    .catch((error) => {
      console.error({ error });
      return { status: 400, data: false };
    });

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(APP_SHARED_SECRET);
    window.localStorage.removeItem(APP_AUTH_TOKEN);
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
