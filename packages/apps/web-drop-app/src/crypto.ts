/**
 * WebDrop payload decryption - the viewer half of the wire contract.
 *
 * AES-128-CBC with PKCS7 padding, matching the chat-kmp writer's AesCbc exactly: the drop file is
 * unencrypted to the server, each payload is ciphered under the 16-byte key from the URL fragment
 * with a per-payload IV published cleartext in appData.content. WebCrypto's AES-CBC is PKCS7 by
 * default, so decryption is one subtle.decrypt call.
 *
 * The contract is pinned by a shared golden vector: test/crypto-vector.test.mjs here and
 * WebDropCryptoVectorTest in chat-kmp assert the same key/iv/ciphertext constants, so either side
 * drifting fails a test rather than a recipient.
 */

export async function decryptDropPayload(
  key: Uint8Array,
  iv: Uint8Array,
  cipher: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key as BufferSource, 'AES-CBC', false, [
    'decrypt',
  ]);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: iv as BufferSource },
    cryptoKey,
    cipher as BufferSource
  );
  return new Uint8Array(plain);
}

/** The fragment carries the key as unpadded base64url; IVs arrive as standard base64. */
export const base64UrlToBytes = (value: string): Uint8Array =>
  base64ToBytes(value.replace(/-/g, '+').replace(/_/g, '/'));

export const base64ToBytes = (value: string): Uint8Array => {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};
