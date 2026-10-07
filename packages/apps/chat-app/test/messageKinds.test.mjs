import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isRenderableMessage,
  isHiddenReactionCode,
} from './_build/messageKinds.mjs';

const msg = (dataType, archivalStatus) => ({ fileMetadata: { appData: { dataType, archivalStatus } } });

test('renderable kinds', () => {
  for (const d of [0, undefined, 202, 211]) assert.equal(isRenderableMessage(msg(d)), true, String(d));
});

test('unknown kinds are not renderable', () => {
  for (const d of [210, 214, 216, 9999]) assert.equal(isRenderableMessage(msg(d)), false, String(d));
});

test('soft-deleted unknown kind stays renderable so the deleted bubble shows', () => {
  assert.equal(isRenderableMessage(msg(216, 2)), true);
  assert.equal(isRenderableMessage(msg(216, 0)), false);
});

test('hidden reaction codes', () => {
  assert.equal(isHiddenReactionCode('_vo'), true);
  assert.equal(isHiddenReactionCode('_p0'), true);
  assert.equal(isHiddenReactionCode('👍'), false);
  assert.equal(isHiddenReactionCode(''), false);
});
