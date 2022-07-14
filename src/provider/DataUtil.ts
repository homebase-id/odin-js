export class DataUtil {
  // from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
  static stringToUint8Array(str: string): Uint8Array {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return bufView;
  }

  static base64ToUint8Array(base64: any): Uint8Array {
    let binary_string = window.atob(base64);
    let len = binary_string.length;
    let bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
  }

  //https://gist.github.com/QingpingMeng/f51902e2629fc061c6b9fc9bb0f3f57b
  static uint8ArrayToBase64(buffer: any) {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
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
}
