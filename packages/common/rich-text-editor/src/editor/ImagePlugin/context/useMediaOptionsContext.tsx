import { createContext, useContext } from 'react';
import { MediaOptions } from '../ImagePlugin';

export const MediaOptionsContext = createContext<MediaOptions | null | undefined>(null);

export const useMediaOptionsContext = () => {
  const mediaOptionsContext = useContext(MediaOptionsContext);
  if (!mediaOptionsContext) {
    console.warn('MediaOptionsProvider not found');
  }

  return mediaOptionsContext;
};
