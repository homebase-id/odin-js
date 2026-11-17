import { useMemo, useCallback } from 'react';
import { safeStringify, tokenizeJson } from './utils';
import { CopyButton } from '../Buttons/CopyButton';

export type JsonViewerProps = {
  data?: unknown;
  text?: string;
  indent?: number;
  className?: string;
  showHeader?: boolean;
  title?: string;
  wrapLines?: boolean;
  ariaLabel?: string;
};

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  text,
  indent = 2,
  className,
  showHeader = true,
  title = 'JSON',
  wrapLines = false,
  ariaLabel = 'JSON viewer',
}) => {
  const jsonText = useMemo(() => {
    if (typeof text === 'string') {
      try {
        return safeStringify(JSON.parse(text), indent);
      } catch {
        return text; // show as-is if not valid JSON
      }
    }
    return safeStringify(data ?? null, indent);
  }, [text, data, indent]);

  const tokens = useMemo(() => tokenizeJson(jsonText), [jsonText]);
  const getCopyText = useCallback(() => jsonText, [jsonText]);

  return (
    <div
      className={[
        'group rounded-xl border shadow-sm',
        'border-outline-variant bg-surface-container-lowest',
        'prose prose-zinc dark:prose-invert',
        className ?? '',
      ].join(' ')}
      aria-label={ariaLabel}
      role="region"
    >
      {showHeader && (
        <div className="flex items-center justify-between border-b border-outline-variant px-4 py-2">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </div>
          <CopyButton getText={getCopyText} />
        </div>
      )}

      <div className="relative">
        <pre
          className={[
            'm-0 overflow-x-auto p-4',
            'font-mono text-sm leading-6',
            wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre',
          ].join(' ')}
        >
          <code className="font-mono">
            {tokens.map((t, i) => {
              const cls =
                t.cls === 'key'
                  ? 'text-syntax-key'
                  : t.cls === 'string'
                    ? 'text-syntax-string'
                    : t.cls === 'number'
                      ? 'text-syntax-number'
                      : t.cls === 'boolean'
                        ? 'text-syntax-boolean'
                        : t.cls === 'null'
                          ? 'text-syntax-null italic'
                          : t.cls === 'punct'
                            ? 'text-muted-foreground'
                            : t.cls === 'ws'
                              ? ''
                              : 'text-foreground';

              return (
                <span key={i} className={cls}>
                  {t.text}
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default JsonViewer;
