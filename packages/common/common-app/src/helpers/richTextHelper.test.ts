import { expect, test } from 'vitest';
const longRichText: RichText = [
  {
    type: 'p',
    children: [
      {
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam aliquet arcu augue, a commodo enim volutpat ut.',
      },
    ],
    id: '1vjzm',
  },
  {
    type: 'p',
    children: [
      {
        text: 'In porta magna in massa tincidunt, nec accumsan sem posuere. Donec ultrices aliquam convallis. Etiam placerat ipsum sit amet laoreet ultrices. ',
      },
    ],
    id: 'tf68w',
  },
  {
    type: 'p',
    children: [
      {
        text: 'Etiam et leo turpis. Nulla convallis lectus enim, ac rutrum diam condimentum malesuada. ',
      },
    ],
    id: 'op2ev',
  },
  {
    type: 'p',
    children: [
      {
        text: 'Curabitur nec consequat velit. Curabitur ipsum justo, fermentum sed faucibus et, mattis ac ipsum.',
      },
    ],
    id: 'lk9dv',
  },
  {
    type: 'p',
    children: [
      {
        text: 'Pellentesque ultrices sem nec quam feugiat pharetra. Curabitur purus nisi, molestie sed iaculis a, vehicula ut tortor.',
      },
    ],
    id: 'q6ja1',
  },
  {
    type: 'p',
    children: [
      {
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam aliquet arcu augue, a commodo enim volutpat ut. Vivamus congue enim sit amet odio placerat porta. ',
      },
    ],
    id: 'fjmih',
  },
];
const regularRichText: RichText = [
  {
    type: 'p',
    children: [
      {
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam aliquet arcu augue, a commodo enim volutpat ut. Vivamus congue enim sit amet odio placerat porta. Mauris semper semper lobortis. Maecenas bibendum augue vel massa efficitur dignissim. Donec et mauris venenatis, consectetur arcu ac, iaculis mauris. Nulla non turpis in ligula',
      },
    ],
  },
];

import { getPlainTextFromRichText, ellipsisAtMaxCharOfRichText } from './richTextHelper';
import { RichText } from '@homebase-id/js-lib/core';
test('getPlainTextFromRichText', () => {
  expect(getPlainTextFromRichText(regularRichText)).toBe(
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam aliquet arcu augue, a commodo enim volutpat ut. Vivamus congue enim sit amet odio placerat porta. Mauris semper semper lobortis. Maecenas bibendum augue vel massa efficitur dignissim. Donec et mauris venenatis, consectetur arcu ac, iaculis mauris. Nulla non turpis in ligula'
  );
});

test('ellipsisAtMaxCharOfRichText', () => {
  expect(ellipsisAtMaxCharOfRichText(regularRichText, 10)).toStrictEqual([
    {
      type: 'p',
      children: [
        {
          text: 'Lorem ipsu...',
        },
      ],
    },
  ]);

  expect(ellipsisAtMaxCharOfRichText(longRichText, 100)).toStrictEqual([
    {
      type: 'p',
      children: [
        {
          text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam aliquet arcu augue, a commodo enim ...',
        },
      ],
      id: '1vjzm',
    },
  ]);

  expect(ellipsisAtMaxCharOfRichText(longRichText, 140)).toStrictEqual([
    {
      type: 'p',
      children: [
        {
          text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam aliquet arcu augue, a commodo enim volutpat ut.',
        },
      ],
      id: '1vjzm',
    },
    {
      type: 'p',
      children: [
        {
          text: 'In porta magna in massa tinc...',
        },
      ],
      id: 'tf68w',
    },
  ]);
});
