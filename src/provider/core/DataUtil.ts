import { Guid } from 'guid-typescript';
import { AccessControlList } from './DriveData/DriveUploadTypes';
const md5 = require('js-md5');

export class DataUtil {
  static stringToMD5basedGuid(data: string): Guid {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    //const md5 = require('js-md5');
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
  }

  // from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
  static stringToUint8Array(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  static base64ToUint8Array(base64: string): Uint8Array {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
  }

  //https://gist.github.com/QingpingMeng/f51902e2629fc061c6b9fc9bb0f3f57b
  static uint8ArrayToBase64(buffer: Uint8Array) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  ///creates a JSON string from an object; uses base64 for byte arrays
  static JsonStringify64(o: any): string {
    const replacer = (key: string, value: any) => {
      if (Object.prototype.toString.call(value) === '[object Uint8Array]') {
        return DataUtil.uint8ArrayToBase64(value);
      }

      return value;
    };

    return JSON.stringify(o, replacer);
  }

  static byteArrayToString(bytes: Uint8Array) {
    return new TextDecoder().decode(bytes);
  }

  static getNewId() {
    //return DataUtil.toGuidId(nanoid());
    return Guid.create().toString().replace(/-/g, '');
  }

  static stringify = (obj: any) => {
    return Object.keys(obj)
      .map((key) => key + '=' + obj[key])
      .join('&');
  };

  // Creates a base64 encoded byte array of the given input
  static toGuidId(input: string): string {
    return md5(input).toString();
  }

  /// Compares two Guids that are string formatted; It compares the guids after removing all dashes and converting to lowercase
  static stringGuidsEqual(a: string, b: string): boolean {
    return a.toLowerCase().replace(/-/g, '') === b.toLowerCase().replace(/-/g, '');
  }

  /// Compares two ACLs; Compares the requiredSecurityGroup, CircleIds and DotYouIds of those ACLs and will return true or false;
  static aclEqual(a: AccessControlList, b: AccessControlList): boolean {
    if (a.requiredSecurityGroup.toLowerCase() !== b.requiredSecurityGroup.toLowerCase()) {
      return false;
    }

    if (a.circleIdList || b.circleIdList) {
      const missingCircleIdInA = a.circleIdList?.some(
        (aCircle) => !b.circleIdList?.find((bCircle) => DataUtil.stringGuidsEqual(bCircle, aCircle))
      );

      const missingCircleIdInB = b.circleIdList?.some(
        (bCircle) => !a.circleIdList?.find((aCircle) => DataUtil.stringGuidsEqual(aCircle, bCircle))
      );

      if (missingCircleIdInA || missingCircleIdInB) {
        return false;
      }
    }

    if (a.dotYouIdentityList || b.dotYouIdentityList) {
      const missingDotYouIdInA = a.dotYouIdentityList?.some(
        (aIdentity) => !b.dotYouIdentityList?.find((bIdentity) => bIdentity === aIdentity)
      );

      const missingDotYouIdInB = b.dotYouIdentityList?.some(
        (bIdentity) => !a.dotYouIdentityList?.find((aIdentity) => aIdentity === bIdentity)
      );

      if (missingDotYouIdInA || missingDotYouIdInB) {
        return false;
      }
    }

    return true;
  }
}
