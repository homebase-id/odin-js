/**
 * Code block with a language field. Journal's CodeBlockNodeView without the live blocks: the code
 * is the same `pre > code` the headless node renders, highlighted by its language's first word.
 */
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

export const CodeBlockNodeView = ({ node, updateAttributes, editor }: NodeViewProps) => {
  const info = (node.attrs.language as string | null) ?? '';
  const language = info.trim().split(/\s+/)[0];

  return (
    <NodeViewWrapper className="relative my-4">
      <input
        contentEditable={false}
        aria-label="Code language"
        placeholder="language"
        value={info}
        readOnly={!editor.isEditable}
        onChange={(e) => updateAttributes({ language: e.target.value.trim() || null })}
        className="absolute right-2 top-2 z-10 w-24 rounded border border-transparent bg-transparent px-1 text-right font-mono text-xs text-foreground/50 outline-none hover:border-foreground/20 focus:border-foreground/30 focus:text-foreground"
      />
      <pre className="overflow-x-auto rounded-lg border bg-slate-100 p-3 pr-28 text-sm dark:border-slate-700 dark:bg-slate-800">
        <NodeViewContent<'code'>
          as="code"
          className={`font-mono text-foreground ${language ? `language-${language}` : ''}`}
          style={{ whiteSpace: 'inherit' }}
        />
      </pre>
    </NodeViewWrapper>
  );
};
