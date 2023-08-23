import { expect, test } from 'vitest';
import { getDomainFromUrl } from './DomainUtil';

test('Convert string to Uint8Array', () => {
  expect(
    getDomainFromUrl(
      'https://github.com/YouFoundation/stories-and-architecture-docs/blob/master/concepts/YouAuth/unified-authorization.md#token-endpoint'
    )
  ).toEqual('github.com');

  expect(getDomainFromUrl('https://frodo.dotyou.cloud/')).toEqual('frodo.dotyou.cloud');
  expect(getDomainFromUrl('frodo.dotyou.cloud')).toEqual('frodo.dotyou.cloud');
  expect(getDomainFromUrl(undefined)).toEqual(undefined);
});
