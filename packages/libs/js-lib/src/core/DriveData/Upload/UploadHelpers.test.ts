import { KeyHeader } from '../File/DriveFileTypes';
import { UploadFileMetadata } from './DriveUploadTypes';
import { encryptMetaData } from './UploadHelpers';
import { test, expect } from 'vitest';

test('Encrypt metadata should encrypt the content', async () => {
  const metadata: UploadFileMetadata = {
    appData: {
      content: `{hello:'world'}`,
    },
    allowDistribution: false,
    isEncrypted: false,
  };

  const keyHeader: KeyHeader = {
    iv: new Uint8Array(Array(16).fill(0)),
    aesKey: new Uint8Array(Array(16).fill(0)),
  };

  const encryptedMetadata = await encryptMetaData(metadata, keyHeader);
  expect(encryptedMetadata.appData.content).not.toEqual(metadata.appData.content);
  expect(encryptedMetadata.appData.content).toEqual('/RjhEghL36WE9NC1r/JZcw==');
});

test('Encrypt metadata should not encrypt the content if keyHeader is not provided', async () => {
  const metadata: UploadFileMetadata = {
    appData: {
      content: `{hello:'world'}`,
    },
    allowDistribution: false,
    isEncrypted: false,
  };

  const unencryptedMetadata = await encryptMetaData(metadata, undefined);
  expect(unencryptedMetadata).toEqual(metadata);
});
