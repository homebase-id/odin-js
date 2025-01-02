import { useCallback, useRef, useState } from 'react';

// Original Code from Stack Overflow: https://stackoverflow.com/questions/48048957/react-long-press-event#answer-48057286
// Updated with Types
export const useLongPress = (
  onLongPress: (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => void,
  onClick?: (e?: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => void,
  options?: { shouldPreventDefault?: boolean; delay?: number },
  scrollableRef?: React.RefObject<HTMLElement>
) => {
  const { shouldPreventDefault = true, delay = 300 } = options || {};

  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<NodeJS.Timeout>();
  const target = useRef<EventTarget>();
  const beforeScrollY = useRef<number>();
  const getScrollY = () =>
    scrollableRef && scrollableRef.current ? scrollableRef.current.scrollTop : window.scrollY;

  const start = useCallback(
    (event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
      beforeScrollY.current = getScrollY();

      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, {
          passive: false,
        });
        target.current = event.target;
      }
      timeout.current = setTimeout(() => {
        if (!document.contains(event.target as Node)) return;
        const afterScrollY = getScrollY();

        if (Math.abs((beforeScrollY.current || 0) - afterScrollY) <= 20) {
          onLongPress(event);
        }
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (
      event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
      shouldTriggerClick = true
    ) => {
      timeout.current && clearTimeout(timeout.current);
      if (shouldTriggerClick && !longPressTriggered) {
        const afterScrollY = getScrollY();
        if (Math.abs((beforeScrollY.current || 0) - afterScrollY) <= 20) {
          onClick?.(event);
        }
      }
      setLongPressTriggered(false);
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault);
      }
    },
    [shouldPreventDefault, onClick, longPressTriggered]
  );

  // if (/iPad|iPhone|iPod/i.test(navigator.platform)) {
  return {
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => start(e),
    onTouchStart: (e: React.TouchEvent<HTMLElement>) => start(e),
    onMouseUp: (e: React.MouseEvent<HTMLElement>) => clear(e),
    onTouchEnd: (e: React.TouchEvent<HTMLElement>) => clear(e),
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => clear(e, false),
  };
  // }

  // Only for non-iOS devices we can use a normal onContextMenu
  return {
    onClick,
    onContextMenu: onLongPress,
  };
};

const isTouchEvent = (
  event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement> | Event
): event is React.TouchEvent<HTMLElement> => {
  return 'touches' in event;
};

const preventDefault = (event: Event | React.TouchEvent<HTMLElement>) => {
  if (!isTouchEvent(event)) return;

  if (event.touches.length < 2 && event.preventDefault) {
    event.preventDefault();
  }
};
