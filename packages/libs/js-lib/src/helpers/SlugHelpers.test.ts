import { expect, test } from 'vitest';
import { deriveUniqueDriveSlug, isValidSlug, slugFromAlias, toOdinSlug } from './SlugHelpers';

test('isValidSlug mirrors the server rule', () => {
  expect(isValidSlug('chat')).toBe(true);
  expect(isValidSlug('a')).toBe(true);
  expect(isValidSlug('shard-recovery')).toBe(true);
  expect(isValidSlug('abcdefghijklmn')).toBe(true); // 14
  expect(isValidSlug('abcdefghijklmno')).toBe(false); // 15
  expect(isValidSlug('-chat')).toBe(false);
  expect(isValidSlug('chat-')).toBe(false);
  expect(isValidSlug('Chat')).toBe(false);
  expect(isValidSlug('my chat')).toBe(false);
  expect(isValidSlug('')).toBe(false);
  expect(isValidSlug(undefined)).toBe(false);
});

test('toOdinSlug', () => {
  expect(toOdinSlug('My Channel')).toBe('my-channel');
  expect(toOdinSlug('  News & Views!! ')).toBe('news-views');
  expect(toOdinSlug('Café')).toBe('cafe');
  expect(toOdinSlug('A very long channel name')).toBe('a-very-long-ch');
  expect(toOdinSlug('Fourteen chars x')).toBe('fourteen-chars'); // re-trimmed after the cut
  expect(toOdinSlug('日本語')).toBeUndefined();
  expect(toOdinSlug('')).toBeUndefined();
});

test('slugFromAlias', () => {
  expect(slugFromAlias('e8475dc4-6cb4-b665-1c2d-0dbd0f3aad5f')).toBe('e8475dc46cb4b6');
});

test('deriveUniqueDriveSlug', () => {
  const alias = 'e8475dc4-6cb4-b665-1c2d-0dbd0f3aad5f';
  expect(deriveUniqueDriveSlug('News', alias, [])).toBe('news');
  expect(deriveUniqueDriveSlug('News', alias, ['news', null])).toBe('news-2');
  expect(deriveUniqueDriveSlug('News', alias, ['news', 'news-2'])).toBe('news-3');
  expect(deriveUniqueDriveSlug('A very long channel name', alias, ['a-very-long-ch'])).toBe(
    'a-very-long-2'
  );
  expect(deriveUniqueDriveSlug('日本語', alias, [])).toBe('e8475dc46cb4b6');

  for (const slug of [
    deriveUniqueDriveSlug('x'.repeat(40), alias, ['xxxxxxxxxxxxxx']),
    deriveUniqueDriveSlug('Fourteen chars x', alias, ['fourteen-chars']),
  ])
    expect(isValidSlug(slug)).toBe(true);
});
