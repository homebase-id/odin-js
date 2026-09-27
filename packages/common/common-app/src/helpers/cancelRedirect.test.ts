import { expect, test } from 'vitest';
import { getCancelRedirectUrl, getStateParam } from './cancelRedirect';

const params = (href: string) => Object.fromEntries(new URL(href).searchParams);

test('getCancelRedirectUrl keeps the redirect URI query and adds error and state', () => {
  const href = getCancelRedirectUrl(
    'https://thirdparty.dotyou.cloud/authorization-code-callback?session=abc&state=xyz',
    'xyz'
  );

  expect(href.startsWith('https://thirdparty.dotyou.cloud/authorization-code-callback?')).toBe(
    true
  );
  expect(params(href)).toEqual({ session: 'abc', state: 'xyz', error: 'cancelled-by-user' });
});

test('getCancelRedirectUrl adds state when the redirect URI has no query', () => {
  const href = getCancelRedirectUrl('https://thirdparty.dotyou.cloud/callback', 'xyz');
  expect(params(href)).toEqual({ error: 'cancelled-by-user', state: 'xyz' });
});

test('getCancelRedirectUrl leaves state out when the request carried none', () => {
  expect(getCancelRedirectUrl('https://thirdparty.dotyou.cloud/callback', '')).toBe(
    'https://thirdparty.dotyou.cloud/callback?error=cancelled-by-user'
  );
  expect(getCancelRedirectUrl('https://thirdparty.dotyou.cloud/callback')).toBe(
    'https://thirdparty.dotyou.cloud/callback?error=cancelled-by-user'
  );
});

test('getCancelRedirectUrl replaces an error the redirect URI already carried', () => {
  const href = getCancelRedirectUrl('https://thirdparty.dotyou.cloud/callback?error=old');
  expect(params(href)).toEqual({ error: 'cancelled-by-user' });
});

test('getCancelRedirectUrl keeps the fragment after the query', () => {
  expect(getCancelRedirectUrl('https://thirdparty.dotyou.cloud/callback?a=1#frag')).toBe(
    'https://thirdparty.dotyou.cloud/callback?a=1&error=cancelled-by-user#frag'
  );
});

test('getCancelRedirectUrl works on app scheme URIs', () => {
  expect(getCancelRedirectUrl('homebase-chat://')).toBe('homebase-chat://?error=cancelled-by-user');
  expect(getCancelRedirectUrl('homebase-chat://auth?x=1', 's')).toBe(
    'homebase-chat://auth?x=1&error=cancelled-by-user&state=s'
  );
});

test('getCancelRedirectUrl appends by hand to a URI that is not absolute', () => {
  expect(getCancelRedirectUrl('/callback')).toBe('/callback?error=cancelled-by-user');
  expect(getCancelRedirectUrl('/callback?a=1', 's')).toBe(
    '/callback?a=1&error=cancelled-by-user&state=s'
  );
  expect(getCancelRedirectUrl('/callback?#frag')).toBe('/callback?error=cancelled-by-user#frag');
});

test('getStateParam reads state from a URL and tolerates anything else', () => {
  expect(getStateParam('https://frodo.dotyou.cloud/authorize?client_id=x&state=abc')).toBe('abc');
  expect(getStateParam('https://frodo.dotyou.cloud/authorize?state=')).toBeUndefined();
  expect(getStateParam('https://frodo.dotyou.cloud/authorize')).toBeUndefined();
  expect(getStateParam('backend-will-decide')).toBeUndefined();
  expect(getStateParam(null)).toBeUndefined();
});
