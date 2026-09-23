import { expect, test } from 'vitest';
import { getSocialLink } from './ProfileConfig';

test('TikTok links need the @ before the handle', () => {
  expect(getSocialLink('tiktok', 'samgamgee')).toEqual('https://tiktok.com/@samgamgee');
  expect(getSocialLink('tiktok', '@samgamgee')).toEqual('https://tiktok.com/@samgamgee');
});

test('Other socials keep their link shape', () => {
  expect(getSocialLink('twitter', 'frodo')).toEqual('https://twitter.com/frodo');
  expect(getSocialLink('linkedin', 'frodo')).toEqual('https://linkedin.com/in/frodo');
  expect(getSocialLink('snapchat', 'frodo')).toEqual('https://snapchat.com/add/frodo');
  expect(getSocialLink('dotyouid', 'frodo.dotyou.cloud')).toEqual('https://frodo.dotyou.cloud');
  expect(getSocialLink('discord', 'frodo')).toBeUndefined();
});
