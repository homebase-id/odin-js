import { MouseEvent, useCallback, useRef } from 'react';

type EmptyCallback = () => void;

export type CallbackFunction<Target = Element> = (
  e: MouseEvent<Target>,
  ...args: unknown[]
) => void | EmptyCallback;

export type DoubleTapCallback<Target = Element> = CallbackFunction<Target> | null;

export interface DoubleTapOptions<Target = Element> {
  onSingleTap?: CallbackFunction<Target>;
}

export type DoubleTapResult<Target, Callback> =
  Callback extends CallbackFunction<Target>
    ? {
        onClick: CallbackFunction<Target>;
      }
    : Callback extends null
      ? null
      : never;

export function useDoubleTap<
  Target = Element,
  Callback extends DoubleTapCallback<Target> = DoubleTapCallback<Target>,
>(
  callback: Callback,
  threshold = 200,
  options: DoubleTapOptions<Target> = {}
): DoubleTapResult<Target, Callback> {
  const timer = useRef<NodeJS.Timeout | null>(null);

  const handler = useCallback<CallbackFunction<Target>>(
    (event: MouseEvent<Target>, ...args) => {
      if (!timer.current) {
        timer.current = setTimeout(() => {
          if (options.onSingleTap) {
            options.onSingleTap(event, ...args);
          }
          timer.current = null;
        }, threshold);
      } else {
        clearTimeout(timer.current);
        timer.current = null;
        callback && callback(event);
      }
    },
    [callback, threshold, options.onSingleTap]
  );

  return (
    callback
      ? {
          onClick: handler,
        }
      : {}
  ) as DoubleTapResult<Target, Callback>;
}
