import { useCallback, useRef, useState } from 'react';

// Original Code from Stack Overflow: https://stackoverflow.com/questions/48048957/react-long-press-event#answer-48057286
// Updated with Types
export const useLongPress = (
  onLongPress: (e?: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => void,
  onClick: (e?: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => void,
  { shouldPreventDefault = true, delay = 300 } = {}
) => {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<NodeJS.Timeout>();
  const target = useRef<EventTarget>();

  const start = useCallback(
    (event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, {
          passive: false,
        });
        target.current = event.target;
      }
      timeout.current = setTimeout(() => {
        onLongPress(event);
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
      shouldTriggerClick && !longPressTriggered && onClick(event);
      setLongPressTriggered(false);
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault);
      }
    },
    [shouldPreventDefault, onClick, longPressTriggered]
  );

  return {
    onMouseDown: (e: React.MouseEvent<HTMLElement>) => start(e),
    onTouchStart: (e: React.TouchEvent<HTMLElement>) => start(e),
    onMouseUp: (e: React.MouseEvent<HTMLElement>) => clear(e),
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => clear(e, false),
    onTouchEnd: (e: React.TouchEvent<HTMLElement>) => clear(e),
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
