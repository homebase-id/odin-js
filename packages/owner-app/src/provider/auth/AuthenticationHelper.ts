export interface NonceData {
  saltPassword64: string;
  saltKek64: string;
  nonce64: string;
  publicPem: string;
  crc: number;
}
export const prepareAuthPassword = async (
  password: string,
  nonceData: NonceData,
  firstRunToken?: string
): Promise<AuthenticationReplyNonce> => {
  const interations = 100000;
  const len = 16;

  const hashedPassword64 = await wrapPbkdf2HmacSha256(
    password,
    nonceData.saltPassword64,
    interations,
    len
  );
  const hashNoncePassword64 = await wrapPbkdf2HmacSha256(
    hashedPassword64,
    nonceData.nonce64,
    interations,
    len
  );
  const hashedKek64 = await wrapPbkdf2HmacSha256(password, nonceData.saltKek64, interations, len);

  const base64Key = rsaPemStrip(nonceData.publicPem);
  const key = await rsaImportKey(base64Key);

  const secret = crypto.getRandomValues(new Uint8Array(16));
  const secret64 = btoa(String.fromCharCode.apply(null, Array.from(secret)));

  const payload: AuthenticationPayload = {
    hpwd64: hashedPassword64,
    kek64: hashedKek64,
    secret: secret64,
  };

  const encryptable = JSON.stringify(payload);
  const cipher = await rsaOaepEncrypt(key, encryptable);

  const cipher64 = btoa(String.fromCharCode.apply(null, Array.from(cipher)));
  return {
    nonce64: nonceData.nonce64,
    nonceHashedPassword64: hashNoncePassword64,
    crc: nonceData.crc,
    rsaEncrypted: cipher64,
    firstRunToken: firstRunToken || null,
  };
};

// ================== PBKDF ==================
/**
 * @param {string} strPassword The clear text password
 * @param {Uint8Array} salt    The salt
 * @param {string} hash        The Hash model, e.g. ["SHA-256" | "SHA-512"]
 * @param {int} iterations     Number of iterations
 * @param {int} len            The output length in bytes, e.g. 16
 */
const pbkdf2 = async (
  strPassword: string,
  salt: Uint8Array,
  hash: string,
  iterations: number,
  len: number
): Promise<Uint8Array> => {
  const password = new TextEncoder().encode(strPassword);

  const ik = await crypto.subtle.importKey('raw', password, { name: 'PBKDF2' }, false, [
    'deriveBits',
  ]);
  const dk = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: hash,
      salt: salt,
      iterations: iterations,
    },
    ik,
    len * 8
  ); // Bytes to bits

  return new Uint8Array(dk);
};

const wrapPbkdf2HmacSha256 = async (
  password: string,
  saltArray64: string,
  iterations: number,
  len: number
): Promise<string> => {
  const u8salt = Uint8Array.from(atob(saltArray64), (c) => c.charCodeAt(0));

  return pbkdf2(password, u8salt, 'SHA-256', iterations, len).then((hashed) => {
    const base64 = window.btoa(String.fromCharCode.apply(null, Array.from(hashed)));
    return base64;
  });
};

const rsaPemStrip = (pem: string) => {
  let s = pem.replace('-----BEGIN PUBLIC KEY-----', '');
  s = s.replace('-----END PUBLIC KEY-----', '');

  return s.replace('\n', '');
};

// from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
const str2ab = (str: string): ArrayBuffer => {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);

  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }

  return buf;
};

// key is base64 encoded
const rsaImportKey = async (key64: string): Promise<CryptoKey> => {
  // base64 decode the string to get the binary data
  const binaryDerString = window.atob(key64);
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString);

  return crypto.subtle.importKey(
    'spki',
    binaryDer,
    {
      name: 'RSA-OAEP',
      //modulusLength: 256,
      hash: { name: 'SHA-256' },
    },
    false,
    ['encrypt'] //must be ["encrypt", "decrypt"] or ["wrapKey", "unwrapKey"]
  );

  // console.log("Imported key = ", key);
  // return key;
};

const rsaOaepEncrypt = async (publicKey: CryptoKey, str: string) => {
  return crypto.subtle
    .encrypt(
      {
        name: 'RSA-OAEP',
        //label: Uint8Array([...]) //optional
      },
      publicKey, //from generateKey or importKey above
      str2ab(str) //ArrayBuffer of data you want to encrypt
    )
    .then((encrypted) => {
      // console.log("RSA Encrypted = ", encrypted);
      return new Uint8Array(encrypted);
    });
};

interface AuthenticationReplyNonce {
  nonce64: string;
  nonceHashedPassword64: string;
  crc: number;
  rsaEncrypted: string;
  firstRunToken: string | null;
}

interface AuthenticationPayload {
  hpwd64: string;
  kek64: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secret: any;
}
