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
        'border-zinc-300 bg-white',
        'dark:border-zinc-800 dark:bg-zinc-900',
        'prose prose-zinc dark:prose-invert',
        className ?? '',
      ].join(' ')}
      aria-label={ariaLabel}
      role="region"
    >
      {showHeader && (
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800/80">
          <div className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
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
                  ? 'text-blue-700 dark:text-blue-300'
                  : t.cls === 'string'
                    ? 'text-green-700 dark:text-green-300'
                    : t.cls === 'number'
                      ? 'text-orange-700 dark:text-orange-300'
                      : t.cls === 'boolean'
                        ? 'text-purple-700 dark:text-purple-300'
                        : t.cls === 'null'
                          ? 'text-rose-700 dark:text-rose-300 italic'
                          : t.cls === 'punct'
                            ? 'text-zinc-400 dark:text-zinc-400'
                            : t.cls === 'ws'
                              ? ''
                              : 'text-zinc-700 dark:text-zinc-200';

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
