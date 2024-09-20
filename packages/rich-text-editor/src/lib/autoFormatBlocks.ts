import { preFormat } from './autoFormatUtils';
import { AutoformatRule } from '@udecode/plate-autoformat';
import {
  MARK_BOLD,
  MARK_CODE,
  MARK_ITALIC,
  MARK_STRIKETHROUGH,
  MARK_UNDERLINE,
} from '@udecode/plate-basic-marks';
import { ELEMENT_CODE_BLOCK, insertEmptyCodeBlock } from '@udecode/plate-code-block';
import { ELEMENT_H1, ELEMENT_H2 } from '@udecode/plate-heading';
import { ELEMENT_PARAGRAPH } from '@udecode/plate-paragraph';

export const autoformatBlocks: AutoformatRule[] = [
  {
    mode: 'block',
    type: ELEMENT_H1,
    match: '# ',
    preFormat,
  },
  {
    mode: 'block',
    type: ELEMENT_H2,
    match: '## ',
    preFormat,
  },
  {
    format: (editor) => {
      insertEmptyCodeBlock(editor, {
        defaultType: ELEMENT_PARAGRAPH,
        insertNodesOptions: { select: true },
      });
    },
    match: '```',
    mode: 'block',
    preFormat,
    triggerAtBlockStart: false,
    type: ELEMENT_CODE_BLOCK,
  },
];

export const autoformatMarks: AutoformatRule[] = [
  {
    match: '**',
    mode: 'mark',
    type: MARK_BOLD,
  },
  {
    match: '__',
    mode: 'mark',
    type: MARK_UNDERLINE,
  },
  {
    match: '_',
    mode: 'mark',
    type: MARK_ITALIC,
  },
  {
    match: '~~',
    mode: 'mark',
    type: MARK_STRIKETHROUGH,
  },
  {
    match: '`',
    mode: 'mark',
    type: MARK_CODE,
  },
];
