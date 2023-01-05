import { AesEncrypt } from './AesEncrypt';
import { DataUtil } from './DataUtil';

export interface SharedSecretEncryptedPayload {
  iv: string;
  data: string;
}

export const getRandomIv = () => window.crypto.getRandomValues(new Uint8Array(16));

export const encryptData = async (data: string, iv: Uint8Array, ss: Uint8Array) => {
  const bytes = DataUtil.stringToUint8Array(data);

  const encryptedBytes = await AesEncrypt.CbcEncrypt(bytes, iv, ss);
  const payload: SharedSecretEncryptedPayload = {
    iv: DataUtil.uint8ArrayToBase64(iv),
    data: DataUtil.uint8ArrayToBase64(encryptedBytes),
  };

  return payload;
};

export const getIvFromQueryString = async (querystring: string) => {
  const fileId = new URLSearchParams(querystring).get('fileId');
  const hashedFileId = fileId
    ? await crypto.subtle.digest('SHA-1', DataUtil.stringToUint8Array(fileId))
    : undefined;

  if (!hashedFileId) {
    return undefined;
  }

  const returnBytes = new Uint8Array(hashedFileId.slice(0, 16));

  if (returnBytes?.length !== 16) {
    return undefined;
  }

  return returnBytes;
};

export const encryptUrl = async (url: string, ss: Uint8Array) => {
  const parts = (url ?? '').split('?');
  const querystring = parts.length == 2 ? parts[1] : '';

  const dedicatedIv = await getIvFromQueryString(querystring);

  const encryptedPayload: SharedSecretEncryptedPayload = await encryptData(
    querystring,
    dedicatedIv ?? getRandomIv(),
    ss
  );
  const encodedPayload = encodeURIComponent(DataUtil.JsonStringify64(encryptedPayload));

  return parts[0] + '?ss=' + encodedPayload;
};

export const decryptData = async (data: string, iv: string, ss: Uint8Array) => {
  try {
    const ivAsByteArray = DataUtil.base64ToUint8Array(iv);
    const encryptedBytes = DataUtil.base64ToUint8Array(data);

    const bytes = await AesEncrypt.CbcDecrypt(encryptedBytes, ivAsByteArray, ss);
    const json = DataUtil.byteArrayToString(bytes);

    return JSON.parse(json);
  } catch (ex) {
    console.log('decrypt response failed', ex);
    return undefined;
  }
};
