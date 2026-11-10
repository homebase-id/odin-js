import type { Editor, Range } from '@tiptap/core';
import {
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Images,
  List,
  ListCollapse,
  ListEnd,
  ListOrdered,
  MessageSquareWarning,
  Minus,
  Quote,
  Table,
  type LucideIcon,
} from 'lucide-react';

export type SlashItem = {
  title: string;
  description: string;
  /** Aliases the search matches like the title (e.g. `h2`, `todo`) */
  keywords: string[];
  icon: LucideIcon;
  run: (props: { editor: Editor; range: Range }) => void;
};

/** Opens the file picker for images and hands what was picked to `insert`. */
const pickImages = (insert: (files: File[]) => void, editor: Editor) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = () => {
    if (!editor.isDestroyed && input.files?.length) insert(Array.from(input.files));
  };
  input.click();
};

const block =
  (apply: (editor: Editor) => void) =>
  ({ editor, range }: { editor: Editor; range: Range }) => {
    editor.chain().focus().deleteRange(range).run();
    apply(editor);
  };

/** From journal's plugins/SlashCommands, without the AI actions, live blocks and note links. */
export const SLASH_ITEMS: SlashItem[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    keywords: ['h1', 'title'],
    icon: Heading1,
    run: block((e) => e.chain().focus().setNode('heading', { level: 1 }).run()),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    keywords: ['h2', 'subtitle'],
    icon: Heading2,
    run: block((e) => e.chain().focus().setNode('heading', { level: 2 }).run()),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    keywords: ['h3'],
    icon: Heading3,
    run: block((e) => e.chain().focus().setNode('heading', { level: 3 }).run()),
  },
  {
    title: 'Bullet List',
    description: 'A bulleted list',
    keywords: ['ul', 'unordered', 'bullets'],
    icon: List,
    run: block((e) => e.chain().focus().toggleBulletList().run()),
  },
  {
    title: 'Numbered List',
    description: 'A numbered list',
    keywords: ['ol', 'ordered', 'numbers'],
    icon: ListOrdered,
    run: block((e) => e.chain().focus().toggleOrderedList().run()),
  },
  {
    title: 'Task List',
    description: 'A to-do checklist',
    keywords: ['todo', 'checkbox', 'checklist'],
    icon: CheckSquare,
    run: block((e) => e.chain().focus().toggleTaskList().run()),
  },
  {
    title: 'Quote',
    description: 'A blockquote',
    keywords: ['blockquote', 'citation'],
    icon: Quote,
    run: block((e) => e.chain().focus().toggleBlockquote().run()),
  },
  {
    title: 'Code Block',
    description: 'A code snippet',
    keywords: ['code', 'snippet', 'pre'],
    icon: Code,
    run: block((e) => e.chain().focus().toggleCodeBlock().run()),
  },
  {
    title: 'Callout',
    description: 'An info, tip, warning or error box',
    keywords: ['info', 'tip', 'warning', 'error', 'alert'],
    icon: MessageSquareWarning,
    run: block((e) =>
      e
        .chain()
        .focus()
        .insertContent({ type: 'callout', content: [{ type: 'paragraph' }] })
        .run()
    ),
  },
  {
    title: 'Toggle',
    description: 'A collapsible section',
    keywords: ['collapse', 'details', 'accordion'],
    icon: ListCollapse,
    run: block((e) =>
      e
        .chain()
        .focus()
        .insertContent({ type: 'toggle', content: [{ type: 'paragraph' }] })
        .run()
    ),
  },
  {
    title: 'Table',
    description: 'A 3 by 3 table',
    keywords: ['grid', 'rows', 'columns'],
    icon: Table,
    run: block((e) =>
      e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    ),
  },
  {
    title: 'Divider',
    description: 'A horizontal rule',
    keywords: ['hr', 'separator', 'line'],
    icon: Minus,
    run: block((e) => e.chain().focus().setHorizontalRule().run()),
  },
  {
    title: 'Image',
    description: 'Upload one or more images',
    keywords: ['img', 'picture', 'photo'],
    icon: Image,
    run: block((e) => pickImages((files) => e.commands.insertImageFiles(files), e)),
  },
  {
    title: 'Gallery',
    description: 'Images side by side',
    keywords: ['images', 'photos', 'grid', 'carousel'],
    icon: Images,
    run: block((e) => pickImages((files) => e.commands.insertImageGallery(files), e)),
  },
  {
    title: 'Footnote',
    description: 'A numbered note at the end',
    keywords: ['reference', 'endnote'],
    icon: ListEnd,
    run: block((e) => e.chain().focus().insertFootnote().run()),
  },
];

/** Items whose title or a keyword matches `query`: those starting with it first. */
export const filterSlashItems = (query: string, items = SLASH_ITEMS): SlashItem[] => {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const names = (item: SlashItem) => [item.title, ...item.keywords].map((n) => n.toLowerCase());
  const starts = items.filter((item) => names(item).some((n) => n.startsWith(q)));
  const contains = items.filter(
    (item) => !starts.includes(item) && names(item).some((n) => n.includes(q))
  );
  return [...starts, ...contains];
};
