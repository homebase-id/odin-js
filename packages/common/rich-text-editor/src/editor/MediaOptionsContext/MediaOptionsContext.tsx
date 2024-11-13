import { createContext, ReactNode, useState } from 'react';
import { MediaOptions } from '../ImagePlugin/ImagePlugin';

export const MediaOptionsContext = createContext<{
  mediaOptions: MediaOptions | null;
  setMediaOptions: React.Dispatch<React.SetStateAction<MediaOptions | null>>;
} | null>(null);

export const MediaOptionsContextProvider = ({ children }: { children: ReactNode }) => {
  const [mediaOptions, setMediaOptions] = useState<MediaOptions | null>(null);

  return (
    <MediaOptionsContext.Provider value={{ mediaOptions, setMediaOptions }}>
      {children}
    </MediaOptionsContext.Provider>
  );
};
