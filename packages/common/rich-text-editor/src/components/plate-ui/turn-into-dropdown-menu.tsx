import { DropdownMenuProps } from '@radix-ui/react-dropdown-menu';
import {
  collapseSelection,
  findNode,
  isBlock,
  isCollapsed,
  TElement,
  toggleBlock,
} from '@udecode/plate-common';
import { HEADING_KEYS } from '@udecode/plate-heading';

import { Icons } from '../../components/icons';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { ToolbarButton } from './toolbar';
import { useOpenState } from './dropdown-menu/use-open-state';
import { BlockquotePlugin } from '@udecode/plate-block-quote/react';
import { useEditorState } from '@udecode/plate-core/react';
import { focusEditor } from '@udecode/plate-common/react';

const items = [
  {
    value: 'p',
    label: 'Paragraph',
    description: 'Paragraph',
    icon: Icons.paragraph,
  },
  {
    value: HEADING_KEYS.h1,
    label: 'Heading 1',
    description: 'Heading 1',
    icon: Icons.h1,
  },
  {
    value: HEADING_KEYS.h2,
    label: 'Heading 2',
    description: 'Heading 2',
    icon: Icons.h2,
  },
  // {
  //   value: ELEMENT_H3,
  //   label: 'Heading 3',
  //   description: 'Heading 3',
  //   icon: Icons.h3,
  // },
  {
    value: BlockquotePlugin.key,
    label: 'Quote',
    description: 'Quote (⌘+⇧+.)',
    icon: Icons.blockquote,
  },
  {
    value: 'ul',
    label: 'Bulleted list',
    description: 'Bulleted list',
    icon: Icons.ul,
  },
  {
    value: 'ol',
    label: 'Numbered list',
    description: 'Numbered list',
    icon: Icons.ol,
  },
];

const defaultItem = items.find((item) => item.value === 'p')!;

export interface TurnIntoDropdownMenuProps extends DropdownMenuProps {
  filterValues?: string[];
}
export function TurnIntoDropdownMenu({ filterValues, ...props }: TurnIntoDropdownMenuProps) {
  const editor = useEditorState();
  const openState = useOpenState();

  let value: string = 'p';
  if (isCollapsed(editor?.selection)) {
    const entry = findNode<TElement>(editor!, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      match: (n: any) => isBlock(editor, n),
    });
    if (entry) {
      value = items.find((item) => item.value === entry[0].type)?.value ?? 'p';
    }
  }

  const selectedItem = items.find((item) => item.value === value) ?? defaultItem;
  const { icon: SelectedItemIcon, label: selectedItemLabel } = selectedItem;

  return (
    <DropdownMenu modal={false} {...openState} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton
          pressed={openState.open}
          tooltip="Turn into"
          isDropdown
          className="lg:min-w-[130px]"
        >
          <SelectedItemIcon className="h-5 w-5 lg:hidden" />
          <span className="max-lg:hidden">{selectedItemLabel}</span>
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-0 bg-background">
        <DropdownMenuLabel>Turn into</DropdownMenuLabel>

        <DropdownMenuRadioGroup
          className="flex flex-col gap-0.5"
          value={value}
          onValueChange={(type) => {
            toggleBlock(editor, { type });

            collapseSelection(editor);
            focusEditor(editor);
          }}
        >
          {items
            ?.filter((item) => !filterValues || !filterValues.includes(item.value))
            .map(({ value: itemValue, label, icon: Icon }) => (
              <DropdownMenuRadioItem key={itemValue} value={itemValue} className="min-w-[180px]">
                <Icon className="mr-2 h-5 w-5" />
                {label}
              </DropdownMenuRadioItem>
            ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
