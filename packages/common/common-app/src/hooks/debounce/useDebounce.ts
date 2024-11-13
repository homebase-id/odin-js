import { debounce } from 'lodash-es';
import { useEffect, useMemo, useRef } from 'react';

interface DebounceCallback {
  (): void;
}
type DebounceOptions = {
  timeoutMillis: number;
};

// Lifted from https://www.developerway.com/posts/debouncing-in-react
export const useDebounce = (
  callback: DebounceCallback,
  options?: DebounceOptions
) => {
  const { timeoutMillis = 1000 } = options || {};

  const ref = useRef<DebounceCallback>();

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  const debouncedCallback = useMemo(() => {
    const func = () => {
      ref.current?.();
    };

    return debounce(func, timeoutMillis);
  }, [timeoutMillis]);

  return debouncedCallback;
};
