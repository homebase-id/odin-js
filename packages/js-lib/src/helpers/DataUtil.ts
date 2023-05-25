import { Guid } from 'guid-typescript';

import md5 from './md5/md5';
import { AccessControlList, EncryptedKeyHeader } from '../core/core';

export const assertIfDefined = (key: string, value: unknown) => {
  if (!value) throw new Error(`${key} undefined`);
};

export const stringToMD5basedGuid = (data: string): Guid => {
  const t = md5(data).toString();
  return Guid.parse(
    t.substring(0, 8) +
      '-' +
      t.substring(8, 12) +
      '-' +
      t.substring(12, 16) +
      '-' +
      t.substring(16, 20) +
      '-' +
      t.substring(20, 32)
  );
};

// from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
export const stringToUint8Array = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};

//https://gist.github.com/QingpingMeng/f51902e2629fc061c6b9fc9bb0f3f57b
export const uint8ArrayToBase64 = (buffer: Uint8Array) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

///creates a JSON string from an object; uses base64 for byte arrays
export const jsonStringify64 = (o: unknown): string => {
  const replacer = (key: string, value: unknown) => {
    if (Object.prototype.toString.call(value) === '[object Uint8Array]') {
      return uint8ArrayToBase64(value as Uint8Array);
    }

    return value;
  };

  return JSON.stringify(o, replacer);
};

export const byteArrayToString = (bytes: Uint8Array) => {
  return new TextDecoder().decode(bytes);
};

export const byteArrayToNumber = (byteArray: Uint8Array) => {
  let value = 0;
  for (let i = byteArray.length - 1; i >= 0; i--) {
    value = value * 256 + byteArray[i];
  }

  return value;
};

export const getNewId = () => {
  //return toGuidId(nanoid());
  return Guid.create().toString().replace(/-/g, '');
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stringify = (obj: any) => {
  return Object.keys(obj)
    .map((key) => key + '=' + obj[key])
    .join('&');
};

// Creates a base64 encoded byte array of the given input
export const toGuidId = (input: string): string => {
  return md5(input).toString();
};

/// Compares two Guids that are string formatted; It compares the guids after removing all dashes and converting to lowercase
export const stringGuidsEqual = (a: string, b: string): boolean => {
  return a.toLowerCase().replace(/-/g, '') === b.toLowerCase().replace(/-/g, '');
};

/// Compares two ACLs; Compares the requiredSecurityGroup, CircleIds and OdinIds of those ACLs and will return true or false;
export const aclEqual = (a: AccessControlList, b: AccessControlList): boolean => {
  if (a.requiredSecurityGroup.toLowerCase() !== b.requiredSecurityGroup.toLowerCase()) {
    return false;
  }

  if (a.circleIdList || b.circleIdList) {
    const missingCircleIdInA = a.circleIdList?.some(
      (aCircle) => !b.circleIdList?.find((bCircle) => stringGuidsEqual(bCircle, aCircle))
    );

    const missingCircleIdInB = b.circleIdList?.some(
      (bCircle) => !a.circleIdList?.find((aCircle) => stringGuidsEqual(aCircle, bCircle))
    );

    if (missingCircleIdInA || missingCircleIdInB) {
      return false;
    }
  }

  if (a.odinIdList || b.odinIdList) {
    const missingOdinIdInA = a.odinIdList?.some(
      (aIdentity) => !b.odinIdList?.find((bIdentity) => bIdentity === aIdentity)
    );

    const missingOdinIdInB = b.odinIdList?.some(
      (bIdentity) => !a.odinIdList?.find((aIdentity) => aIdentity === bIdentity)
    );

    if (missingOdinIdInA || missingOdinIdInB) {
      return false;
    }
  }

  return true;
};

export const splitSharedSecretEncryptedKeyHeader = (
  sharedsecretencryptedheader64: string
): EncryptedKeyHeader => {
  const byteArray = base64ToUint8Array(sharedsecretencryptedheader64);

  if (byteArray.length !== 68) {
    throw new Error("shared secret encrypted keyheader has an unexpected length, can't split");
  }

  const iv = byteArray.slice(0, 16);
  const encryptedAesKey = byteArray.slice(16, 64);
  const version = byteArray.slice(64);

  const parsedVersion = byteArrayToNumber(version);

  return { encryptedAesKey, encryptionVersion: parsedVersion, iv, type: 11 };
};

// https://stackoverflow.com/a/49129872/9014097
export const mergeByteArrays = (chunks: Uint8Array[]) => {
  let size = 0;
  chunks.forEach((item) => {
    size += item.length;
  });
  const mergedArray = new Uint8Array(size);
  let offset = 0;
  chunks.forEach((item) => {
    mergedArray.set(item, offset);
    offset += item.length;
  });
  return mergedArray;
};

export const roundToSmallerMultipleOf16 = (x: number) => {
  return Math.floor(x / 16) * 16;
};

export const roundToLargerMultipleOf16 = (x: number) => {
  return Math.ceil(x / 16) * 16;
};
