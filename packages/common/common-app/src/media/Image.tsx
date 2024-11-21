import { OdinImageProps, OdinImage } from '@homebase-id/ui-lib';
import { useDotYouClientContext } from '../hooks';

export type ImageProps = Omit<OdinImageProps, 'dotYouClient'>;

export const Image = (props: ImageProps) => {
  const dotYouClient = useDotYouClientContext();

  return <OdinImage dotYouClient={dotYouClient} {...props} />;
};
