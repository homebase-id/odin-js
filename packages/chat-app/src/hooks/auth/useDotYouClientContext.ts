import { useContext } from 'react';
import { DotYouClientContext } from '../../components/Auth/DotYouClientProvider';

export const useDotYouClientContext = () => {
  const dotYouClient = useContext(DotYouClientContext);
  if (!dotYouClient) throw new Error('DotYouClientContext not found');

  return dotYouClient;
};
