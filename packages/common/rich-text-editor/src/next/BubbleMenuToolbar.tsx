/**
 * From journal's BubbleMenuToolbar: a floating format toolbar over a text selection, placed from
 * the editor's selection (no bubble-menu extension). The link button edits the link in place.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link as LinkIcon,
  RemoveFormatting,
  Strikethrough,
  Underline,
} from 'lucide-react';

const NO_TEXT_FORMAT = ['codeBlock', 'image'];

const Button = ({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active}
    onClick={onClick}
    className={`flex h-8 w-8 items-center justify-center rounded hover:bg-foreground/10 ${
      active ? 'bg-foreground/10 text-primary' : ''
    }`}
  >
    {children}
  </button>
);

export const BubbleMenuToolbar = ({ editor }: { editor: Editor }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      heading: e.isActive('heading', { level: 2 }),
      link: e.isActive('link'),
      href: (e.getAttributes('link').href as string | undefined) ?? '',
    }),
  });

  useEffect(() => {
    const update = () => {
      const { selection } = editor.state;
      if (
        !editor.isEditable ||
        selection.empty ||
        selection instanceof NodeSelection ||
        NO_TEXT_FORMAT.includes(selection.$from.parent.type.name)
      ) {
        setPosition(null);
        setLinkOpen(false);
        return;
      }
      const start = editor.view.coordsAtPos(selection.from);
      const end = editor.view.coordsAtPos(selection.to);
      // Above the selection, or below it when it's at the top of the window
      const top = start.top > 64 ? start.top - 48 : end.bottom + 8;
      setPosition({ top, left: (start.left + end.left) / 2 });
    };
    const hide = ({ event }: { event: FocusEvent }) => {
      // Focus moving into the toolbar (the link field) keeps it open
      if (ref.current?.contains(event.relatedTarget as Node)) return;
      setPosition(null);
      setLinkOpen(false);
    };
    editor.on('selectionUpdate', update);
    editor.on('blur', hide);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('blur', hide);
    };
  }, [editor]);

  if (!position) return null;

  const run = (command: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) =>
    command(editor.chain().focus()).run();

  const setLink = (href: string) => {
    const url = href.trim();
    if (!url) run((c) => c.extendMarkRange('link').unsetLink());
    else
      run((c) =>
        c
          .extendMarkRange('link')
          .setLink({ href: /^(https?:|mailto:)/i.test(url) ? url : `https://${url}` })
      );
    setLinkOpen(false);
  };

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Format"
      className="fixed z-50 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-background px-1.5 py-1 text-foreground shadow-lg dark:border-gray-700"
      style={{
        top: position.top,
        left: Math.max(150, Math.min(position.left, window.innerWidth - 150)),
      }}
      // Keeps the selection while clicking a button
      onMouseDown={(e) => {
        if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
      }}
    >
      {linkOpen ? (
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            setLink(new FormData(e.currentTarget).get('href') as string);
          }}
        >
          <input
            name="href"
            autoFocus
            defaultValue={active.href}
            placeholder="https://"
            aria-label="Link address"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setLinkOpen(false);
                editor.commands.focus();
              }
            }}
            className="w-56 rounded border border-gray-300 bg-transparent px-2 py-1 text-sm outline-none focus:border-primary dark:border-gray-600"
          />
          <button
            type="submit"
            className="rounded px-2 py-1 text-sm font-medium text-primary hover:bg-foreground/10"
          >
            Save
          </button>
        </form>
      ) : (
        <>
          <Button title="Bold" active={active.bold} onClick={() => run((c) => c.toggleBold())}>
            <Bold size={16} />
          </Button>
          <Button
            title="Italic"
            active={active.italic}
            onClick={() => run((c) => c.toggleItalic())}
          >
            <Italic size={16} />
          </Button>
          <Button
            title="Underline"
            active={active.underline}
            onClick={() => run((c) => c.toggleUnderline())}
          >
            <Underline size={16} />
          </Button>
          <Button
            title="Strikethrough"
            active={active.strike}
            onClick={() => run((c) => c.toggleStrike())}
          >
            <Strikethrough size={16} />
          </Button>
          <Button title="Code" active={active.code} onClick={() => run((c) => c.toggleCode())}>
            <Code size={16} />
          </Button>
          <div className="mx-1 h-5 w-px bg-foreground/15" />
          <Button
            title="Heading"
            active={active.heading}
            onClick={() => run((c) => c.toggleHeading({ level: 2 }))}
          >
            <Heading2 size={16} />
          </Button>
          <Button title="Link" active={active.link} onClick={() => setLinkOpen(true)}>
            <LinkIcon size={16} />
          </Button>
          <div className="mx-1 h-5 w-px bg-foreground/15" />
          <Button
            title="Clear formatting"
            onClick={() => run((c) => c.clearNodes().unsetAllMarks())}
          >
            <RemoveFormatting size={16} />
          </Button>
        </>
      )}
    </div>
  );
};
