/**
 * From journal's ToggleNodeView: a chevron and a title input above the content. Open or closed is
 * local state (open by default) and is not stored.
 */
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

export const ToggleNodeView = ({ node, updateAttributes, editor }: NodeViewProps) => {
  const [open, setOpen] = useState(true);

  return (
    <NodeViewWrapper
      data-type="toggle"
      className="my-3 rounded-md border border-foreground/10 px-3 py-2"
    >
      <div contentEditable={false} className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Collapse' : 'Expand'}
          onClick={() => setOpen(!open)}
          className="rounded p-0.5 text-foreground/60 hover:bg-foreground/10 hover:text-foreground"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        <input
          aria-label="Toggle title"
          placeholder="Toggle"
          value={(node.attrs.summary as string) ?? ''}
          readOnly={!editor.isEditable}
          onChange={(e) => updateAttributes({ summary: e.target.value })}
          className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-foreground/40"
        />
      </div>
      <NodeViewContent hidden={!open} className="pl-6 pt-1" />
    </NodeViewWrapper>
  );
};
