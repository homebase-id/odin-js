/** From journal's CalloutNodeView: a variant icon, which switches the variant, beside the content. */
import { useState } from 'react';
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { CircleX, Info, Lightbulb, TriangleAlert, type LucideIcon } from 'lucide-react';
import { CALLOUT_VARIANTS, toCalloutVariant, type CalloutVariant } from '@homebase-id/rich-text';

const ICONS: Record<CalloutVariant, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  tip: Lightbulb,
  error: CircleX,
};

// The viewer's colours (ArticleDocRenderer), so a callout looks the same while writing
const CLASSES: Record<CalloutVariant, string> = {
  info: 'border-sky-500 bg-sky-50 dark:bg-sky-950/40',
  warning: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40',
  tip: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
  error: 'border-red-500 bg-red-50 dark:bg-red-950/40',
};
const ICON_CLASSES: Record<CalloutVariant, string> = {
  info: 'text-sky-600 dark:text-sky-400',
  warning: 'text-amber-600 dark:text-amber-400',
  tip: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
};

export const CalloutNodeView = ({ node, updateAttributes, editor }: NodeViewProps) => {
  const variant = toCalloutVariant(node.attrs.variant);
  const [open, setOpen] = useState(false);
  const Icon = ICONS[variant];

  return (
    <NodeViewWrapper
      data-type="callout"
      data-variant={variant}
      className={`my-4 flex gap-2 rounded-md border-l-4 px-3 py-1 ${CLASSES[variant]}`}
    >
      <div contentEditable={false} className="relative pt-3">
        <button
          type="button"
          aria-label={`Callout type: ${variant}`}
          aria-expanded={open}
          disabled={!editor.isEditable}
          onClick={() => setOpen(!open)}
          className="rounded p-0.5 hover:bg-foreground/10"
        >
          <Icon className={`h-4 w-4 ${ICON_CLASSES[variant]}`} />
        </button>
        {open ? (
          <div className="absolute left-0 top-full z-20 mt-1 w-36 rounded-md border border-gray-200 bg-background p-1 shadow-md dark:border-gray-700">
            {CALLOUT_VARIANTS.map((v) => {
              const VariantIcon = ICONS[v];
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={v === variant}
                  onClick={() => {
                    updateAttributes({ variant: v });
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1 text-sm capitalize hover:bg-foreground/10 ${
                    v === variant ? 'bg-foreground/10' : ''
                  }`}
                >
                  <VariantIcon className={`h-4 w-4 ${ICON_CLASSES[v]}`} />
                  {v}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <NodeViewContent className="min-w-0 flex-1 py-2" />
    </NodeViewWrapper>
  );
};
