import {
  BoldPlugin,
  CodePlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  UnderlinePlugin,
} from '@udecode/plate-basic-marks/react';
import { preFormat } from './autoFormatUtils';
import { AutoformatRule } from '@udecode/plate-autoformat';
import { insertEmptyCodeBlock } from '@udecode/plate-code-block';
import { CodeBlockPlugin } from '@udecode/plate-code-block/react';
import { HEADING_KEYS } from '@udecode/plate-heading';
import { toggleBulletedList } from '@udecode/plate-list';
import { BlockquotePlugin } from '@udecode/plate-block-quote/react';

export const autoformatBlocks: AutoformatRule[] = [
  {
    mode: 'block',
    type: HEADING_KEYS.h1,
    match: '# ',
    preFormat,
  },
  {
    mode: 'block',
    type: HEADING_KEYS.h2,
    match: '## ',
    preFormat,
  },
  {
    format: (editor) => {
      insertEmptyCodeBlock(editor, {
        defaultType: 'p',
        insertNodesOptions: { select: true },
      });
    },
    match: '```',
    mode: 'block',
    preFormat,
    triggerAtBlockStart: false,
    type: CodeBlockPlugin.key,
  },
  {
    match: '> ',
    mode: 'block',
    type: BlockquotePlugin.key,
  },
  {
    format: (editor) => {
      toggleBulletedList(editor);
    },
    match: ['* ', '- '],
    mode: 'block',
    type: 'list',
  },
];

export const autoformatMarks: AutoformatRule[] = [
  {
    match: '**',
    mode: 'mark',
    type: BoldPlugin.key,
  },
  {
    match: '__',
    mode: 'mark',
    type: UnderlinePlugin.key,
  },
  {
    match: '_',
    mode: 'mark',
    type: ItalicPlugin.key,
  },
  {
    match: '~~',
    mode: 'mark',
    type: StrikethroughPlugin.key,
  },
  {
    match: '`',
    mode: 'mark',
    type: CodePlugin.key,
  },
];
