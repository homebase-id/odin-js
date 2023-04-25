import React, { useEffect } from 'react';

const listenerCallbacks = new WeakMap();
const cleanupSettings = new WeakMap();

let observer: IntersectionObserver;

const handleIntersections: IntersectionObserverCallback = (entries) => {
  entries.forEach((entry) => {
    if (listenerCallbacks.has(entry.target)) {
      const callback = listenerCallbacks.get(entry.target);
      const cleanup = cleanupSettings.get(entry.target);

      if (entry.isIntersecting || entry.intersectionRatio > 0) {
        if (cleanup) {
          observer.unobserve(entry.target);
          listenerCallbacks.delete(entry.target);
        }
        callback();
      }
    }
  });
};

const getIntersectionObserver = () => {
  if (observer === undefined) {
    observer = new IntersectionObserver(handleIntersections, {
      rootMargin: '100px',
      threshold: 0.15,
    });
  }
  return observer;
};

export const useIntersection = (
  elem: React.RefObject<HTMLElement> | undefined,
  callback: () => void,
  keepObserving = false
) => {
  useEffect(() => {
    const target = elem?.current;
    const observer = getIntersectionObserver();

    if (!target) {
      return;
    }

    listenerCallbacks.set(target, callback);
    cleanupSettings.set(target, !keepObserving);
    observer.observe(target);

    return () => {
      listenerCallbacks.delete(target);
      observer.unobserve(target);
    };
  }, [elem]);
};
