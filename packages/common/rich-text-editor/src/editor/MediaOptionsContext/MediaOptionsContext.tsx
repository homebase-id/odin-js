import { createContext } from 'react';
import { MediaOptions } from '../ImagePlugin/ImagePlugin';

export const MediaOptionsContext = createContext<{
  mediaOptions: MediaOptions | null;
  setMediaOptions: React.Dispatch<React.SetStateAction<MediaOptions | null>>;
} | null>(null);
