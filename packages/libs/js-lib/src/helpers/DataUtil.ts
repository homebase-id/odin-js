import { Guid } from 'guid-typescript';

import md5 from './md5/md5';
import {
  AccessControlList,
  EncryptedKeyHeader,
  PayloadDescriptor,
  SecurityGroupType,
  TargetDrive,
} from '../core/DriveData/File/DriveFileTypes';

const OdinBlob: typeof Blob =
  (typeof window !== 'undefined' && 'CustomBlob' in window && (window.CustomBlob as typeof Blob)) ||
  Blob;

export const getRandom16ByteArray = (): Uint8Array => {
  return crypto.getRandomValues(new Uint8Array(16));
};

export const assertIfDefined = (key: string, value: unknown) => {
  if (typeof key !== 'string') throw new Error(`[odin-js]: assertIfDefined key is not a string`);

  if (value === undefined || value === null)
    throw new Error(`[odin-js]: assertIfDefined ${key} undefined`);
};

export const assertIfDefinedAndNotDefault = (key: string, value: unknown) => {
  if (typeof key !== 'string')
    throw new Error(`[odin-js]: assertIfDefinedAndNotDefault key is not a string`);

  assertIfDefined(key, value);
  if (value === '') throw new Error(`[odin-js]: assertIfDefinedAndNotDefault ${key} empty`);
};

// from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
export const stringToUint8Array = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

export const base64ToUint8Array = (base64: string): Uint8Array => {
  if (!base64) return new Uint8Array();
  // base64 could have been urlDecoded, which would have replaced + with space
  const binary_string = atob(base64.replaceAll(' ', '+')); // TODO: Deprecated for Node.js
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
  return btoa(binary); // TODO: Deprecated for Node.js
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

export const formatGuidId = <
  T extends string | undefined,
  R = T extends string ? string : undefined,
>(
  guid: T
): R => {
  if (!guid) return undefined as R;
  const dashLessGuid = guid.replace(/-/g, '');
  return (dashLessGuid.slice(0, 8) +
    '-' +
    dashLessGuid.slice(8, 12) +
    '-' +
    dashLessGuid.slice(12, 16) +
    '-' +
    dashLessGuid.slice(16, 20) +
    '-' +
    dashLessGuid.slice(20)) as R;
};

// Creates a base64 encoded byte array of the given input
export const toGuidId = (input: string): string => {
  return md5(input).toString();
};

export const isAGuidId = (input: string): boolean => {
  if (!input) return false;
  const filteredInput = input.replace(/-/g, '');
  return filteredInput.length === 32 && /^[a-f0-9]+$/i.test(filteredInput);
};

/// Compares two Guids that are string formatted; It compares the guids after removing all dashes and converting to lowercase
export const stringGuidsEqual = (a?: string, b?: string): boolean => {
  if (!a || !b) return false;

  return a.toLowerCase().replace(/-/g, '') === b.toLowerCase().replace(/-/g, '');
};

export const drivesEqual = (a?: TargetDrive, b?: TargetDrive): boolean => {
  if (!a || !b) return false;

  return stringGuidsEqual(a.alias, b.alias) && stringGuidsEqual(a.type, b.type);
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

const getNumberForSecurityGroup = (securityGroup: SecurityGroupType) => {
  switch (securityGroup) {
    case SecurityGroupType.Anonymous:
      return 5;
    case SecurityGroupType.Authenticated:
      return 4;
    case SecurityGroupType.Connected:
      return 3;
    case SecurityGroupType.AutoConnected:
      return 2;
    case SecurityGroupType.Owner:
      return 1;
  }
};

export const compareAcl = (
  a: AccessControlList | undefined,
  b: AccessControlList | undefined
): number => {
  if (!a || !b) return 0;

  if (
    getNumberForSecurityGroup(a.requiredSecurityGroup) <
    getNumberForSecurityGroup(b.requiredSecurityGroup)
  )
    return -1;

  if (
    getNumberForSecurityGroup(a.requiredSecurityGroup) >
    getNumberForSecurityGroup(b.requiredSecurityGroup)
  )
    return 1;

  if (!!a.circleIdList && !b.circleIdList) return -1;
  if (!!b.circleIdList && !a.circleIdList) return 1;

  if (a.circleIdList && b.circleIdList) {
    if (a.circleIdList.length < b.circleIdList.length) return -1;
    if (a.circleIdList.length > b.circleIdList.length) return 1;
  }

  if (!!a.odinIdList && !b.odinIdList) return -1;
  if (!!b.odinIdList && !a.odinIdList) return 1;
  if (a.odinIdList && b.odinIdList) {
    if (a.odinIdList.length < b.odinIdList.length) return -1;
    if (a.odinIdList.length > b.odinIdList.length) return 1;
  }

  return 0;
};

export const splitSharedSecretEncryptedKeyHeader = (
  sharedsecretencryptedheader64: string
): EncryptedKeyHeader => {
  const byteArray = base64ToUint8Array(sharedsecretencryptedheader64);

  if (byteArray.length !== 68)
    throw new Error("shared secret encrypted keyheader has an unexpected length, can't split");

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stringify = (obj: Record<string, any> | unknown) => {
  if (!obj || !hasIndexSignature(obj)) return '';
  return Object.keys(obj)
    .map((key) => key + '=' + encodeURIComponent(obj[key] + ''))
    .join('&');
};

const hasIndexSignature = (
  o: unknown | { [index: string]: unknown }
): o is { [index: string]: unknown } => {
  return typeof o === 'object';
};

export const stringifyToQueryParams = (obj: Record<string, unknown> | unknown) => {
  if (!obj || typeof obj !== 'object' || !hasIndexSignature(obj)) return '';

  const params: string[] = [];
  const paramsObj = { ...obj };

  const keys = Object.keys(obj);
  keys.forEach((key) => {
    if (obj[key] === null || obj[key] === undefined) {
      delete paramsObj[key];
    } else if (Array.isArray(obj[key])) {
      const arr = obj[key] as unknown[];
      arr.forEach((element: unknown) => {
        params.push(`${key}=${encodeURIComponent(element + '')}`);
      });

      delete paramsObj[key];
    } else if (hasIndexSignature(obj[key])) {
      const subObj = obj[key];
      params.push(stringify(subObj));
      delete paramsObj[key];
    }
  });

  return [stringify(paramsObj), ...(params?.length ? [params.join('&')] : [])].join('&');
};

export const stringifyArrayToQueryParams = (arr: Record<string, unknown>[]) => {
  // Update object keys to include array index (and flatten sub objects) eg. { a: { b: 1 }, c: 2 } => { '[0].b': 1, '[1].c': 2 }
  arr.forEach((obj, index) => {
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        const subObj = obj[key] as Record<string, unknown>;
        Object.keys(subObj).forEach((subKey) => {
          obj[`[${index}].${subKey}`] = subObj[subKey];
        });
        delete obj[key];
        return;
      }

      obj[`[${index}].${key}`] = obj[key];
      delete obj[key];
    });
  });

  return arr.map((obj) => stringifyToQueryParams(obj)).join('&');
};

// const convertTimeToGuid = (time: number) => {
//   //Convert time number to guid string

//   // One year is 3600*24*365.25*1000 = 31,557,600,000 milliseconds (35 bits)
//   // Use 9 bits for the years, for a total of 44 bits (5½ bytes)
//   // Thus able to hold 557 years since 1970-01-01
//   // The counter is 12 bits, for a total of 4096, which gets us to ~1/4ns per guid before clash / wait()
//   // Total bit usage of millisecond time+counter is thus 44+12=56 bits aka 7 bytes

//   // Create 56 bits (7 bytes) {milliseconds (44 bits), _counter(12 bits)}
//   // The counter is naught, since we're constructing this from the UNIX timestamp
//   //
//   const millisecondsCtr = (BigInt(time) << BigInt(12)) | BigInt(0);

//   // I wonder if there is a neat way to not have to both create this and the GUID.
//   const byte16 = new Uint8Array(16);
//   byte16.fill(0);
//   byte16[0] = Number((millisecondsCtr >> BigInt(48)) & BigInt(0xff));
//   byte16[1] = Number((millisecondsCtr >> BigInt(40)) & BigInt(0xff));
//   byte16[2] = Number((millisecondsCtr >> BigInt(32)) & BigInt(0xff));
//   byte16[3] = Number((millisecondsCtr >> BigInt(24)) & BigInt(0xff));
//   byte16[4] = Number((millisecondsCtr >> BigInt(16)) & BigInt(0xff));
//   byte16[5] = Number((millisecondsCtr >> BigInt(8)) & BigInt(0xff));
//   byte16[6] = Number((millisecondsCtr >> BigInt(0)) & BigInt(0xff));

//   return byte16;
// };

// const int64ToBytes = (value: number) => {
//   const byte8 = new Uint8Array(8);
//   const bigValue = BigInt(value);

//   byte8[0] = Number((bigValue >> BigInt(56)) & BigInt(0xff));
//   byte8[1] = Number((bigValue >> BigInt(48)) & BigInt(0xff));
//   byte8[2] = Number((bigValue >> BigInt(40)) & BigInt(0xff));
//   byte8[3] = Number((bigValue >> BigInt(32)) & BigInt(0xff));
//   byte8[4] = Number((bigValue >> BigInt(24)) & BigInt(0xff));
//   byte8[5] = Number((bigValue >> BigInt(16)) & BigInt(0xff));
//   byte8[6] = Number((bigValue >> BigInt(8)) & BigInt(0xff));
//   byte8[7] = Number(bigValue & BigInt(0xff));

//   return byte8;
// };

export const getQueryBatchCursorFromTime = (fromUnixTimeInMs: number, toUnixTimeInMs?: number) => {
  // let bytes = mergeByteArrays([
  //   convertTimeToGuid(fromUnixTimeInMs),
  //   toUnixTimeInMs ? convertTimeToGuid(toUnixTimeInMs) : new Uint8Array(new Array(16)),
  //   new Uint8Array(new Array(16)),
  // ]);

  // const nullBytes = mergeByteArrays([
  //   new Uint8Array([1]),
  //   toUnixTimeInMs ? new Uint8Array([1]) : new Uint8Array([0]),
  //   new Uint8Array([0]),
  // ]);

  // const bytes2 = mergeByteArrays([
  //   int64ToBytes(fromUnixTimeInMs),
  //   toUnixTimeInMs ? int64ToBytes(toUnixTimeInMs) : new Uint8Array(new Array(8)),
  //   new Uint8Array(new Array(8)),
  // ]);

  // bytes = mergeByteArrays([bytes, nullBytes, bytes2]);
  // // return string

  // return uint8ArrayToBase64(bytes);
  if (toUnixTimeInMs) {
    // stop should be null
    return JSON.stringify({ "paging": { "time": fromUnixTimeInMs, "row": null }, "stop": { "time": toUnixTimeInMs, "row": null }, "next": null });
  }
  else {
    return JSON.stringify({ "paging": { "time": fromUnixTimeInMs, "row": null }, "stop": null, "next": null })
  }
};

export const getQueryModifiedCursorFromTime = (unixTimeInMs: number) => {
  // Example top 48 bits and bottom 16 bits as BigInts
  // const topBits = BigInt(unixTimeInMs); // Replace with your top 48 bits
  // const bottomBits = BigInt(4); // Replace with your bottom 16 bits

  // // Combine the top and bottom bits using bitwise left shift and bitwise OR operation
  // return Number((topBits << BigInt(16)) | bottomBits);
  return JSON.stringify({
    "time": unixTimeInMs,
    "row": null
  })
};

const sanitizeJson = (str: string): string => {
  const replaceAll = (str: string, find: string, replace: string) => {
    return str.replace(new RegExp(find, 'g'), replace);
  };

  // Remove BOM if present
  str = str.replace(/^\uFEFF/, '');

  // Remove illegal control characters
  // eslint-disable-next-line no-control-regex
  str = str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  // Replace single quotes with double quotes (naively, may need refinement)
  str = str.replace(/'/g, '"');

  // Remove or fix improper backslashes
  str = replaceAll(str, '\\', '\\\\');

  // Remove trailing commas
  str = str.replace(/,(\s*[}\]])/g, '$1');

  return str;
};

export const tryJsonParse = <T>(json: string, onError?: (ex: unknown) => void): T => {
  try {
    if (typeof json === 'object') return json as T;
    if (!json || !json.length) return {} as T;
    const o = JSON.parse(json);
    return o;
  } catch {
    console.warn('base JSON.parse failed', json);

    try {
      // Sanitize and reattempt parsing
      const sanitizedJson = sanitizeJson(json);
      const o = JSON.parse(sanitizedJson);

      console.warn('... but we fixed it');
      return o;
    } catch (ex) {
      console.error('Parsing still failed after sanitization', ex);
      onError && onError(ex);
      return {} as T;
    }
  }
};

export const getDataUriFromBlob = async (blob: Blob) => {
  if (!blob) return '';

  return `data:${blob.type};base64,${uint8ArrayToBase64(new Uint8Array(await blob.arrayBuffer()))}`;
};

export const getBlobFromBytes = ({
  bytes,
  contentType,
}: {
  bytes: Uint8Array;
  contentType: string;
}) => {
  return new OdinBlob([bytes], { type: contentType });
};

export const getLargestThumbOfPayload = (payload?: PayloadDescriptor) => {
  if (!payload?.thumbnails?.length) return;
  return payload.thumbnails?.reduce((prev, curr) => {
    return prev.pixelHeight * prev.pixelWidth > curr.pixelHeight * curr.pixelWidth ? prev : curr;
  }, payload?.thumbnails?.[0]);
};

export const hashGuidId = async (input: string, salt?: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt ? `${salt}:${input}` : input);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return [
    hashHex.slice(0, 8),
    hashHex.slice(8, 12),
    '4' + hashHex.slice(13, 16),
    ((parseInt(hashHex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hashHex.slice(18, 20),
    hashHex.slice(20, 32),
  ].join('-');
}
