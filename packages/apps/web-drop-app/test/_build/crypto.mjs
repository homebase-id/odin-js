async function decryptDropPayload(key, iv, cipher) {
  const cryptoKey = await crypto.subtle.importKey("raw", key, "AES-CBC", false, [
    "decrypt"
  ]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    cryptoKey,
    cipher
  );
  return new Uint8Array(plain);
}
const base64UrlToBytes = (value) => base64ToBytes(value.replace(/-/g, "+").replace(/_/g, "/"));
const base64ToBytes = (value) => {
  const padded = value + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};
export {
  base64ToBytes,
  base64UrlToBytes,
  decryptDropPayload
};
