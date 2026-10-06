import { useEffect, useRef, useState } from 'react';

// Copy to clipboard with a short-lived "copied" flag for feedback
export const useCopy = () => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = (value: string) => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };
  return { copied, copy };
};
