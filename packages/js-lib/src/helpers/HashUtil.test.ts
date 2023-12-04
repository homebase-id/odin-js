import { expect, test } from 'vitest';
import { getNewXorId } from './HashUtil';

test('Convert string to Uint8Array', async () => {
  expect(await getNewXorId('frodo.dotyou.cloud', 'sam.dotyou.cloud')).toEqual(
    'c6aa75b0-9a5e-4f56-a169-a9934abe1d1a'
  );

  expect(await getNewXorId('frodo.dotyou.cloud', 'sam.dotyou.cloud')).toEqual(
    await getNewXorId('sam.dotyou.cloud', 'frodo.dotyou.cloud')
  );
});
