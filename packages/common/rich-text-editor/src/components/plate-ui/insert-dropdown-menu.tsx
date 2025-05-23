import React from 'react';
import { DropdownMenuProps } from '@radix-ui/react-dropdown-menu';
import { insertEmptyElement } from '@udecode/plate';

import { Icons } from '../../components/icons';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { ToolbarButton } from './toolbar';
import { useOpenState } from './dropdown-menu/use-open-state';
import { HEADING_KEYS } from '@udecode/plate-heading';
import { ParagraphPlugin, useEditorState } from '@udecode/plate-core/react';
import { BlockquotePlugin } from '@udecode/plate-block-quote/react';
import { focusEditor } from '@udecode/plate/react';

const items = [
  {
    label: 'Basic blocks',
    items: [
      {
        value: ParagraphPlugin.key,
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
      // {
      //   value: ELEMENT_TABLE,
      //   label: 'Table',
      //   description: 'Table',
      //   icon: Icons.table,
      // },
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
      // {
      //   value: ELEMENT_HR,
      //   label: 'Divider',
      //   description: 'Divider (---)',
      //   icon: Icons.hr,
      // },
    ],
  },
  // {
  //   label: 'Media',
  //   items: [
  //     {
  //       value: ELEMENT_CODE_BLOCK,
  //       label: 'Code',
  //       description: 'Code (```)',
  //       icon: Icons.codeblock,
  //     },
  //     {
  //       value: ELEMENT_IMAGE,
  //       label: 'Image',
  //       description: 'Image',
  //       icon: Icons.image,
  //     },
  //     {
  //       value: ELEMENT_MEDIA_EMBED,
  //       label: 'Embed',
  //       description: 'Embed',
  //       icon: Icons.embed,
  //     },
  //     {
  //       value: ELEMENT_EXCALIDRAW,
  //       label: 'Excalidraw',
  //       description: 'Excalidraw',
  //       icon: Icons.excalidraw,
  //     },
  //   ],
  // },
  // {
  //   label: 'Inline',
  //   items: [
  //     {
  //       value: ELEMENT_LINK,
  //       label: 'Link',
  //       description: 'Link',
  //       icon: Icons.link,
  //     },
  //   ],
  // },
];

interface InsertDropDownMenuProps extends DropdownMenuProps {
  filterValues?: string[];
}

export function InsertDropdownMenu({ filterValues, ...props }: InsertDropDownMenuProps) {
  const editor = useEditorState();
  const openState = useOpenState();

  return (
    <DropdownMenu modal={false} {...openState} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={openState.open} tooltip="Insert" isDropdown>
          <Icons.add />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="flex max-h-[500px] min-w-0 flex-col gap-0.5 overflow-y-auto bg-background text-foreground"
      >
        {items.map(({ items: nestedItems, label }, index) => (
          <React.Fragment key={label}>
            {index !== 0 && <DropdownMenuSeparator />}

            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            {nestedItems
              ?.filter((item) => !filterValues || !filterValues.includes(item.value))
              .map(({ value: type, label: itemLabel, icon: Icon }) => (
                <DropdownMenuItem
                  key={type}
                  className="min-w-[180px]"
                  onSelect={async () => {
                    switch (type) {
                      // case ELEMENT_CODE_BLOCK: {
                      //   insertEmptyCodeBlock(editor);
                      //
                      //   break;
                      // }
                      // case ELEMENT_IMAGE: {
                      //   await insertMedia(editor, { type: ELEMENT_IMAGE });
                      //
                      //   break;
                      // }
                      // case ELEMENT_MEDIA_EMBED: {
                      //   await insertMedia(editor, {
                      //     type: ELEMENT_MEDIA_EMBED,
                      //   });
                      //
                      //   break;
                      // }
                      // case 'ul':
                      // case 'ol': {
                      //   insertEmptyElement(editor, ELEMENT_PARAGRAPH, {
                      //     select: true,
                      //     nextBlock: true,
                      //   });
                      //
                      //   if (settingsStore.get.checkedId(KEY_LIST_STYLE_TYPE)) {
                      //     toggleIndentList(editor, {
                      //       listStyleType: type === 'ul' ? 'disc' : 'decimal',
                      //     });
                      //   } else if (settingsStore.get.checkedId('list')) {
                      //     toggleList(editor, { type });
                      //   }
                      //
                      //   break;
                      // }
                      // case ELEMENT_TABLE: {
                      //   insertTable(editor);
                      //
                      //   break;
                      // }
                      // case ELEMENT_LINK: {
                      //   triggerFloatingLink(editor, { focused: true });
                      //
                      //   break;
                      // }
                      default: {
                        insertEmptyElement(editor, type, {
                          select: true,
                          nextBlock: true,
                        });
                      }
                    }

                    focusEditor(editor);
                  }}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {itemLabel}
                </DropdownMenuItem>
              ))}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
