import { useEffect } from 'react';

/**
 * Hook that alerts clicks outside of the passed ref
 */
export const useOutsideTrigger = (
  ref: React.RefObject<HTMLDivElement> | React.RefObject<HTMLDivElement>[] | undefined,
  onClick: () => void
) => {
  useEffect(() => {
    /**
     * Alert if clicked on outside of element
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleClickOutside(event: { target: any }) {
      if (ref instanceof Array) {
        ref.every((r) => r?.current && !(r.current as HTMLDivElement).contains(event.target)) &&
          onClick();
      } else {
        if (ref?.current && !ref.current.contains(event.target)) onClick();
      }
    }
    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [ref, onClick]);
};
