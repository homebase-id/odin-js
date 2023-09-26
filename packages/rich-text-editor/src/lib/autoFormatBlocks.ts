import { preFormat } from './autoFormatUtils';
import { AutoformatRule } from '@udecode/plate-autoformat';
import { ELEMENT_H1, ELEMENT_H2 } from '@udecode/plate-heading';

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
];
