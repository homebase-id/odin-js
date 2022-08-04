import { Guid } from 'guid-typescript';

export class DataUtil {
  static stringToMD5basedGuid(data: string): Guid {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const md5 = require('js-md5');
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
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return bufView;
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
    return String.fromCharCode(...Array.from(bytes));
  }

  static getNewGuid() {
    return Guid.create().toString();
  }

  static stringify = (obj: any) => {
    return Object.keys(obj)
      .map((key) => key + '=' + obj[key])
      .join('&');
  };
}
