import { ReactNode, useState } from 'react';
import { MediaOptions } from '../ImagePlugin/ImagePlugin';
import { MediaOptionsContext } from './MediaOptionsContext';

export const MediaOptionsContextProvider = ({ children }: { children: ReactNode }) => {
  const [mediaOptions, setMediaOptions] = useState<MediaOptions | null>(null);

  return (
    <MediaOptionsContext.Provider value={{ mediaOptions, setMediaOptions }}>
      {children}
    </MediaOptionsContext.Provider>
  );
};
