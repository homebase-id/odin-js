import {
  createEccPair,
  getEccSharedSecret,
  importRemotePublicEccKey,
  aesGcmEncryptWithEccSharedSecret,
  exportEccPublicKey,
  pbkdf2HmacSha256,
} from '@homebase-id/js-lib/auth';
import { DotYouClient } from '@homebase-id/js-lib/core';
import {
  getRandom16ByteArray,
  base64ToUint8Array,
  stringToUint8Array,
  uint8ArrayToBase64,
} from '@homebase-id/js-lib/helpers';
import { PublicKeyData } from './AuthenticationProvider';

export interface NonceData {
  crc: number;
  id: string;
  nonce64: string;
  publicJwk: string;
  saltKek64: string;
  saltPassword64: string;
}

interface AuthenticationReplyNonce {
  nonce64: string;
  nonceHashedPassword64: string;
  crc: number;
  gcmEncrypted64: string;
  publicKeyJwk: string;
}

interface AuthenticationPayload {
  hpwd64: string;
  kek64: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secret: any;
}

export const getNonce = async (dotYouClient: DotYouClient): Promise<NonceData> => {
  const client = dotYouClient.createAxiosClient({overrideEncryption: true});
  return client
    .get('/authentication/nonce')
    .then((response) => {
      return response.data;
    })
    .catch(dotYouClient.handleErrorResponse);
};

/** Fresh salts, for setting a password. */
export const getSalts = async (dotYouClient: DotYouClient): Promise<NonceData> => {
  const client = dotYouClient.createAxiosClient({overrideEncryption: true});
  return client.get('/authentication/getsalts').then((response) => {
    return response.data;
  });
};

/** Proof of the password against a fresh nonce, for an endpoint that wants the password itself. */
export const preparePasswordProof = async (dotYouClient: DotYouClient, password: string) =>
  prepareAuthPassword(password, await getNonce(dotYouClient));

export const prepareAuthPassword = async (
  password: string,
  nonceData: NonceData
): Promise<AuthenticationReplyNonce> => {
  const [hashedPassword64, keK64] = await Promise.all([
    pbkdf2Base64(password, nonceData.saltPassword64),
    pbkdf2Base64(password, nonceData.saltKek64),
  ]);

  const hashNoncePassword64 = await pbkdf2Base64(hashedPassword64, nonceData.nonce64);

  const hostBase64PublicJWK = uint8ArrayToBase64(stringToUint8Array(nonceData.publicJwk));
  const hostEccPublicKey = await importRemotePublicEccKey(hostBase64PublicJWK);

  const clientEccKey = await createEccPair();
  const clientprivateKey = clientEccKey.privateKey;

  const exchangedSecret = new Uint8Array(
    await getEccSharedSecret(clientprivateKey, hostEccPublicKey, nonceData.nonce64)
  );

  const payload: AuthenticationPayload = {
    hpwd64: hashedPassword64,
    kek64: keK64,
    secret: uint8ArrayToBase64(getRandom16ByteArray()),
  };
  const encryptable = JSON.stringify(payload);
  const encryptedGcm = await aesGcmEncryptWithEccSharedSecret(
    exchangedSecret,
    base64ToUint8Array(nonceData.nonce64),
    stringToUint8Array(encryptable)
  );

  return {
    nonce64: nonceData.nonce64,
    nonceHashedPassword64: hashNoncePassword64,
    crc: nonceData.crc,
    gcmEncrypted64: uint8ArrayToBase64(encryptedGcm),
    publicKeyJwk: await exportEccPublicKey(clientEccKey.publicKey),
  };
};

export const encryptRecoveryKey = async (
  recoveryKey: string,
  nonceData: AuthenticationReplyNonce,
  publicKey: PublicKeyData
) => {
  const hostEccPublicKey = await importRemotePublicEccKey(publicKey.publicKeyJwkBase64Url);

  const clientEccKey = await createEccPair();
  const clientprivateKey = clientEccKey.privateKey;

  const exchangedSecret = new Uint8Array(
    await getEccSharedSecret(clientprivateKey, hostEccPublicKey, nonceData.nonce64)
  );
  const encrytpedGcm = await aesGcmEncryptWithEccSharedSecret(
    exchangedSecret,
    base64ToUint8Array(nonceData.nonce64),
    stringToUint8Array(recoveryKey)
  );

  return {
    remotePublicKeyJwk: await exportEccPublicKey(clientEccKey.publicKey),
    salt: nonceData.nonce64,
    iv: nonceData.nonce64,
    keyType : "OfflineKey",
    encryptionPublicKeyCrc32: publicKey.crC32c,
    encryptedData: uint8ArrayToBase64(encrytpedGcm),
  };
};

const pbkdf2Base64 = async (password: string, salt64: string): Promise<string> =>
  uint8ArrayToBase64(await pbkdf2HmacSha256(password, base64ToUint8Array(salt64)));
