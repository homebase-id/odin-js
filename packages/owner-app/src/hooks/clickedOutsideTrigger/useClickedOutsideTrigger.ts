import { useEffect } from 'react';

/**
 * Hook that alerts clicks outside of the passed ref
 */
function useOutsideTrigger(ref: React.RefObject<HTMLDivElement> | undefined, onClick: () => void) {
  useEffect(() => {
    /**
     * Alert if clicked on outside of element
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleClickOutside(event: { target: any }) {
      if (ref?.current && !ref.current.contains(event.target)) {
        onClick();
      }
    }
    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref]);
}

export default useOutsideTrigger;
