// The WebDrop cross-implementation vector, ported verbatim from chat-kmp's
// WebDropCryptoVectorTest. The ciphertext was produced by the writer's AesCbc (and confirmed
// against openssl); this test proves the viewer's WebCrypto path decrypts the very same bytes.
// Change the constants only together with the Kotlin side, and only for a versioned contract
// change - a unilateral edit here means links minted by the app stop opening in the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decryptDropPayload, base64ToBytes, base64UrlToBytes } from './_build/crypto.mjs';

const key = Uint8Array.from({ length: 16 }, (_, i) => i);
const iv = Uint8Array.from({ length: 16 }, (_, i) => 0x10 + i);
const plaintext = 'WebDrop cross-implementation vector v1';
const cipherBase64 = '5wEI0MU52bMWHO0F/g8p3tSAu5WAYQniWJKBKP3eg0D6O7S8g098lvh4XuzQ+rSI';

test('the shared vector decrypts with WebCrypto', async () => {
  const plain = await decryptDropPayload(key, iv, base64ToBytes(cipherBase64));
  assert.equal(new TextDecoder().decode(plain), plaintext);
});

test('a tampered ciphertext does not decrypt silently', async () => {
  const cipher = base64ToBytes(cipherBase64);
  cipher[cipher.length - 1] ^= 0x01; // breaks the PKCS7 padding
  await assert.rejects(decryptDropPayload(key, iv, cipher));
});

test('the fragment encoding round-trips the key', () => {
  // 16 bytes -> 22 unpadded base64url chars, as the link builder emits them
  const fragment = btoa(String.fromCharCode(...key))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  assert.equal(fragment.length, 22);
  assert.deepEqual(base64UrlToBytes(fragment), key);
});
