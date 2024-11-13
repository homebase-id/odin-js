import { useContext } from 'react';
import { MediaOptionsContext } from './MediaOptionsContext';

export const useMediaOptionsContext = () => {
  const mediaOptionsContext = useContext(MediaOptionsContext);
  if (!mediaOptionsContext) throw new Error('mediaOptionsContext not found');

  return mediaOptionsContext;
};
