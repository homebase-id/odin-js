import { ReactNode } from 'react';
import { MediaOptions } from '../ImagePlugin';
import { MediaOptionsContext } from './useMediaOptionsContext';

export const MediaOptionsProvider = ({
  mediaOptions,
  children,
}: {
  mediaOptions?: MediaOptions | null;
  children: ReactNode;
}) => {
  return (
    <MediaOptionsContext.Provider value={mediaOptions}>{children}</MediaOptionsContext.Provider>
  );
};
