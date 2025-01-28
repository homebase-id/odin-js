import {
  BoldPlugin,
  CodePlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  UnderlinePlugin,
} from '@udecode/plate-basic-marks/react';
import { AutoformatRule } from '@udecode/plate-autoformat';
import { insertEmptyCodeBlock } from '@udecode/plate-code-block';
import { CodeBlockPlugin } from '@udecode/plate-code-block/react';
import { HEADING_KEYS } from '@udecode/plate-heading';
import { toggleBulletedList } from '@udecode/plate-list';
import { BlockquotePlugin } from '@udecode/plate-block-quote/react';
import { ParagraphPlugin } from '@udecode/plate-core/react';

export const autoformatBlocks: AutoformatRule[] = [
  {
    match: '# ',
    mode: 'block',
    type: HEADING_KEYS.h1,
  },
  {
    match: '## ',
    mode: 'block',
    type: HEADING_KEYS.h2,
  },
  {
    format: (editor) => {
      insertEmptyCodeBlock(editor, {
        defaultType: ParagraphPlugin.key,
        insertNodesOptions: { select: true },
      });
    },
    match: '```',
    mode: 'block',
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
