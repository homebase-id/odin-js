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

// The intro half: same link key, ITS OWN fixed IV, the exact recipient-name json the blob carries.
const introIv = Uint8Array.from({ length: 16 }, (_, i) => 0x20 + i);
const introJson = '{"recipientName":"Thomas Kragh-Muller","conditions":["recipient_only","no_retention"]}';
const introCipherBase64 =
  '9CSG5VYOrEx7oa/qoHLAIlfFZfLZMLoN888bSsxhTrLCvAL1dEFZSI+noniZZZlr' +
  '+8zpS/KG2/tJzFbXXByyxe7uLW0LZ75E4okYAOeXzrQD0tpyoxGr2W0QjBO79chv';

test('the shared vector decrypts with WebCrypto', async () => {
  const plain = await decryptDropPayload(key, iv, base64ToBytes(cipherBase64));
  assert.equal(new TextDecoder().decode(plain), plaintext);
});

test('the intro blob under its own IV decrypts and parses', async () => {
  const plain = await decryptDropPayload(key, introIv, base64ToBytes(introCipherBase64));
  const text = new TextDecoder().decode(plain);
  assert.equal(text, introJson);
  const parsed = JSON.parse(text);
  assert.equal(parsed.recipientName, 'Thomas Kragh-Muller');
  assert.deepEqual(parsed.conditions, ['recipient_only', 'no_retention']);
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
