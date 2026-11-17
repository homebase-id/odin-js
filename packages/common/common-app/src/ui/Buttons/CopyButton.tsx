import { useState, useCallback } from 'react';

type CopyButtonProps = {
  getText: () => string;
  className?: string;
  label?: string;
  copiedLabel?: string;
};

export const CopyButton: React.FC<CopyButtonProps> = ({
  getText,
  className,
  label = 'Copy',
  copiedLabel = 'Copied!',
}) => {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      // Reset after a short delay
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback for older browsers
      const text = getText();
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try {
        await navigator.clipboard.writeText(getText());
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } finally {
        document.body.removeChild(el);
      }
    }
  }, [getText]);

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label="Copy JSON to clipboard"
      className={
        className ??
        [
          'inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
          // Border
          'border-outline',
          // Background
          'bg-surface-container-lowest hover:bg-surface-container-high',
          // Text
          'text-foreground',
          // Focus ring
          'focus:outline-none focus:ring-2 focus:ring-primary',
        ].join(' ')
      }
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
      >
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
      </svg>
      {copied ? copiedLabel : label}
    </button>
  );
};
