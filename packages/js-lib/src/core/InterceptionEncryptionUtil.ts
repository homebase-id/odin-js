import { cbcEncrypt, cbcDecrypt } from '../helpers/AesEncrypt';
import {
  stringToUint8Array,
  uint8ArrayToBase64,
  jsonStringify64,
  base64ToUint8Array,
  byteArrayToString,
} from '../helpers/DataUtil';

export interface SharedSecretEncryptedPayload {
  iv: string;
  data: string;
}

export const getRandomIv = () => crypto.getRandomValues(new Uint8Array(16));

export const encryptData = async (data: string, iv: Uint8Array, ss: Uint8Array) => {
  const bytes = stringToUint8Array(data);

  const encryptedBytes = await cbcEncrypt(bytes, iv, ss);
  const payload: SharedSecretEncryptedPayload = {
    iv: uint8ArrayToBase64(iv),
    data: uint8ArrayToBase64(encryptedBytes),
  };

  return payload;
};

export const buildIvFromQueryString = async (querystring: string) => {
  const searchParams = new URLSearchParams(querystring);

  const uniqueQueryKey =
    searchParams.get('fileId') || (searchParams.has('alias') ? querystring : undefined);

  const hashedQueryKey =
    uniqueQueryKey && typeof crypto.subtle.digest !== 'undefined'
      ? await crypto.subtle.digest('SHA-1', stringToUint8Array(uniqueQueryKey))
      : undefined;

  if (!hashedQueryKey) return undefined;

  const returnBytes = new Uint8Array(hashedQueryKey.slice(0, 16));

  if (returnBytes?.length !== 16) return undefined;

  return returnBytes;
};

export const encryptUrl = async (url: string, ss: Uint8Array) => {
  const parts = (url ?? '').split('?');
  const querystring = parts.length == 2 ? parts[1] : '';
  if (!querystring.length) return url;

  const dedicatedIv = await buildIvFromQueryString(querystring);

  const encryptedPayload: SharedSecretEncryptedPayload = await encryptData(
    querystring,
    dedicatedIv ?? getRandomIv(),
    ss
  );
  const encodedPayload = encodeURIComponent(jsonStringify64(encryptedPayload));

  return parts[0] + '?ss=' + encodedPayload;
};

export const decryptData = async (data: string, iv: string, ss: Uint8Array) => {
  try {
    const ivAsByteArray = base64ToUint8Array(iv);
    const encryptedBytes = base64ToUint8Array(data);

    const bytes = await cbcDecrypt(encryptedBytes, ivAsByteArray, ss);
    const json = byteArrayToString(bytes);

    // Don't parse empty data (it will always fail)
    return json?.length ? JSON.parse(json) : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (ex: any) {
    const isParseError = ex?.message.indexOf('JSON.parse') !== -1;
    if (isParseError) {
      console.error('[DotYouCore-js] bad response from server', ex.message);
    } else {
      console.error('[DotYouCore-js] decrypt response failed', ex);
    }
    return undefined;
  }
};
