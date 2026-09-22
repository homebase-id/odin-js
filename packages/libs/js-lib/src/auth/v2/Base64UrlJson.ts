/**
 * base64url(UTF-8(JSON)) helpers for the `m` (manifest) and `p` (bundle authorize) URL params.
 * No padding on encode; decode accepts padded/unpadded base64url and standard base64.
 */

export const base64UrlEncodeBytes = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const base64UrlDecodeBytes = (value: string): Uint8Array => {
  let normalized = value.trim().replace(/-/g, '+').replace(/_/g, '/').replace(/ /g, '+');
  const padding = normalized.length % 4;
  if (padding === 2) normalized += '==';
  else if (padding === 3) normalized += '=';

  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

export const encodeBase64UrlJson = (value: unknown): string =>
  base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(value)));

/** Returns undefined when the value is missing or not valid base64url JSON. */
export const decodeBase64UrlJson = <T>(value: string | null | undefined): T | undefined => {
  if (!value) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecodeBytes(value))) as T;
  } catch {
    return undefined;
  }
};
