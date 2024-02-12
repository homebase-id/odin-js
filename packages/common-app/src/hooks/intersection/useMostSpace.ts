import { useState, useEffect } from 'react';

export const useMostSpace = (el: React.RefObject<HTMLElement> | undefined, forceRun?: unknown) => {
  const [space, setSpace] = useState<{
    verticalSpace: 'top' | 'bottom';
    horizontalSpace: 'left' | 'right';
  }>({ verticalSpace: 'top', horizontalSpace: 'left' });

  const doIt = () => {
    if (el?.current) setSpace(findSpaceDirection(el.current));
  };

  useEffect(() => {
    doIt();

    window.addEventListener('scroll', doIt);
    return () => window.removeEventListener('scroll', doIt);
  }, [el?.current, forceRun]);

  const findSpaceDirection = (el: HTMLElement) => {
    const { top, left, bottom, right } = el.getBoundingClientRect();
    const { innerHeight, innerWidth } = window;

    let verticalSpace: 'top' | 'bottom';
    if (top > innerHeight - bottom) {
      // More room at the top
      verticalSpace = 'top';
    } else {
      // More room at the bottom
      verticalSpace = 'bottom';
    }

    let horizontalSpace: 'left' | 'right';
    if (left > innerWidth - right) {
      // More room at the left
      horizontalSpace = 'left';
    } else {
      // More room at the right
      horizontalSpace = 'right';
    }

    return { verticalSpace, horizontalSpace };
  };

  return space;
};
