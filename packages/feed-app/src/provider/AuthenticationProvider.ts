import {
  ApiType,
  base64ToUint8Array,
  DotYouClient,
  uint8ArrayToBase64,
} from '@youfoundation/js-lib';
import { getBrowser, getOperatingSystem } from '../helpers/browserInfo';
import { retrieveIdentity, saveIdentity } from './IdentityProvider';
import { decryptWithKey, newPair, throwAwayTheKey } from './KeyProvider';

export const APP_SHARED_SECRET = 'APSS';
export const APP_AUTH_TOKEN = 'BX0900';

const getSharedSecret = () => {
  const raw = window.localStorage.getItem(APP_SHARED_SECRET);
  if (raw) {
    return base64ToUint8Array(raw);
  }
};

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
        BX0900: localStorage.getItem(APP_AUTH_TOKEN),
      },
    })
    .catch((error) => {
      console.error({ error });
      return { status: 400, data: false };
    });
  return response.status === 200 && response.data === true;
};

const drivesParam = encodeURIComponent(
  JSON.stringify([
    {
      a: '6483b7b1f71bd43eb6896c86148668cc',
      t: '2af68fe72fb84896f39f97c59d60813a',
      n: 'Photo Library',
      d: 'Place for your memories',
      p: 3,
    },
  ])
);

export const getRegistrationParams = async (returnUrl: string) => {
  const pk = await newPair();

  const finalizeUrl = `${window.location.origin}/auth/finalize?returnUrl=${encodeURIComponent(
    returnUrl
  )}&`;
  const appName = 'Odin - Photos';
  const appId = '32f0bdbf-017f-4fc0-8004-2d4631182d1e';
  const clientFriendly = `${getBrowser()} | ${getOperatingSystem()}`;
  return `n=${appName}&o=${window.location.host}&appId=${appId}&fn=${encodeURIComponent(
    clientFriendly
  )}&return=${encodeURIComponent(finalizeUrl)}&d=${drivesParam}&pk=${encodeURIComponent(pk)}`;
};

export const authenticate = async (identity: string, returnUrl: string): Promise<void> => {
  saveIdentity(identity);
  const redirectUrl = `https://${identity}/owner/appreg?${await getRegistrationParams(returnUrl)}`;
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

  if (identity) {
    saveIdentity(identity);
  }

  const decryptedData = await decryptWithKey(registrationData);
  if (!decryptedData) {
    throw new Error('Failed to decrypt data');
  }
  const { authToken, sharedSecret } = splitDataString(decryptedData);

  // Store authToken and sharedSecret
  window.localStorage.setItem(APP_SHARED_SECRET, uint8ArrayToBase64(sharedSecret));
  window.localStorage.setItem(APP_AUTH_TOKEN, uint8ArrayToBase64(authToken));

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
        BX0900: localStorage.getItem(APP_AUTH_TOKEN),
      },
    })
    .catch((error) => {
      console.error({ error });
      return { status: 400, data: false };
    });

  window.localStorage.removeItem(APP_SHARED_SECRET);
  window.localStorage.removeItem(APP_AUTH_TOKEN);
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
        BX0900: localStorage.getItem(APP_AUTH_TOKEN),
      },
    })
    .catch((error) => {
      console.error({ error });
      return { status: 400, data: false };
    });
};
