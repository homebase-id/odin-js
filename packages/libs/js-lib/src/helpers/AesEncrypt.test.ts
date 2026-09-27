import { expect, test } from 'vitest';
import { gcmDecrypt } from './AesEncrypt';
import { base64ToUint8Array, byteArrayToString } from './DataUtil';

// Produced by odin-core's AesGcm.Encrypt(plain, key, iv): 16-byte key, 16-byte IV whose first 12
// bytes are the nonce, and the 16-byte tag appended to the ciphertext. It is the layout the YouAuth
// token response and the home-site sign-in result use when sealed with `aes-gcm`.
const KEY = base64ToUint8Array('AQIDBAUGBwgJCgsMDQ4PEA==');
const IV = base64ToUint8Array('oKGio6SlpqeoqaqrrK2urw==');
const CIPHER = base64ToUint8Array(
  'eSH+wgPDdf9DAuxT0Va26ZAeiDUG2FbAy7y5NNKb9cYSjSNtVaVZ8Bt0xQ+4OcspaNt+oIRajgWAfAMQwOZ7PlSx1F6xa6XNrcCYNOn5a72vJWi7zWOhAG9s4Rmi+9Qhmw=='
);
const PLAIN = '{"identity":"sam.dotyou.cloud","ss64":"AAECAwQFBgcICQoLDA0ODw==","returnUrl":"/"}';

test('gcmDecrypt opens what the identity server sealed with aes-gcm', async () => {
  const plain = await gcmDecrypt(CIPHER, IV, KEY);
  expect(byteArrayToString(plain)).toBe(PLAIN);
});

test('gcmDecrypt refuses a changed byte instead of yielding garbage', async () => {
  const tampered = new Uint8Array(CIPHER);
  tampered[3] ^= 0x01;
  await expect(gcmDecrypt(tampered, IV, KEY)).rejects.toThrow();
});

test('gcmDecrypt refuses the wrong key', async () => {
  const wrongKey = new Uint8Array(KEY);
  wrongKey[0] ^= 0x01;
  await expect(gcmDecrypt(CIPHER, IV, wrongKey)).rejects.toThrow();
});
