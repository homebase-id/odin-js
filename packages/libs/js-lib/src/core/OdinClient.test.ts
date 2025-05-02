import { expect, test } from 'vitest';
import { OdinClient, ApiType } from './OdinClient';
import { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';
import { base64ToUint8Array, byteArrayToString, cbcDecrypt } from '../helpers/helpers';

test('App OdinClient', () => {
  const odinClient = new OdinClient({
    api: ApiType.App,
    hostIdentity: 'example.com',
  });

  expect(odinClient).toBeInstanceOf(OdinClient);
  expect(odinClient.getEndpoint()).toEqual('https://example.com/api/apps/v1');
  expect(odinClient.getRoot()).toEqual('https://example.com');
  expect(odinClient.getType()).toEqual(ApiType.App);
});

test('Guest OdinClient', () => {
  const odinClient = new OdinClient({
    api: ApiType.Guest,
    hostIdentity: 'example.com',
  });

  expect(odinClient).toBeInstanceOf(OdinClient);
  expect(odinClient.getRoot()).toEqual('https://example.com');
  expect(odinClient.getType()).toEqual(ApiType.Guest);
  expect(odinClient.getEndpoint()).toEqual('https://example.com/api/guest/v1');
});

test('OdinClient GET request interceptor', async () => {
  const fixedSharedSecret = new Uint8Array(16).fill(1);
  const odinClient = new OdinClient({
    api: ApiType.App,
    hostIdentity: 'example.com',
    sharedSecret: fixedSharedSecret,
  });

  const axiosClient = odinClient.createAxiosClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internalAxiosHandlers = (axiosClient.interceptors.request as any)?.handlers;

  expect(internalAxiosHandlers).toHaveLength(1);
  expect(internalAxiosHandlers[0].fulfilled).toBeInstanceOf(Function);

  const requestConfig: InternalAxiosRequestConfig = {
    method: 'GET',
    url: '/drive/query/payload?alias=e8475dc4-6cb4-b665-1c2d-0dbd0f3aad5f&type=8f448716e34cedf9014145e043ca6612&globalTransitId=5a3503d3-c99e-4392-bcf0-8dc0c71919e2&key=pst_mdi',
    headers: new AxiosHeaders(),
  };
  const result = await internalAxiosHandlers[0].fulfilled(requestConfig);
  expect(result.url).toEqual(
    '/drive/query/payload?ss=%7B%22iv%22%3A%22cFSd88nOho67L%2FacuruqPA%3D%3D%22%2C%22data%22%3A%22J0vETNpZBiFnDq%2BMqgi487nE3GIBB6P65C%2F8W%2FjJSdk1aGqISAMf6Vmpazd2UXjBHlvkGmshfOF5CJm0LdlD%2Bkq0DpdmB8V%2BcrVsTaV4y0%2FBLkb%2BelDpM2fAaRlQ%2FFNQREY3p038v%2FvFkFLl6Z0HsPGab3JwUe2G4y6OJEzYC6rTZ5oy5KzCgcQs7jG5t4KutHYD%2Fmp%2BfZUhkWMEJMdH4w%3D%3D%22%7D'
  );
});

test('OdinClient POST request interceptor', async () => {
  const fixedSharedSecret = new Uint8Array(16).fill(1);
  const odinClient = new OdinClient({
    api: ApiType.App,
    hostIdentity: 'example.com',
    sharedSecret: fixedSharedSecret,
  });

  const axiosClient = odinClient.createAxiosClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internalAxiosHandlers = (axiosClient.interceptors.request as any)?.handlers;

  expect(internalAxiosHandlers).toHaveLength(1);
  expect(internalAxiosHandlers[0].fulfilled).toBeInstanceOf(Function);

  const queryData = {
    alias: 'e8475dc4-6cb4-b665-1c2d-0dbd0f3aad5f',
    type: '8f448716e34cedf9014145e043ca6612',
    globalTransitId: '5a3503d3-c99e-4392-bcf0-8dc0c71919e2',
    key: 'pst_mdi',
  };

  const requestConfig: InternalAxiosRequestConfig = {
    method: 'POST',
    url: '/drive/query/payload',
    headers: new AxiosHeaders(),
    data: queryData,
  };
  const result = await internalAxiosHandlers[0].fulfilled(requestConfig);
  expect(result.url).toEqual('/drive/query/payload');
  const encryptedResult = result.data;

  const usedIv = base64ToUint8Array(encryptedResult.iv);
  const encryptedBytes = base64ToUint8Array(encryptedResult.data);

  const decryptedBytes = await cbcDecrypt(encryptedBytes, usedIv, fixedSharedSecret);
  const stringifiedData = byteArrayToString(decryptedBytes);
  const parsedData = JSON.parse(stringifiedData);

  expect(parsedData).toEqual(queryData);
});
