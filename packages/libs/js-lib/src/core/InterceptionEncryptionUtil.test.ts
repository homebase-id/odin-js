import { expect, test } from 'vitest';
import {
  buildIvFromQueryString,
  decryptData,
  encryptData,
  encryptUrl,
} from './InterceptionEncryptionUtil';
import { jsonStringify64, uint8ArrayToBase64 } from '../helpers/helpers';

test('Test encryptData to properly encrypt', async () => {
  expect(
    await encryptData(jsonStringify64({ hello: 'world' }), new Uint8Array(16), new Uint8Array(16))
  ).toEqual({
    iv: 'AAAAAAAAAAAAAAAAAAAAAA==',
    data: '0ZJeIvw/oDGVsgk+10zcM0DesUUAQ2b0qepUotQ0oL8=',
  });
});

test('Test building a correct IV from a queryString', async () => {
  const iv = await buildIvFromQueryString('fileId=123&key=456&height=789&width=101112');
  expect(iv).toBeDefined();
  expect(uint8ArrayToBase64(iv!)).toEqual('NXTlAU9jueUrn5/5MYouVQ==');

  const iv2 = await buildIvFromQueryString('alias=123');
  expect(iv2).toBeDefined();
  expect(uint8ArrayToBase64(iv2!)).toEqual('DciTGX//rYnIw1kP5TM8Fg==');
});

test('Test encryptUrl to encrypt any url', async () => {
  const emptyEncryptedUrl = await encryptUrl('https://example.com', new Uint8Array(16));
  expect(emptyEncryptedUrl).toEqual('https://example.com');

  const encryptedUrl = await encryptUrl(
    'https://example.com?fileId=123&key=456&height=789&width=101112',
    new Uint8Array(16)
  );
  expect(encryptedUrl).toEqual(
    'https://example.com?ss=%7B%22iv%22%3A%22NXTlAU9jueUrn5%2F5MYouVQ%3D%3D%22%2C%22data%22%3A%22NhLko0j%2Byi2WG6EVvGLzm4DW5%2FItYlzu9bdudxQPUFMjPDSDATS4H80bah2LVb5q%22%7D'
  );
});

test('Test decryptData to properly decrypt', async () => {
  const key = new Uint8Array(16);
  const iv = uint8ArrayToBase64(new Uint8Array(16));

  expect(await decryptData('0ZJeIvw/oDGVsgk+10zcM0DesUUAQ2b0qepUotQ0oL8=', iv, key)).toEqual({
    hello: 'world',
  });
});
